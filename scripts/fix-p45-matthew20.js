'use strict';
// Fix P45 matthew 20:24 (DISPLACEMENT) and 20:32 (OVER_EXTENDED).
//
// matthew 20:24 [P45] DISPLACEMENT:
//   INTF: "ηγανακτησαν περι των δυο αδελφων" (5 words) = rows 5-9.
//   Rows 1-4 ("δυο αδελφων οι δεκα") have P45+P83 but are NOT in P45's INTF.
//   Fix: remove P45 from rows 1-4 (P83 stays).
//
// matthew 20:32 [P45] OVER_EXTENDED:
//   INTF: 10 words = rows 1-10 only. Rows 11-12 ("ποιησω υμιν") not in INTF.
//   P45 is sole fragment on rows 11-12.
//   Fix: set rows 11-12 to {type:'lost'}.
//
// Run: node scripts/fix-p45-matthew20.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

let totalFiles = 0, totalChanges = 0;

// ── matthew 20:24 DISPLACEMENT ──────────────────────────────────────────────
{
  const fp = path.join(DATA, 'matthew', '20', '24.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = 0;

  for (let i = 0; i < 4; i++) {
    const row = data.rows[i];
    if (row.papyrus?.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P45');
    if (row.papyrus.fragments.length === before) continue;
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    changed++;
  }

  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} matthew 20:24 [P45]: removed from ${changed} leading row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP matthew 20:24 [P45]: nothing to change');
  }
}

// ── matthew 20:32 OVER_EXTENDED ─────────────────────────────────────────────
{
  const fp = path.join(DATA, 'matthew', '20', '32.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = 0;

  for (let i = 10; i < 12; i++) {
    const row = data.rows[i];
    if (row.papyrus?.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P45');
    if (row.papyrus.fragments.length === before) continue;
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    changed++;
  }

  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} matthew 20:32 [P45]: removed from ${changed} trailing row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP matthew 20:32 [P45]: nothing to change');
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
