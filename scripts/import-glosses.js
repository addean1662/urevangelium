// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
// Phase 3: Gloss import pipeline.
// Usage: node scripts/import-glosses.js <gospel> <chapter> <verse>
// Attempts to populate gloss fields in-place in data/<gospel>/<ch>/<vs>.json.
// Reports cells it could not match — fix those manually (Phase 5).
//
// Sources:
//   Greek (papyrus/vaticanus/sinaiticus/byzantine): TAGNT (word→Strong) + TBESG (Strong→gloss)
//   Latin (vulgate): DICTLINE.GEN — lemma lookup only (inflected forms need manual fix)
//   Syriac (peshitta): payne-smith-proof-verses.tsv
//
// TAGNT word order drives Greek alignment. The script advances a word-index
// counter only when vaticanus has a text cell, skipping alignment-gap rows.
// This maps TAGNT word positions to our row indices correctly.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const GOSPEL_TO_TAGNT = {
  matthew: 'Mat',
  mark: 'Mrk',
  luke: 'Luk',
  john: 'Jhn',
};

// ── TBESG ────────────────────────────────────────────────────────────────────
// Tab-separated. Data rows start with G####.
// Cols: eStrong | desc | uStrong | Greek | translit | grammar | brief-gloss | full-def
// We want col[0] (strong) and col[6] (gloss).

function loadTBESG() {
  console.log('  Loading TBESG...');
  const content = fs.readFileSync(
    path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt'),
    'utf-8'
  );
  /** @type {Map<string, {lemma: string, gloss: string}>} */
  const map = new Map();
  for (const line of content.split('\n')) {
    if (!/^G\d{4}/.test(line)) continue;
    const cols = line.split('\t');
    if (cols.length < 7) continue;
    const strong = cols[0].trim();
    const lemma = cols[3]?.trim() ?? '';
    const gloss = cols[6]?.trim() ?? '';
    if (strong && lemma && gloss && !map.has(strong)) {
      map.set(strong, { lemma, gloss });
    }
  }
  return map;
}

// ── TAGNT ────────────────────────────────────────────────────────────────────
// Tab-separated. Data rows match: Book.Ch.Vs#WordNum=Type <tab> ...
// Cols: ref | Greek (translit) | BSB-English | dStrong=Grammar | DictForm=Gloss | editions | ...
// We extract: strong number (from col[3]) and dict gloss (from col[4]).

function loadTAGNT() {
  console.log('  Loading TAGNT Mat-Jhn...');
  const content = fs.readFileSync(
    path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt'),
    'utf-8'
  );
  /** @type {Map<string, Array<{greek: string, strong: string, gloss: string}>>} */
  const verses = new Map();
  for (const line of content.split('\n')) {
    // Reference format: Mat.1.1#01=NKO
    const refMatch = line.match(/^([A-Z][a-z]+\.\d+\.\d+)#\d+=/);
    if (!refMatch) continue;
    const verseRef = refMatch[1];
    const cols = line.split('\t');
    if (cols.length < 5) continue;

    // Greek: "Βίβλος (Biblos)" → strip parenthesized transliteration and trailing punct
    const greek = (cols[1] ?? '').split(' ')[0].replace(/[.,;·!?]+$/, '');

    // dStrong field: may be "H0085|G0011«G0011" or "G2424G" or "G0976"
    // Extract all G#### matches, take the last one as the base Strong number.
    const dstrongField = (cols[3] ?? '').split('=')[0];
    const gMatches = dstrongField.match(/G\d{4}/g) ?? [];
    const strong = gMatches[gMatches.length - 1] ?? '';

    // Dict gloss from col[4]: "βίβλος=book" → "book"
    const dictField = cols[4] ?? '';
    const gloss = dictField.includes('=')
      ? dictField.split('=').slice(1).join('=').trim()
      : (cols[2] ?? '').trim();

    if (!verses.has(verseRef)) verses.set(verseRef, []);
    verses.get(verseRef)?.push({ greek, strong, gloss });
  }
  return verses;
}

// ── Payne Smith TSV ───────────────────────────────────────────────────────────
// Columns: word <TAB> lemma <TAB> gloss <TAB> source <TAB> notes

function loadPayneSmithTSV() {
  console.log('  Loading Payne Smith TSV...');
  const content = fs.readFileSync(
    path.join(ROOT, 'data/sources/peshitta/payne-smith-proof-verses.tsv'),
    'utf-8'
  );
  /** @type {Map<string, {lemma: string, gloss: string, source: string}>} */
  const map = new Map();
  for (const line of content.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 4) continue;
    const word = cols[0].trim();
    const lemma = cols[1].trim();
    const gloss = cols[2].trim();
    const source = cols[3].trim();
    if (word && gloss) map.set(word, { lemma, gloss, source });
  }
  return map;
}

