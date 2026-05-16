// @ts-check
// scripts/patch-papyrus-text.js
//
// Replaces papyrus.text in each verse JSON with the actual manuscript word
// from the CNTR transcription, positionally aligned with the TAGNT spine.
//
// Only touches rows whose papyrus.type === 'extant' and where the primary
// covering papyrus has a real CNTR transcription (not a stub).
// Stub-only verses are left unchanged (papyrus.text stays as TAGNT fallback).
//
// Usage:
//   node scripts/patch-papyrus-text.js            # all four Gospels
//   node scripts/patch-papyrus-text.js john       # one Gospel
//   node scripts/patch-papyrus-text.js john 3     # one chapter
//   node scripts/patch-papyrus-text.js john 3 16  # one verse

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'data', 'sources', 'earliest-papyrus');

const BOOK_CODE = { '40': 'matthew', '41': 'mark', '42': 'luke', '43': 'john' };

// ---------------------------------------------------------------------------
// CNTR markup stripper
// ---------------------------------------------------------------------------

/**
 * Strip all CNTR editorial markup from a raw verse line and return an array
 * of bare Greek tokens.
 *
 * Markup handled:
 *   x{wrong}{right}  → take RIGHT (scribal correction)
 *   a{...} b{...}    → include content (second/third-hand additions)
 *   {text}           → include content (other inline markup)
 *   ~ = +            → strip leading nomen-sacrum / addition prefixes from token
 *   ^ % ¯            → strip per-letter uncertainty/supralinear markers
 *   \ / | & * 0      → structural breaks → space
 *   $word            → numeral abbreviations → remove
 *   ϗ                → kai symbol → remove (rare)
 *
 * @param {string} raw
 * @returns {string[]}
 */
function extractWords(raw) {
  let s = raw;
  s = s.replace(/x\{[^}]*\}\s*\{([^}]*)\}/g, ' $1 ');  // x{wrong} {right} → right
  s = s.replace(/[ab]\{([^}]*)\}/g, ' $1 ');          // a{} b{} additions
  s = s.replace(/\{([^}]*)\}/g, ' $1 ');              // bare {text}
  s = s.replace(/\$\S*/g, '');                         // $ιδ numerals
  s = s.replace(/[\\/]/g, '');                         // line-break marks (may be mid-word — join, don't split)
  s = s.replace(/[|&*0ϗ]/g, ' ');                     // other structural chars → space
  s = s.replace(/\d+/g, '');                           // stray digits

  return s
    .split(/\s+/)
    .map(t => t.replace(/^[~=+]+/, '').replace(/[^%]/g, c => c).replace(/[\^%¯]/g, ''))
    .map(t => t.replace(/[^α-ωΑ-Ωά-ώϊϋΐΰ]/g, ''))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Load all non-stub CNTR files into a text map
// ---------------------------------------------------------------------------

/**
 * Returns Map<siglum, Map<"gospel:ch:v", string[]>>
 * Only real transcriptions are included; stub files are skipped.
 */
function buildTextMap() {
  /** @type {Map<string, Map<string, string[]>>} */
  const byPapyrus = new Map();

  const files = fs.readdirSync(SRC).filter(f => /^P\d+\.txt$/.test(f)).sort();

  for (const file of files) {
    const siglum = file.replace('.txt', '');
    const content = fs.readFileSync(path.join(SRC, file), 'utf8');

    // Skip stubs (every data line contains "[stub")
    const dataLines = content.split('\n').filter(l => /^\d{8}\s/.test(l));
    if (dataLines.length === 0 || dataLines.every(l => l.includes('[stub'))) continue;

    /** @type {Map<string, string[]>} */
    const verseMap = new Map();

    for (const line of dataLines) {
      if (line.includes('[stub')) continue;

      const ref = line.slice(0, 8);
      const raw = line.slice(9);

      const bb  = ref.slice(0, 2);
      const gospel = BOOK_CODE[bb];
      if (!gospel) continue;

      const chapter = parseInt(ref.slice(2, 5), 10);
      const verse   = parseInt(ref.slice(5, 8), 10);
      const key     = `${gospel}:${chapter}:${verse}`;

      const words = extractWords(raw);
      if (words.length > 0) verseMap.set(key, words);
    }

    // P64.txt carries siglum "P64+P67" in PAPYRUS_META; map both
    if (siglum === 'P64') {
      byPapyrus.set('P64+P67', verseMap);
    }
    byPapyrus.set(siglum, verseMap);
  }

  return byPapyrus;
}

