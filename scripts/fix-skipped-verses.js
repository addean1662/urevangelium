'use strict';
// Fixes verses where a papyrus provably SKIPS the verse (INTF returns the
// next verse's content under that verse's key). Two patterns:
//   - Fragment is the ONLY one → set all rows to lost
//   - Fragment is co-present with others → remove the fragment from each row
//
// Verses:
//  john/4/37  [P75] — INTF B04K4V37 returns John 4:38 content; P66 attests 4:37
//  john/9/38  [P75] — INTF B04K9V38 returns John 9:39 content; P66 attests 9:38
//  john/16/15 [P66] — INTF B04K16V15 returns John 16:16 content; P5 attests 16:15
//  luke/12/9  [P45] — INTF B03K12V9 returns Luke 12:10 content; P75 attests 12:9
//  luke/17/36 [P75] — INTF B03K17V36 returns Luke 17:37 content; interpolated verse (only P75)
//  luke/23/17 [P75] — INTF B03K23V17 returns Luke 23:18 content; interpolated verse (only P75)
//
// Run: node scripts/fix-skipped-verses.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function readVerse(gospel, chapter, verse) {
  const fp = path.join(DATA, gospel, String(chapter), `${verse}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function log(msg) { console.log(msg); }

// Remove a specific fragment ID from all rows; if a row becomes fragment-less,
// mark it as empty (preserving that other fragment-free rows might be meaningful).
function removeFragment(data, fragId) {
  let changed = 0;
  for (const row of data.rows) {
    if (!row.papyrus || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== fragId);
    if (row.papyrus.fragments.length < before) {
      changed++;
      if (row.papyrus.fragments.length === 0) {
        // No fragments remain — mark as lost (we lost attesting fragments)
        row.papyrus = { type: 'lost' };
      }
    }
  }
  return changed;
}

// Set ALL rows to lost (for single-fragment verses that are skipped entirely).
function setAllLost(data) {
  let changed = 0;
  for (const row of data.rows) {
    if (row.papyrus && row.papyrus.type !== 'lost') {
      row.papyrus = { type: 'lost' };
      changed++;
    }
  }
  return changed;
}

// ─────────────────────────────────────────────────────────
// JOHN 4:37 — P75 skips; P66 attests
// P75 INTF B04K4V37 returns John 4:38 content
{
  const { fp, data } = readVerse('john', 4, 37);
  const n = removeFragment(data, 'P75');
  log(`${DRY ? 'WOULD' : 'DID'} john/4/37: remove P75 from ${n} rows (P66 attests verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 9:38 — P75 skips; P66 attests
// P75 INTF B04K9V38 returns John 9:39 content
{
  const { fp, data } = readVerse('john', 9, 38);
  const n = removeFragment(data, 'P75');
  log(`${DRY ? 'WOULD' : 'DID'} john/9/38: remove P75 from ${n} rows (P66 attests verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 16:15 — P66 skips; P5 attests
// P66 INTF B04K16V15 returns John 16:16 content
{
  const { fp, data } = readVerse('john', 16, 15);
  const n = removeFragment(data, 'P66');
  log(`${DRY ? 'WOULD' : 'DID'} john/16/15: remove P66 from ${n} rows (P5 attests verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 12:9 — P45 skips; P75 attests
// P45 INTF B03K12V9 returns Luke 12:10 content
{
  const { fp, data } = readVerse('luke', 12, 9);
  const n = removeFragment(data, 'P45');
  log(`${DRY ? 'WOULD' : 'DID'} luke/12/9: remove P45 from ${n} rows (P75 attests verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 17:36 — P75 skips; interpolated verse (Byzantine addition)
// P75 INTF B03K17V36 returns Luke 17:37 content; only P75 in this verse
{
  const { fp, data } = readVerse('luke', 17, 36);
  const n = setAllLost(data);
  log(`${DRY ? 'WOULD' : 'DID'} luke/17/36: set ${n} rows to lost (P75 skips interpolated verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 23:17 — P75 skips; interpolated verse (doubly-bracketed)
// P75 INTF B03K23V17 returns Luke 23:18 content; only P75 in this verse
{
  const { fp, data } = readVerse('luke', 23, 17);
  const n = setAllLost(data);
  log(`${DRY ? 'WOULD' : 'DID'} luke/23/17: set ${n} rows to lost (P75 skips interpolated verse)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