// ── DICTLINE (stem lookup) ────────────────────────────────────────────────────
// DICTLINE.GEN (mk270/whitakers-words) is whitespace-delimited, not fixed-width.
// Fields per entry: up to 4 stems, POS, grammar codes, then 5 single-uppercase
// classification+freq+source codes, then the gloss (rest of line).
// Strategy: find the rightmost run of 5 consecutive single-uppercase-letter tokens;
//           everything after is the gloss. stem1 (first token) is the lookup key.
// Limitation: inflected forms and proper nouns rarely match. Warn and skip those.

function loadDICTLINE() {
  console.log('  Loading DICTLINE.GEN...');
  const content = fs.readFileSync(
    path.join(ROOT, 'data/sources/vulgate/DICTLINE.GEN'),
    'utf-8'
  );
  /** @type {Map<string, {gloss: string, pos: string}>} */
  const map = new Map();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 7) continue;
    // Find rightmost run of 5 consecutive single-uppercase-letter tokens
    let codeEnd = -1;
    outer: for (let i = tokens.length - 1; i >= 4; i--) {
      for (let j = i - 4; j <= i; j++) {
        if (!/^[A-Z]$/.test(tokens[j] ?? '')) continue outer;
      }
      codeEnd = i;
      break;
    }
    if (codeEnd < 0) continue;
    const glossTokens = tokens.slice(codeEnd + 1);
    if (glossTokens.length === 0) continue;
    const gloss = glossTokens.join(' ').split(';')[0].trim();
    if (!gloss) continue;
    const lemma = (tokens[0] ?? '').toLowerCase();
    if (!lemma) continue;
    const pos = tokens.find((t) => /^[A-Z]{2,8}$/.test(t)) ?? '';
    if (!map.has(lemma)) {
      map.set(lemma, { gloss, pos });
    }
  }
  return map;
}

// ── Greek gloss lookup ────────────────────────────────────────────────────────
// Uses TBESG brief gloss (preferred) falling back to TAGNT dict gloss.