// ---------------------------------------------------------------------------
// Patch one verse JSON file
// ---------------------------------------------------------------------------

/**
 * @param {string} filepath
 * @param {Map<string, Map<string, string[]>>} textMap
 * @returns {{ patched: boolean, reason: string }}
 */
function patchVerse(filepath, textMap) {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const { gospel, chapter, verse, rows } = data;
  const verseKey = `${gospel}:${chapter}:${verse}`;

  // Check whether any rows have extant papyrus coverage
  const extantRows = rows.filter(r => r.papyrus?.type === 'extant');
  if (extantRows.length === 0) return { patched: false, reason: 'no extant papyrus rows' };

  // Find the primary covering papyrus — first fragment that has CNTR text
  const fragments = extantRows[0].papyrus.fragments ?? [];
  let primaryWords = null;
  let primarySiglum = null;

  for (const { id } of fragments) {
    const pMap = textMap.get(id);
    if (!pMap) continue;
    const words = pMap.get(verseKey);
    if (words && words.length > 0) {
      primaryWords = words;
      primarySiglum = id;
      break;
    }
  }

  if (!primaryWords) return { patched: false, reason: 'no CNTR text for any covering papyrus' };

  // Patch each extant row positionally, counting only extant rows
  // (skips spacer/lost rows so alignment isn't thrown off by them)
  let changed = false;
  let wordIdx = 0;
  for (const row of rows) {
    if (row.papyrus?.type !== 'extant') continue;

    const papyrusWord = primaryWords[wordIdx] ?? null;
    wordIdx++;
    if (!papyrusWord) continue; // papyrus shorter than TAGNT — leave TAGNT word

    if (row.papyrus.text !== papyrusWord) {
      row.papyrus.text = papyrusWord;
      changed = true;
    }
  }

  if (!changed) return { patched: false, reason: 'already up to date' };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return { patched: true, reason: primarySiglum };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  process.stdout.write('Building CNTR text map... ');
  const textMap = buildTextMap();
  console.log(`${textMap.size} papyri with real transcriptions`);

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let patched = 0, skipped = 0, unchanged = 0;

  for (const gospel of gospels) {
    if (targetGospel && gospel !== targetGospel) continue;

    const gospelDir = path.join(ROOT, 'data', gospel);
    if (!fs.existsSync(gospelDir)) continue;

    const chapters = fs.readdirSync(gospelDir)
      .map(Number)
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    for (const chapter of chapters) {
      if (targetChapter !== null && chapter !== targetChapter) continue;

      const chapterDir = path.join(gospelDir, String(chapter));
      const verseFiles = fs.readdirSync(chapterDir)
        .filter(f => /^\d+\.json$/.test(f))
        .map(f => ({ n: parseInt(f, 10), f }))
        .sort((a, b) => a.n - b.n);

      for (const { n, f } of verseFiles) {
        if (targetVerse !== null && n !== targetVerse) continue;

        const filepath = path.join(chapterDir, f);
        const result = patchVerse(filepath, textMap);

        if (result.patched) patched++;
        else if (result.reason === 'already up to date') unchanged++;
        else skipped++;
      }
    }

    if (!targetGospel || targetGospel === gospel) console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Patched   : ${patched}`);
  console.log(`  Unchanged : ${unchanged}`);
  console.log(`  Skipped   : ${skipped}  (no real CNTR text)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
