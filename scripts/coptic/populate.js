'use strict';
/**
 * populate.js — Coptic column ingestion pipeline
 *
 * Usage:
 *   node scripts/coptic/populate.js <gospel> [--chapter=N] [--verse=N] [--dry-run]
 *
 * Examples:
 *   node scripts/coptic/populate.js matthew
 *   node scripts/coptic/populate.js matthew --chapter=1
 *   node scripts/coptic/populate.js matthew --chapter=1 --verse=18
 *   node scripts/coptic/populate.js matthew --dry-run        (preview, no writes)
 *
 * What it does:
 *   1. Reads Sahidica NT .tt files from data/sources/coptic-tt/
 *   2. Parses each verse into Coptic word groups with POS/lemma/lang metadata
 *   3. Aligns each Coptic word to an existing alignment row using:
 *        – Greek loanword transliteration matching (high confidence)
 *        – Proper name fuzzy matching (high confidence)
 *        – Positional fallback (low confidence, flagged _copticDraft: true)
 *   4. For high-confidence matches, derives the English gloss from the aligned
 *      Greek row's Vaticanus gloss (source: 'Horner')
 *   5. Writes updated verse JSON files
 *
 * After running, search for "_copticDraft": true in data/ to find rows
 * needing manual alignment review.
 *
 * Source: Sahidica NT, Coptic SCRIPTORIUM (text from Horner's Sahidic NT, public domain)
 * License note: The Coptic text is from Horner (1911-1924, public domain).
 *               Annotations are from Coptic SCRIPTORIUM (academic use).
 *               Only the public-domain text is stored in output files.
 */

const fs   = require('fs');
const path = require('path');

const { parseTTChapter } = require('./parse-tt');
const { alignWords, GREEK_ARTICLES } = require('./align');

// Normalize Greek text for filler detection (strip diacritics, lowercase, keep α-ω only)
function normGreekForFiller(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^α-ως]/g, '');
}

// Crum/KELLIA lemma → English gloss lookup (CC BY-SA 4.0)
const CRUM_PATH = path.join(__dirname, 'crum-lookup.json');
const CRUM = fs.existsSync(CRUM_PATH) ? JSON.parse(fs.readFileSync(CRUM_PATH, 'utf8')) : {};

const GOSPEL_META = {
  matthew: { prefix: '40_Matthew', chapters: 28 },
  mark:    { prefix: '41_Mark',    chapters: 16 },
  luke:    { prefix: '42_Luke',    chapters: 24 },
  john:    { prefix: '43_John',    chapters: 21 },
};

const TT_DIR   = path.join(__dirname, '../../data/sources/coptic-tt');
const DATA_DIR = path.join(__dirname, '../../data');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const gospel = args[0];

if (!gospel || !GOSPEL_META[gospel]) {
  console.error('Usage: node scripts/coptic/populate.js <matthew|mark|luke|john> [--chapter=N] [--verse=N] [--dry-run]');
  process.exit(1);
}

const targetChapter = (() => { const a = args.find(x => x.startsWith('--chapter=')); return a ? parseInt(a.split('=')[1]) : null; })();
const targetVerse   = (() => { const a = args.find(x => x.startsWith('--verse='));   return a ? parseInt(a.split('=')[1]) : null; })();
const dryRun        = args.includes('--dry-run');

