'use strict';
// Final QA batch: 2 DISPLACEMENTs + 2 OVER_EXTENDEDs.
//
// P4 luke 4:29 DISPLACEMENT:
//   INTF = 11 words starting at "του ορους εφ...αυτον" = rows 4-14.
//   Rows 1-3 ("αυτον εωσ οφρυοσ") are before INTF start.
//   Rows 15-24 ("ορους εφ᾽ ου...αυτον.") are OVER_EXTENDED after the INTF words.
//   Fix: remove P4 from rows 1-3 AND rows 15-24 (indices 0-2, 14-23).
//
// P66 john 17:8 DISPLACEMENT:
//   INTF = 15 words starting at "δεδωκα αυτοις..." = rows 7-21.
//   Rows 1-6 ("οτι τα ρημα τα εδωκασ μοι") not in INTF.
//   Rows 22-24 ("συ με απεστειλας.¶") OVER_EXTENDED.
//   Fix: remove P66 from rows 1-6 AND rows 22-24 (indices 0-5, 21-23).
//
// P45 matthew 20:29 OVER_EXTENDED:
//   INTF = 8 words; our data has 9 rows (1 extra).
//   Fix: remove P45 from row 9 (index 8) → set to lost (P45 sole fragment).
//
// P4 luke 4:35 OVER_EXTENDED:
//   INTF = 20 words; our data has 25 rows (5 extra).
//   Fix: remove P4 from rows 21-25 (indices 20-24).
//
// Run: node scripts/fix-batch-final.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function removePapyrusFromRows(rows, papId) {
  let changed = 0;
  for (const row of rows) {
    if (!row.papyrus || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== papId);
    if (row.papyrus.fragments.length === before) continue;
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    changed++;
  }
  return changed;
}

let totalFiles = 0, totalChanges = 0;

// ── P4 luke 4:29 ──────────────────────────────────────────────────────────────
{
  const fp = path.join(DATA, 'luke', '4', '29.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const leading  = data.rows.slice(0, 3);   // rows 1-3
  const trailing = data.rows.slice(14);     // rows 15-24
  const changed = removePapyrusFromRows(leading, 'P4') + removePapyrusFromRows(trailing, 'P4');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} luke 4:29 [P4]: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log('  SKIP luke 4:29 [P4]');
  }
}

// ── P66 john 17:8 ─────────────────────────────────────────────────────────────
{
  const fp = path.join(DATA, 'john', '17', '8.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const leading  = data.rows.slice(0, 6);   // rows 1-6
  const trailing = data.rows.slice(21);     // rows 22-24
  const changed = removePapyrusFromRows(leading, 'P66') + removePapyrusFromRows(trailing, 'P66');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} john 17:8 [P66]: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log('  SKIP john 17:8 [P66]');
  }
}

// ── P45 matthew 20:29 ────────────────────────────────────────────────────────
{
  const fp = path.join(DATA, 'matthew', '20', '29.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const trailing = data.rows.slice(8);     // row 9
  const changed = removePapyrusFromRows(trailing, 'P45');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} matthew 20:29 [P45]: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log('  SKIP matthew 20:29 [P45]');
  }
}

// ── P4 luke 4:35 ─────────────────────────────────────────────────────────────
{
  const fp = path.join(DATA, 'luke', '4', '35.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const trailing = data.rows.slice(20);    // rows 21-25
  const changed = removePapyrusFromRows(trailing, 'P4');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} luke 4:35 [P4]: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log('  SKIP luke 4:35 [P4]');
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
