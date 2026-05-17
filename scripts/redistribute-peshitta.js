// @ts-check
// scripts/redistribute-peshitta.js
//
// Redistributes Peshitta and Vulgate words proportionally across all Greek
// rows instead of top-loading them. Only touches verses where the witness
// words form a contiguous block at the top (the pattern left by
// patch-vulgate-peshitta.js). Hand-curated or already-distributed verses
// are left untouched.
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
 * @param {object[]} rows
 * @param {'peshitta'|'vulgate'} witness
 * @param {string} glossSource
 * @returns {boolean}
 */
function redistributeWitness(rows, witness, glossSource) {
  const R = rows.length;

  const words = rows
    .filter(r => r[witness]?.type === 'text')
    .map(r => r[witness].text);
  const W = words.length;

  if (W === 0 || W >= R) return false;

  const isTopLoaded =
    rows.slice(0, W).every(r => r[witness]?.type === 'text') &&
    rows.slice(W).every(r => r[witness]?.type === 'empty');

  if (!isTopLoaded) return false;

  for (const row of rows) {
    row[witness] = { type: 'empty' };
  }

  const targets = targetRows(W, R);
  for (let i = 0; i < W; i++) {
    const ri = targets[i];
    const tagntGloss = rows[ri].vaticanus?.gloss?.gloss ?? '';
    rows[ri][witness] = {
      type: 'text',
      text: words[i],
      gloss: { gloss: tagntGloss, source: glossSource },
    };
  }

  return true;
}

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let pChanged = 0, vChanged = 0, skipped = 0;

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

        const p = redistributeWitness(data.rows, 'peshitta', 'PayneSmith');
        const v = redistributeWitness(data.rows, 'vulgate',  'Whitaker');

        if (p || v) {
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
          if (p) pChanged++;
          if (v) vChanged++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Peshitta redistributed : ${pChanged}`);
  console.log(`  Vulgate redistributed  : ${vChanged}`);
  console.log(`  Skipped                : ${skipped}`);
  console.log(`${'─'.repeat(50)}`);
}

main();
