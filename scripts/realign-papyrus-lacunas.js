// @ts-check
// scripts/realign-papyrus-lacunas.js
//
// Fixes papyrus alignment in verses where the CNTR source has a leading lacuna.
// When a verse line starts with /N&* or \/N&* (N > 0) the first N characters
// of the manuscript are physically missing (damaged); patch-papyrus-text.js
// placed the surviving words at row 0 (wrong).
//
// Strategy:
//   - Scan all papyrus source files for leading-lacuna verse lines.
//   - For each affected verse, use text-matching against the vaticanus Greek
//     spine to find where the surviving words correctly begin.
//   - Mark preceding rows as type:"lost" and shift surviving words to the
//     correct row indices.
//   - Ambiguous matches (same score at multiple offsets) are skipped with a
//     warning rather than guessing wrong.
//   - Verses already fixed (first extant row already at correct offset) are
//     detected and skipped.
//
// Usage:
//   node scripts/realign-papyrus-lacunas.js            # all four Gospels
//   node scripts/realign-papyrus-lacunas.js john       # one Gospel
//   node scripts/realign-papyrus-lacunas.js john 18    # one chapter
//   node scripts/realign-papyrus-lacunas.js john 18 1  # one verse

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'data', 'sources', 'earliest-papyrus');
const BOOK_CODE = { '40': 'matthew', '41': 'mark', '42': 'luke', '43': 'john' };

// ---------------------------------------------------------------------------
// Greek normalization: strip accents/breathings, lowercase, unify sigmas
// ---------------------------------------------------------------------------

function normalizeGreek(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // remove combining diacritics
    .toLowerCase()
    .replace(/ς/g, 'σ')              // final sigma → medial sigma
    .replace(/[^α-ω]/g, '');         // keep Greek letters only
}

// ---------------------------------------------------------------------------
// CNTR markup stripper (same as patch-papyrus-text.js)
// ---------------------------------------------------------------------------

function extractWords(raw) {
  let s = raw;
  s = s.replace(/x\{[^}]*\}\s*\{([^}]*)\}/g, ' $1 ');
  s = s.replace(/[ab]\{([^}]*)\}/g, ' $1 ');
  s = s.replace(/\{([^}]*)\}/g, ' $1 ');
  s = s.replace(/\$\S*/g, '');
  s = s.replace(/[\\/]/g, '');
  s = s.replace(/[|&*0ϗ]/g, ' ');
  s = s.replace(/\d+/g, '');
  return s
    .split(/\s+/)
    .map(t => t.replace(/^[~=+]+/, '').replace(/[\^%¯]/g, ''))
    .map(t => t.replace(/[^α-ωΑ-Ωά-ώϊϋΐΰ]/g, ''))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Detect leading lacuna (N > 0)
// ---------------------------------------------------------------------------

function leadingLacunaSize(raw) {
  const m = raw.trim().match(/^\\?\/([1-9]\d*)&\*/);
  return m ? parseInt(m[1], 10) : 0;
}

// ---------------------------------------------------------------------------
// Find best row offset for papyrusWords within verse rows.
// Uses vaticanus text (normalized) as the reference spine.
// Returns { offset, score, ambiguous }.
// ---------------------------------------------------------------------------

function findBestOffset(papyrusWords, rows) {
  const vatNorm = rows.map(r => normalizeGreek(r.vaticanus?.text ?? ''));
  const papNorm = papyrusWords.map(normalizeGreek).filter(w => w.length > 0);

  if (papNorm.length === 0) return { offset: 0, score: 0, ambiguous: false };

  let bestOffset = 0;
  let bestScore  = -1;
  let tieCount   = 0;

  const maxStart = rows.length - papNorm.length;
  for (let start = 0; start <= maxStart; start++) {
    let score = 0;
    for (let i = 0; i < papNorm.length; i++) {
      if (papNorm[i] && vatNorm[start + i] && papNorm[i] === vatNorm[start + i]) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore  = score;
      bestOffset = start;
      tieCount   = 1;
    } else if (score === bestScore && score > 0) {
      tieCount++;
    }
  }

  return { offset: bestOffset, score: bestScore, ambiguous: tieCount > 1 };
}

// ---------------------------------------------------------------------------
// Build lacuna index from all papyrus source files
// Returns Map<verseKey, Map<siglum, words[]>>
// ---------------------------------------------------------------------------