function lookupGreekGloss(tagntWords, idx, tbesg) {
  const entry = tagntWords[idx];
  if (!entry) return null;
  const tbesgEntry = entry.strong ? tbesg.get(entry.strong) : null;
  const gloss = tbesgEntry?.gloss || entry.gloss || null;
  if (!gloss) return null;
  return { gloss, source: /** @type {'TAGNT'} */ ('TAGNT') };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const [gospel, chapterStr, verseStr] = process.argv.slice(2);
  if (!gospel || !chapterStr || !verseStr) {
    console.error('Usage: node scripts/import-glosses.js <gospel> <chapter> <verse>');
    process.exit(1);
  }

  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  const tagntBook = GOSPEL_TO_TAGNT[gospel.toLowerCase()];
  if (!tagntBook) {
    console.error(`Unknown gospel: ${gospel}. Must be matthew|mark|luke|john.`);
    process.exit(1);
  }

  const verseJsonPath = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
  if (!fs.existsSync(verseJsonPath)) {
    console.error(`Verse file not found: ${verseJsonPath}`);
    process.exit(1);
  }

  console.log(`\nImporting glosses for ${gospel} ${chapter}:${verse}`);
  console.log('Loading sources...');
  const tbesg = loadTBESG();
  const tagntVerses = loadTAGNT();
  const psTSV = loadPayneSmithTSV();
  const dictline = loadDICTLINE();
  console.log(
    `  TBESG: ${tbesg.size} entries | TAGNT: ${tagntVerses.size} verses | ` +
    `PaS TSV: ${psTSV.size} entries | DICTLINE: ${dictline.size} lemmas`
  );

  const verseRef = `${tagntBook}.${chapter}.${verse}`;
  const tagntWords = tagntVerses.get(verseRef) ?? [];
  console.log(`  TAGNT words for ${verseRef}: ${tagntWords.length}`);
  if (tagntWords.length === 0) {
    console.warn(`  Warning: no TAGNT data for ${verseRef}. Greek glosses will be empty.`);
  }

  const data = JSON.parse(fs.readFileSync(verseJsonPath, 'utf-8'));
  let tagntIdx = 0; // advances only on Greek text rows
  let updated = 0;
  let skipped = 0;

  for (const row of data.rows) {
    const rowId = row.id;

    // ── Papyrus (extant only; uses same tagntIdx as vaticanus, looked up before increment) ──
    if (row.papyrus?.type === 'extant' && !row.papyrus.gloss) {
      const g = lookupGreekGloss(tagntWords, tagntIdx, tbesg);
      if (g) { row.papyrus.gloss = g; updated++; }
      else { console.warn(`  [${rowId}] papyrus: no TAGNT gloss at idx ${tagntIdx}`); skipped++; }
    }

    // ── Vaticanus (primary Greek — drives tagntIdx) ──
    if (row.vaticanus?.type === 'text' && !row.vaticanus.gloss) {
      const g = lookupGreekGloss(tagntWords, tagntIdx, tbesg);
      if (g) { row.vaticanus.gloss = g; updated++; }
      else { console.warn(`  [${rowId}] vaticanus: no TAGNT gloss at idx ${tagntIdx}`); skipped++; }
      tagntIdx++; // advance after processing this Greek word
    }
    // (empty/lost vaticanus: do not advance tagntIdx)

    // ── Sinaiticus (same TAGNT position as vaticanus — use tagntIdx-1 post-increment) ──
    if (row.sinaiticus?.type === 'text' && !row.sinaiticus.gloss) {
      const g = lookupGreekGloss(tagntWords, tagntIdx - 1, tbesg);
      if (g) { row.sinaiticus.gloss = g; updated++; }
    }

    // ── Byzantine (same TAGNT position as vaticanus) ──
    if (row.byzantine?.type === 'text' && !row.byzantine.gloss) {
      const g = lookupGreekGloss(tagntWords, tagntIdx - 1, tbesg);
      if (g) { row.byzantine.gloss = g; updated++; }
    }

    // ── Vulgate (lemma lookup only — inflected forms will miss) ──
    if (row.vulgate?.type === 'text' && !row.vulgate.gloss) {
      const latinWord = row.vulgate.text.toLowerCase().replace(/[.,;!?]+$/, '');
      const entry = dictline.get(latinWord);
      if (entry) {
        row.vulgate.gloss = { gloss: entry.gloss, source: 'Whitaker' };
        updated++;
      } else {
        console.warn(`  [${rowId}] vulgate "${row.vulgate.text}": not in DICTLINE (inflected or proper noun — fix manually)`);
        skipped++;
      }
    }

    // ── Peshitta ──
    if (row.peshitta?.type === 'text' && !row.peshitta.gloss) {
      const entry = psTSV.get(row.peshitta.text);
      if (entry) {
        row.peshitta.gloss = { gloss: entry.gloss, source: entry.source };
        updated++;
      } else {
        console.warn(`  [${rowId}] peshitta "${row.peshitta.text}": not in Payne Smith TSV — fix manually`);
        skipped++;
      }
    }
  }

  fs.writeFileSync(verseJsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\nWrote ${verseJsonPath}`);
  console.log(`Updated: ${updated} cells  |  Could not match: ${skipped} cells`);
  if (skipped > 0) {
    console.log('Manually fix skipped cells and run: npx tsc --noEmit && npx vitest run');
  }
}

main();
