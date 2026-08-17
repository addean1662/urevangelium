'use strict';
// Fix dittography errors: our data has the same word attributed to a papyrus
// in two consecutive extant rows, where INTF only shows one occurrence.
// Fix: remove the papyrus from the Nth extant row (0-indexed) that is the duplicate.
//
// Run: node scripts/fix-dittography.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Remove papId from a specific range of extant rows [startN, startN+count).
// startN and count are in terms of extant-row index for this papId.
function removePapyrusFromExtantRange(rows, papId, startN, count) {
  let seen = 0;
  let changed = 0;
  for (const row of rows) {
    if (seen >= startN + count) break;
    if (row.papyrus?.type !== 'extant') continue;
    if (!row.papyrus.fragments?.some(f => f.id === papId)) continue;
    if (seen >= startN) {
      row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== papId);
      if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
      changed++;
    }
    seen++;
  }
  return changed;
}

// { gospel, ch, vs, papId, dittoAt: extant-row index (0-based) to remove, count: how many rows }
const CASES = [
  // matthew 5:28 [P64+P67]: duplicate "τη" at extant index 17
  { gospel:'matthew', ch:5,  vs:28,  papId:'P64+P67', dittoAt:17, count:1 },
  // matthew 23:39 [P83]: duplicate "ονοματι" at extant index 5
  { gospel:'matthew', ch:23, vs:39,  papId:'P83',     dittoAt:5,  count:1 },
  // mark 6:3 [P45]: duplicate "και" at extant index 28
  { gospel:'mark',    ch:6,  vs:3,   papId:'P45',     dittoAt:28, count:1 },
  // luke 2:7 [P4]: duplicate "ουκ" at extant index 17
  { gospel:'luke',    ch:2,  vs:7,   papId:'P4',      dittoAt:17, count:1 },
  // luke 9:14 [P75]: duplicate "ανα" at extant index 6
  { gospel:'luke',    ch:9,  vs:14,  papId:'P75',     dittoAt:6,  count:1 },
  // luke 22:48 [P75]: duplicate "φιληματι" at extant index 6
  { gospel:'luke',    ch:22, vs:48,  papId:'P75',     dittoAt:6,  count:1 },
  // john 1:27 [P66]: duplicate "εγω" at extant index 8
  { gospel:'john',    ch:1,  vs:27,  papId:'P66',     dittoAt:8,  count:1 },
  // john 1:27 [P5]: duplicate "εγω" at extant index 8
  { gospel:'john',    ch:1,  vs:27,  papId:'P5',      dittoAt:8,  count:1 },
  // john 1:27 [P119]: duplicate "εγω" at extant index 8
  { gospel:'john',    ch:1,  vs:27,  papId:'P119',    dittoAt:8,  count:1 },
  // john 1:27 [P75]: INTF has no "εγω" — remove from extant rows 7 AND 8
  { gospel:'john',    ch:1,  vs:27,  papId:'P75',     dittoAt:7,  count:2 },
  // john 1:27 [P120]: INTF has no "εγω" — remove from extant rows 7 AND 8
  { gospel:'john',    ch:1,  vs:27,  papId:'P120',    dittoAt:7,  count:2 },
  // john 2:12 [P66]: duplicate "αυτου" at extant index 14
  { gospel:'john',    ch:2,  vs:12,  papId:'P66',     dittoAt:14, count:1 },
  // john 15:2 [P75]: duplicate "πλειονα" at extant index 18
  { gospel:'john',    ch:15, vs:2,   papId:'P75',     dittoAt:18, count:1 },
  // john 20:17 [P5]: duplicate "τον" at extant index 11
  { gospel:'john',    ch:20, vs:17,  papId:'P5',      dittoAt:11, count:1 },
];

let totalFiles = 0, totalChanges = 0;

for (const { gospel, ch, vs, papId, dittoAt, count } of CASES) {
  const fp   = path.join(DATA, gospel, String(ch), `${vs}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const changed = removePapyrusFromExtantRange(data.rows, papId, dittoAt, count);
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: removed ${changed} ditto row(s) at extant[${dittoAt}]`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
