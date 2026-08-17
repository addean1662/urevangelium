'use strict';
// Pericope Adulterae fix: John 8:1-12.
//
// P45, P66, and P75 do not contain John 8:1-12 (Pericope Adulterae).
// These verses were added to the NT canon later and are absent from early papyri.
// The INTF VMR has no data for P45/P66/P75 at these verses — correct behaviour.
// Our stored data incorrectly lists them as extant there.
//
// Fix: for each row in john/8/1 through john/8/12:
//   - Remove P45, P66, P75 from fragments
//   - If row becomes empty → set papyrus to {type:'lost'}
//
// Run: node scripts/fix-pericope-adulterae.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

const PAPYRI_TO_REMOVE = ['P45', 'P66', 'P75'];
const VERSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function readVerse(gospel, chapter, verse) {
  const fp = path.join(DATA, gospel, String(chapter), `${verse}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

let totalFiles = 0, totalChanges = 0;

for (const verse of VERSES) {
  const { fp, data } = readVerse('john', 8, verse);
  let changed = 0;

  for (const row of data.rows) {
    if (!row.papyrus || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(
      f => !PAPYRI_TO_REMOVE.includes(f.id)
    );
    const removed = before - row.papyrus.fragments.length;
    if (removed === 0) continue;

    if (row.papyrus.fragments.length === 0) {
      row.papyrus = { type: 'lost' };
    }
    changed++;
  }

  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} john/8/${verse}: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log(`  SKIP john/8/${verse}: nothing to change`);
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
