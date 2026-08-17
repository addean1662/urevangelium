'use strict';
// QA batch: remaining NOT_IN_INTF removals and MISMATCH/DISPLACEMENT data fixes.
//
// NOT_IN_INTF — papyrus listed as extant where INTF has no verse data
// (genuine INTF lacunae or out-of-coverage):
//   P19  matthew 10:38        (lacuna between 10:37 and 10:39)
//   P77  matthew 13:55-56     (P77 covers Matt 23 only — ch13 is wrong)
//   P77  matthew 14:3-5       (same — ch14 is out of P77 coverage)
//   P104 matthew 21:45        (lacuna; 21:43-44 covered but not 45)
//   P7   luke 4:3             (lacuna; P7 covers 4:1-2 only per INTF)
//   P75  luke 6:10            (lacuna: 6:9 absent, 6:11 present)
//   P75  luke 7:41            (lacuna: 7:40 absent, 7:42 present)
//   P75  luke 7:49            (lacuna: 7:48 and 7:50 present)
//   P75  luke 17:19           (lacuna: 17:20 present)
//   P75  luke 17:37           (lacuna: 17:36 and 17:38 absent)
//   P75  luke 22:45           (lacuna: 22:43 and 22:46 present)
//   P75  luke 23:18           (lacuna: 23:17 and 23:19 present)
//   P69  luke 22:40           (P69 covers 22:41 only in this region)
//   P69  luke 22:42           (lacuna: 22:41 and 22:43 present)
//   P75  john 4:38            (lacuna: 4:37 and 4:39 present)
//   P134 john 2:1             (P134 covers John 1:49-51 per INTF; 2:1 absent)
//   P84  john 5:5             (P84 covers John 17 per INTF — ch5 is wrong)
//   P6   john 11:8            (lacuna: 11:7 and 11:9+ absent)
//   P59  john 12:26-28        (lacuna: 12:25 and 12:29 present)
//   P108 john 17:22           (P108 covers 17:23-24; 17:22 is before its start)
//
// MISMATCH/DISPLACEMENT data fixes:
//   P4   luke 4:32            (INTF = 2 words only; remove P4 from rows 3-13)
//   P45  luke 13:25           (INTF = verse beginning; our data = verse middle; remove all)
//   P120 john 1:42            (INTF = "ερμηνευεται πετρος" = rows 22-23; remove from r20-21)
//   P76  john 4:9             (INTF starts at "σαμαριτιδοσ"; remove P76 from rows 17-21)
//
// Run: node scripts/fix-remaining-qa.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function readVerse(gospel, ch, vs) {
  const fp = path.join(DATA, gospel, String(ch), `${vs}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

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

// ── NOT_IN_INTF bulk removals ────────────────────────────────────────────────
const NOT_IN_INTF = [
  { gospel:'matthew', ch:10, vs:38,  papId:'P19'  },
  { gospel:'matthew', ch:13, vs:55,  papId:'P77'  },
  { gospel:'matthew', ch:13, vs:56,  papId:'P77'  },
  { gospel:'matthew', ch:14, vs:3,   papId:'P77'  },
  { gospel:'matthew', ch:14, vs:4,   papId:'P77'  },
  { gospel:'matthew', ch:14, vs:5,   papId:'P77'  },
  { gospel:'matthew', ch:21, vs:45,  papId:'P104' },
  { gospel:'luke',    ch:4,  vs:3,   papId:'P7'   },
  { gospel:'luke',    ch:6,  vs:10,  papId:'P75'  },
  { gospel:'luke',    ch:7,  vs:41,  papId:'P75'  },
  { gospel:'luke',    ch:7,  vs:49,  papId:'P75'  },
  { gospel:'luke',    ch:17, vs:19,  papId:'P75'  },
  { gospel:'luke',    ch:17, vs:37,  papId:'P75'  },
  { gospel:'luke',    ch:22, vs:40,  papId:'P69'  },
  { gospel:'luke',    ch:22, vs:42,  papId:'P69'  },
  { gospel:'luke',    ch:22, vs:45,  papId:'P75'  },
  { gospel:'luke',    ch:23, vs:18,  papId:'P75'  },
  { gospel:'john',    ch:2,  vs:1,   papId:'P134' },
  { gospel:'john',    ch:4,  vs:38,  papId:'P75'  },
  { gospel:'john',    ch:5,  vs:5,   papId:'P84'  },
  { gospel:'john',    ch:11, vs:8,   papId:'P6'   },
  { gospel:'john',    ch:12, vs:26,  papId:'P59'  },
  { gospel:'john',    ch:12, vs:27,  papId:'P59'  },
  { gospel:'john',    ch:12, vs:28,  papId:'P59'  },
  { gospel:'john',    ch:17, vs:22,  papId:'P108' },
];

for (const { gospel, ch, vs, papId } of NOT_IN_INTF) {
  const { fp, data } = readVerse(gospel, ch, vs);
  const changed = removePapyrusFromRows(data.rows, papId);
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: ${changed} row(s)`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}

// ── P4 luke 4:32 OVER_EXTENDED ──────────────────────────────────────────────
// INTF = 2 words ("και εξεπλησσοντο"); our data has 13 rows.
// Remove P4 from rows 3-13 (indices 2-12).
{
  const { fp, data } = readVerse('luke', 4, 32);
  const toRemove = data.rows.slice(2);
  const changed = removePapyrusFromRows(toRemove, 'P4');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} luke 4:32 [P4]: removed from ${changed} trailing row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP luke 4:32 [P4]: nothing to change');
  }
}

// ── P45 luke 13:25 DISPLACEMENT ─────────────────────────────────────────────
// INTF = first 12 words of verse ("αφ ου αν...αρξησθε"); our data = middle/end of verse.
// None of the INTF words appear in our stored rows. Remove P45 from all rows.
{
  const { fp, data } = readVerse('luke', 13, 25);
  const changed = removePapyrusFromRows(data.rows, 'P45');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} luke 13:25 [P45]: removed from ${changed} row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP luke 13:25 [P45]: nothing to change');
  }
}

// ── P120 john 1:42 DISPLACEMENT ─────────────────────────────────────────────
// INTF = "ερμηνευεται πετρος" (rows 22-23 which don't exist in our data).
// Our data has P120 at rows 20-21 ("κηφασ ο") which is NOT the INTF coverage.
// Remove P120 from rows 20-21 (indices 19-20).
{
  const { fp, data } = readVerse('john', 1, 42);
  const toRemove = [data.rows[19], data.rows[20]].filter(Boolean);
  const changed = removePapyrusFromRows(toRemove, 'P120');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} john 1:42 [P120]: removed from ${changed} row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP john 1:42 [P120]: nothing to change');
  }
}

// ── P76 john 4:9 DISPLACEMENT ───────────────────────────────────────────────
// INTF starts at "σαμαριτιδος" (row 22) not at "παρ" (row 17).
// Remove P76 from rows 17-21 (indices 16-20).
{
  const { fp, data } = readVerse('john', 4, 9);
  const toRemove = data.rows.slice(16, 21);
  const changed = removePapyrusFromRows(toRemove, 'P76');
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} john 4:9 [P76]: removed from ${changed} row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP john 4:9 [P76]: nothing to change');
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