// ── Gloss derivation ─────────────────────────────────────────────────────────
// Two-tier strategy:
//   1. Greek loanwords + proper names (high-confidence only): TAGNT gloss from
//      the aligned Vaticanus row — the Coptic word IS the Greek word, so the
//      Greek source is correct.
//   2. Native Coptic vocabulary: Crum gloss via KELLIA lemma lookup (CC BY-SA 4.0).
//      This depends only on lemma identity, not alignment confidence, so it applies
//      to all rows including positional/draft.
function deriveGloss(word, row, confidence) {
  if ((word.lang === 'Greek' || word.pos === 'NPROP') && confidence === 'high') {
    const g = row.vaticanus?.type === 'text' ? row.vaticanus.gloss : null;
    if (g) return { gloss: g.gloss, source: 'TAGNT' };
  }
  // Crum lookup — applies to all confidence levels
  const crum = CRUM[word.lemma] ?? CRUM[word.text];
  if (crum) return { gloss: crum, source: 'Crum' };
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { prefix } = GOSPEL_META[gospel];

  // Find TT files for this gospel, sorted by chapter
  const ttFiles = fs.readdirSync(TT_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.tt'))
    .sort();

  if (ttFiles.length === 0) {
    console.error(`No TT files found for ${gospel} in ${TT_DIR}`);
    process.exit(1);
  }

  let totalVerses = 0, totalRows = 0, draftRows = 0, skippedVerses = 0;
  const draftLog = [];

  for (const ttFile of ttFiles) {
    const chapterMatch = ttFile.match(/_(\d+)\.tt$/);
    if (!chapterMatch) continue;
    const chapter = parseInt(chapterMatch[1]);
    if (targetChapter !== null && chapter !== targetChapter) continue;

    const ttContent = fs.readFileSync(path.join(TT_DIR, ttFile), 'utf8');
    const parsedVerses = parseTTChapter(ttContent);

    console.log(`\n── ${gospel} chapter ${chapter} (${parsedVerses.size} verses in TT) ──`);

    for (const [verseNum, copticVerse] of parsedVerses) {
      if (targetVerse !== null && verseNum !== targetVerse) continue;

      const versePath = path.join(DATA_DIR, gospel, String(chapter), `${verseNum}.json`);
      if (!fs.existsSync(versePath)) {
        skippedVerses++;
        continue;
      }

      const verseData = JSON.parse(fs.readFileSync(versePath, 'utf8'));
      const rows = verseData.rows;

      // Align
      const alignments = alignWords(copticVerse.words, rows);

      let verseDraft = 0;
      let verseAssigned = 0;

      rows.forEach(row => {
        const assignment = alignments.get(row.id);

        if (assignment) {
          const { word, confidence } = assignment;
          const gloss = deriveGloss(word, row, confidence);

          row.coptic = {
            type: 'text',
            text: word.text,
            ...(gloss ? { gloss } : {}),
          };

          if (confidence === 'low') {
            row._copticDraft = true;
            verseDraft++;
            draftLog.push(`${gospel} ${chapter}:${verseNum} row ${row.id} — "${word.text}" (positional)`);
          } else {
            delete row._copticDraft;
          }

          verseAssigned++;
        } else {
          // Row has no Coptic word — determine whether empty or genuinely absent
          const vatRaw = row.vaticanus?.type === 'text' ? row.vaticanus.text.replace(/[.,;·]/g, '') : '';
          if (GREEK_ARTICLES.has(normGreekForFiller(vatRaw)) || row.vaticanus?.type === 'empty') {
            row.coptic = { type: 'empty' };
          }
          // Clear any stale draft flag — this row has no Coptic word this run
          delete row._copticDraft;
          // Otherwise leave coptic undefined (blank cell)
        }
      });

      totalVerses++;
      totalRows += verseAssigned;
      draftRows += verseDraft;

      const confident = verseAssigned - verseDraft;
      const pct = verseAssigned > 0 ? Math.round((confident / verseAssigned) * 100) : 0;
      console.log(
        `  ${gospel} ${chapter}:${verseNum.toString().padStart(2)} ` +
        `${String(verseAssigned).padStart(2)} words aligned ` +
        `(${confident} confident, ${verseDraft} draft)` +
        (dryRun ? '  [DRY RUN]' : '')
      );

      if (!dryRun) {
        fs.writeFileSync(versePath, JSON.stringify(verseData, null, 2), 'utf8');
      }
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`Gospel:        ${gospel}`);
  console.log(`Verses updated:${String(totalVerses).padStart(5)}`);
  console.log(`Verses skipped:${String(skippedVerses).padStart(5)}  (no verse JSON yet)`);
  console.log(`Rows assigned: ${String(totalRows).padStart(5)}`);
  console.log(`Draft rows:    ${String(draftRows).padStart(5)}  (need review)`);
  if (dryRun) console.log('\n[DRY RUN — no files written]');

  if (draftLog.length > 0) {
    const logPath = path.join(__dirname, `draft-${gospel}${targetChapter ? `-ch${targetChapter}` : ''}.log`);
    if (!dryRun) {
      fs.writeFileSync(logPath, draftLog.join('\n') + '\n', 'utf8');
      console.log(`\nDraft alignment log: ${logPath}`);
    }
    console.log('\nSearch for \\"_copticDraft\\": true in data/ to find rows needing review.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
