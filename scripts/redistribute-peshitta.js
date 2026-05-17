// @ts-check
// scripts/redistribute-peshitta.js
//
// Redistributes Peshitta words proportionally across all Greek rows instead
// of top-loading them. Only touches verses where peshitta words form a
// contiguous block at the top (the pattern left by patch-vulgate-peshitta.js).
// Hand-curated or already-distributed verses are left untouched.
//
// Usage:
//   node scripts/redistribute-peshitta.js            # all four Gospels
//   node scripts/redistribute-peshitta.js john       # one Gospel
//   node scripts/redistribute-peshitta.js john 18    # one chapter
//   node scripts/redistribute-peshitta.js john 18 31 # one verse

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/**
 * Compute target row indices for W words spread across R rows.
 * First word → row 0, last word → row R-1, rest proportionally.
 * @param {number} W
 * @param {number} R
 * @returns {number[]}
 */
function targetRows(W, R) {
  if (W === 0) return [];
  if (W === 1) return [0];
  if (W >= R)  return Array.from({ length: R }, (_, i) => i);
  return Array.from({ length: W }, (_, i) => Math.round(i * (R - 1) / (W - 1)));
}

/**
 * @param {object} data  - parsed verse JSON (mutated in place)
 * @returns {boolean} whether any change was made
 */
function redistribute(data) {
  const { rows } = data;
  const R = rows.length;

  // Collect peshitta words
  const words = rows
    .filter(r => r.peshitta?.type === 'text')
    .map(r => r.peshitta.text);
  const W = words.length;

  if (W === 0 || W >= R) return false; // nothing to spread out

  // Only touch top-loaded blocks (what the patch script produces)
  const isTopLoaded =
    rows.slice(0, W).every(r => r.peshitta?.type === 'text') &&
    rows.slice(W).every(r => r.peshitta?.type === 'empty');

  if (!isTopLoaded) return false;

  // Clear all peshitta cells
  for (const row of rows) {
    row.peshitta = { type: 'empty' };
  }

  // Place words at proportional target rows
  const targets = targetRows(W, R);
  for (let i = 0; i < W; i++) {
    const ri = targets[i];
    const tagntGloss = rows[ri].vaticanus?.gloss?.gloss ?? '';
    rows[ri].peshitta = {
      type: 'text',
      text: words[i],
      gloss: { gloss: tagntGloss, source: 'PayneSmith' },
    };
  }

  return true;
}

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let changed = 0, skipped = 0;

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

        const filepath = path.join(chDir, f);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

        if (redistribute(data)) {
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
          changed++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Redistributed : ${changed}`);
  console.log(`  Skipped       : ${skipped}  (already distributed, hand-curated, or W≥R)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