function buildLacunaIndex() {
  /** @type {Map<string, Map<string, string[]>>} */
  const index = new Map();

  const files = fs.readdirSync(SRC).filter(f => /^P\d+\.txt$/.test(f)).sort();

  for (const file of files) {
    const siglum = file.replace('.txt', '');
    const content = fs.readFileSync(path.join(SRC, file), 'utf8');
    const dataLines = content.split('\n').filter(l => /^\d{8}\s/.test(l));
    if (dataLines.length === 0 || dataLines.every(l => l.includes('[stub'))) continue;

    for (const line of dataLines) {
      if (line.includes('[stub')) continue;

      const ref = line.slice(0, 8);
      const raw = line.slice(9);

      if (leadingLacunaSize(raw) === 0) continue;

      const bb = ref.slice(0, 2);
      const gospel = BOOK_CODE[bb];
      if (!gospel) continue;

      const chapter = parseInt(ref.slice(2, 5), 10);
      const verse   = parseInt(ref.slice(5, 8), 10);
      const words   = extractWords(raw);
      if (words.length === 0) continue;

      const key = `${gospel}:${chapter}:${verse}`;
      if (!index.has(key)) index.set(key, new Map());

      // P64.txt is filed as both P64 and P64+P67
      const siglumKeys = siglum === 'P64' ? ['P64', 'P64+P67'] : [siglum];
      for (const sk of siglumKeys) {
        index.get(key).set(sk, words);
      }
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Fix one verse file. Returns { changed, reports }.
// ---------------------------------------------------------------------------

function fixVerse(filepath, siglumWords) {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const { rows } = data;
  let changed = false;
  const reports = [];

  for (const [siglum, cntrWords] of siglumWords) {
    // Find extant rows covered by this siglum
    const coveredIdxs = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        r.papyrus?.type === 'extant' &&
        r.papyrus?.fragments?.some(f => f.id === siglum)
      )
      .map(({ i }) => i);

    if (coveredIdxs.length === 0) {
      reports.push(`  [${siglum}] no extant rows found, skip`);
      continue;
    }

    const firstExtantIdx = coveredIdxs[0];
    const fragments = rows[firstExtantIdx].papyrus.fragments;

    // Find the correct starting offset via text matching
    const { offset, score, ambiguous } = findBestOffset(cntrWords, rows);

    if (score === 0) {
      reports.push(`  [${siglum}] no vaticanus match found, skip`);
      continue;
    }
    if (ambiguous) {
      reports.push(`  [${siglum}] ambiguous match (score=${score}), skip`);
      continue;
    }
    if (offset === 0) {
      reports.push(`  [${siglum}] offset=0, no shift needed`);
      continue;
    }
    if (firstExtantIdx >= offset) {
      reports.push(`  [${siglum}] already at offset ${offset} (firstExtant=${firstExtantIdx}), skip`);
      continue;
    }

    // Mark rows 0..offset-1 as lost (only rows covered by this siglum)
    for (let i = 0; i < offset; i++) {
      if (rows[i].papyrus?.fragments?.some(f => f.id === siglum)) {
        rows[i].papyrus = { type: 'lost', fragments };
      }
    }

    // Place surviving words at rows offset..offset+W-1
    const W = cntrWords.length;
    for (let i = 0; i < W && offset + i < rows.length; i++) {
      const ri = offset + i;
      const existingGloss =
        rows[ri].papyrus?.gloss ?? rows[ri].vaticanus?.gloss ?? { gloss: '', source: 'TAGNT' };
      rows[ri].papyrus = {
        type:      'extant',
        fragments,
        text:      cntrWords[i],
        gloss:     existingGloss,
      };
    }

    reports.push(`  [${siglum}] shifted ${W} word(s) to offset ${offset} (score=${score}/${cntrWords.length})`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  return { changed, reports };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  process.stdout.write('Scanning papyrus sources for leading lacunas... ');
  const lacunaIndex = buildLacunaIndex();
  console.log(`${lacunaIndex.size} verse(s) with non-zero leading lacunas`);

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let fixed = 0, skipped = 0;

  for (const gospel of gospels) {
    if (targetGospel && gospel !== targetGospel) continue;
    const gospelDir = path.join(ROOT, 'data', gospel);
    if (!fs.existsSync(gospelDir)) continue;

    const chapters = fs.readdirSync(gospelDir)
      .map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

    for (const chapter of chapters) {
      if (targetChapter !== null && chapter !== targetChapter) continue;
      const chDir = path.join(gospelDir, String(chapter));
      const verseFiles = fs.readdirSync(chDir)
        .filter(f => /^\d+\.json$/.test(f))
        .map(f => ({ n: parseInt(f, 10), f }))
        .sort((a, b) => a.n - b.n);

      for (const { n, f } of verseFiles) {
        if (targetVerse !== null && n !== targetVerse) continue;
        const key = `${gospel}:${chapter}:${n}`;
        const siglumWords = lacunaIndex.get(key);
        if (!siglumWords) continue;

        const filepath = path.join(chDir, f);
        const { changed, reports } = fixVerse(filepath, siglumWords);

        if (reports.length > 0) {
          console.log(`${key}:`);
          for (const r of reports) console.log(r);
        }

        if (changed) fixed++;
        else skipped++;
      }
    }

    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Fixed   : ${fixed}`);
  console.log(`  Skipped : ${skipped}  (ambiguous, already correct, or no match)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
