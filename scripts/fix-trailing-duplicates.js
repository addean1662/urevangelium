// scripts/fix-trailing-duplicates.js
//
// Fixes the systematic trailing-duplicate artifact in the papyrus column:
// the last extant papyrus word (with punctuation) was duplicated as an
// extra row without punctuation one position before it.
//
// Fix: set the earlier duplicate row(s) papyrus to { type: 'empty' }.
//
// Dry-run by default; pass --apply to write.

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const DATA  = path.join(ROOT, 'data');
const DRY   = !process.argv.includes('--apply');

const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

// Common words legitimately repeat in Greek — skip these for dup detection
const SKIP = new Set([
  'και','ο','η','το','τον','την','τη','των','τα',
  'τοισ','τοις','τουσ','τους',
  'αυτον','αυτω','αυτοισ','αυτοις','αυτησ','αυτης','αυτων','αυτου','αυτη',
  'εν','εισ','εις','εκ','απο','προσ','προς',
  'δε','γαρ','οτι','ινα','μη','ου','ουκ','αν',
  'μου','μοι','με','σου','σοι','σε','ημιν','υμιν',
  'εστιν','εστι','ην','ωσ','ως','ουν','τισ','τι','τις',
]);

function norm(s) {
  return (s || '').normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .toLowerCase()
    .replace(/ς/g, 'σ')                // final → medial sigma
    .replace(/[.,;:·¶!?"'»«\[\]]+/g, '') // strip punctuation
    .trim();
}

let totalFixed = 0;

for (const gospel of GOSPELS) {
  const gDir = path.join(DATA, gospel);
  if (!fs.existsSync(gDir)) continue;

  for (const chap of fs.readdirSync(gDir).sort((a, b) => +a - +b)) {
    const cDir = path.join(gDir, chap);
    const files = fs.readdirSync(cDir).sort((a, b) =>
      +a.replace('.json', '') - +b.replace('.json', ''));

    for (const vFile of files) {
      const verse = +vFile.replace('.json', '');
      const filePath = path.join(cDir, vFile);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // All extant papyrus rows in order
      const extant = data.rows
        .map((r, idx) => ({ row: r, idx }))
        .filter(({ row }) => row.papyrus && row.papyrus.type === 'extant');

      const n = extant.length;
      if (n < 2) continue;

      const words = extant.map(({ row }) => norm(row.papyrus.text || ''));
      const toEmpty = new Set(); // indices into extant[]

      // Detect 2-word trailing duplicate: [..., W1, W2, W1, W2.]
      if (
        n >= 4 &&
        words[n - 1] === words[n - 3] &&
        words[n - 2] === words[n - 4] &&
        !SKIP.has(words[n - 2]) &&
        !SKIP.has(words[n - 1])
      ) {
        toEmpty.add(n - 4);
        toEmpty.add(n - 3);
      }

      // Detect 1-word trailing duplicate: [..., W, W.] — only if not already
      // covered by the 2-word check above
      if (
        n >= 2 &&
        words[n - 1] === words[n - 2] &&
        !SKIP.has(words[n - 1]) &&
        !toEmpty.has(n - 2)
      ) {
        toEmpty.add(n - 2);
      }

      if (toEmpty.size === 0) continue;

      const ref = `${gospel} ${chap}:${verse}`;
      const rowIds = [...toEmpty].map(i => extant[i].row.id);

      console.log(
        `  ${DRY ? 'WOULD FIX' : 'FIXED    '}  ${ref.padEnd(22)} ` +
        `rows ${rowIds.join(', ')} → empty`
      );

      if (!DRY) {
        for (const i of toEmpty) {
          const dataRowIdx = extant[i].idx;
          data.rows[dataRowIdx].papyrus = { type: 'empty' };
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      }

      totalFixed++;
    }
  }
}

console.log();
console.log(`${DRY ? 'Would fix' : 'Fixed'}: ${totalFixed} verses`);
if (DRY && totalFixed > 0) {
  console.log('Run with --apply to write changes.');
}
