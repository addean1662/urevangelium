// @ts-check
// scripts/patch-vulgate-peshitta.js
//
// Fills in vulgate and peshitta cells in verse JSON files using the
// Clementine Vulgate and Peshitta NT source texts.
//
// Strategy (same as patch-papyrus-text.js):
//   - Words from the source text are assigned positionally to rows.
//   - If the source verse has fewer words than TAGNT rows, trailing rows
//     stay {type:"empty"}.
//   - If the source verse has more words than rows, excess words are dropped.
//   - Any verse that already has at least one {type:"text"} cell for that
//     witness is skipped (preserves hand-curated John 1 data).
//   - Gloss reuses the TAGNT gloss already in that row (same passage concept).
//
// Usage:
//   node scripts/patch-vulgate-peshitta.js            # all four Gospels
//   node scripts/patch-vulgate-peshitta.js john       # one Gospel
//   node scripts/patch-vulgate-peshitta.js john 18    # one chapter
//   node scripts/patch-vulgate-peshitta.js john 18 31 # one verse

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const GOSPEL_DISPLAY = { matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' };

// ---------------------------------------------------------------------------
// Parse either source file into Map<gospel, Map<"ch:v", string[]>>
// Format: sections begin with "### Matthew" etc.
//         verses are "[ch:v] text..."
// ---------------------------------------------------------------------------

/**
 * @param {string} filepath
 * @param {(text: string) => string[]} tokenise
 * @returns {Map<string, Map<string, string[]>>}
 */
function parseSourceFile(filepath, tokenise) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines   = content.split('\n');

  /** @type {Map<string, Map<string, string[]>>} */
  const result  = new Map();
  let currentGospel = null;

  const GOSPEL_HEADERS = {
    'Matthew': 'matthew',
    'Mark':    'mark',
    'Luke':    'luke',
    'John':    'john',
  };

  for (const line of lines) {
    // Section header
    const hm = line.match(/^###\s+(\w+)/);
    if (hm) {
      currentGospel = GOSPEL_HEADERS[hm[1]] ?? null;
      if (currentGospel && !result.has(currentGospel)) {
        result.set(currentGospel, new Map());
      }
      continue;
    }

    if (!currentGospel) continue;

    // Verse line: [ch:v] text
    const vm = line.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (!vm) continue;

    const ch   = parseInt(vm[1], 10);
    const v    = parseInt(vm[2], 10);
    const text = vm[3].trim();
    if (!text) continue;

    const words = tokenise(text);
    if (words.length === 0) continue;

    result.get(currentGospel)?.set(`${ch}:${v}`, words);
  }

  return result;
}

/** Strip Vulgate punctuation and split into Latin word tokens. */
function tokeniseVulgate(text) {
  return text
    .split(/\s+/)
    .map(w => w
      .replace(/^[«»""''\-–—()\[\].,;:!?*]+/, '')
      .replace(/[«»""''\-–—()\[\].,;:!?*]+$/, ''))
    .filter(Boolean);
}

/** Strip Syriac sentence-end markers and split into tokens. */
function tokenisePeshitta(text) {
  return text
    .split(/[\s܀-܏]+/)  // split on whitespace and Syriac punctuation block
    .map(w => w.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Patch one verse file for one witness
// ---------------------------------------------------------------------------

/**
 * @param {object} data  - parsed verse JSON (mutated in place)
 * @param {'vulgate'|'peshitta'} witness
 * @param {string[]} sourceWords
 * @param {string} glossSource  - 'Whitaker' | 'PayneSmith'
 * @returns {boolean} whether any change was made
 */
function patchWitness(data, witness, sourceWords, glossSource) {
  const { rows } = data;

  // Skip if any row already has real text for this witness (hand-curated)
  if (rows.some(r => r[witness]?.type === 'text')) return false;

  let wordIdx = 0;
  let changed = false;

  for (const row of rows) {
    if (row[witness]?.type !== 'empty') continue;

    const word = sourceWords[wordIdx++] ?? null;
    if (!word) continue; // source shorter than TAGNT — leave empty

    // Reuse the TAGNT gloss from vaticanus (same passage concept)
    const tagntGloss = row.vaticanus?.gloss?.gloss ?? '';

    row[witness] = {
      type: 'text',
      text: word,
      gloss: { gloss: tagntGloss, source: glossSource },
    };
    changed = true;
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  process.stdout.write('Parsing Vulgate... ');
  const vulgateMap = parseSourceFile(
    path.join(ROOT, 'data/sources/vulgate/VulgClementine.txt'),
    tokeniseVulgate,
  );
  console.log([...vulgateMap.entries()].map(([g, m]) => `${GOSPEL_DISPLAY[g]}: ${m.size} vv`).join(', '));

  process.stdout.write('Parsing Peshitta... ');
  const peshittaMap = parseSourceFile(
    path.join(ROOT, 'data/sources/peshitta/Peshitta.txt'),
    tokenisePeshitta,
  );
  console.log([...peshittaMap.entries()].map(([g, m]) => `${GOSPEL_DISPLAY[g]}: ${m.size} vv`).join(', '));

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let vPatch = 0, pPatch = 0, skipped = 0;

  for (const gospel of gospels) {
    if (targetGospel && gospel !== targetGospel) continue;

    const gospelDir = path.join(ROOT, 'data', gospel);
    if (!fs.existsSync(gospelDir)) continue;

    const vulgGospel  = vulgateMap.get(gospel)  ?? new Map();
    const peshGospel  = peshittaMap.get(gospel) ?? new Map();

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

        const filepath = path.join(chDir, f);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const key  = `${chapter}:${n}`;

        const vWords = vulgGospel.get(key)  ?? [];
        const pWords = peshGospel.get(key)  ?? [];

        const vChanged = vWords.length > 0 && patchWitness(data, 'vulgate',  vWords, 'Whitaker');
        const pChanged = pWords.length > 0 && patchWitness(data, 'peshitta', pWords, 'PayneSmith');

        if (vChanged || pChanged) {
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
          if (vChanged) vPatch++;
          if (pChanged) pPatch++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Vulgate patched  : ${vPatch}`);
  console.log(`  Peshitta patched : ${pPatch}`);
  console.log(`  Skipped          : ${skipped}  (no source text or already populated)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
