'use strict';
// Fix 25 "displaced" PARTIAL_MATCH entries: intfOffset=0, ourOffset>0.
// In each case our stored data attributes the papyrus to extra leading rows
// before INTF's transcript coverage begins.
// Fix: remove the papyrus from the first ourOffset extant rows for that fragment.
//
// Run: node scripts/fix-displaced-partial.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Remove papId from the first n extant rows (by extant-row count for this papId).
function removePapyrusFromFirstN(rows, papId, n) {
  let seen = 0;
  let changed = 0;
  for (const row of rows) {
    if (seen >= n) break;
    if (row.papyrus?.type !== 'extant') continue;
    if (!row.papyrus.fragments?.some(f => f.id === papId)) continue;
    seen++;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== papId);
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    changed++;
  }
  return changed;
}

// 25 displaced cases: { gospel, ch, vs, papId, ourOffset }
// ourOffset = number of extant papyrus rows before INTF coverage starts
const DISPLACED = [
  { gospel:'matthew', ch:20, vs:23,  papId:'P83',    ourOffset:26 },
  { gospel:'matthew', ch:20, vs:30,  papId:'P83',    ourOffset:3  },
  { gospel:'matthew', ch:23, vs:39,  papId:'P83',    ourOffset:11 },
  { gospel:'matthew', ch:25, vs:43,  papId:'P73',    ourOffset:13 },
  { gospel:'matthew', ch:26, vs:32,  papId:'P64+P67',ourOffset:5  },
  { gospel:'matthew', ch:27, vs:62,  papId:'P105',   ourOffset:3  },
  { gospel:'mark',    ch:6,  vs:33,  papId:'P84',    ourOffset:18 },
  { gospel:'mark',    ch:6,  vs:36,  papId:'P84',    ourOffset:8  },
  { gospel:'luke',    ch:9,  vs:14,  papId:'P75',    ourOffset:9  },
  { gospel:'john',    ch:1,  vs:25,  papId:'P120',   ourOffset:11 },
  { gospel:'john',    ch:1,  vs:40,  papId:'P106',   ourOffset:5  },
  { gospel:'john',    ch:1,  vs:42,  papId:'P119',   ourOffset:1  },
  { gospel:'john',    ch:2,  vs:4,   papId:'P75',    ourOffset:1  },
  { gospel:'john',    ch:3,  vs:34,  papId:'P80',    ourOffset:5  },
  { gospel:'john',    ch:10, vs:15,  papId:'P75',    ourOffset:1  },
  { gospel:'john',    ch:11, vs:44,  papId:'P59',    ourOffset:1  },
  { gospel:'john',    ch:11, vs:44,  papId:'P66',    ourOffset:1  },
  { gospel:'john',    ch:11, vs:44,  papId:'P75',    ourOffset:1  },
  { gospel:'john',    ch:12, vs:16,  papId:'P128',   ourOffset:16 },
  { gospel:'john',    ch:16, vs:33,  papId:'P60',    ourOffset:5  },
  { gospel:'john',    ch:17, vs:24,  papId:'P59',    ourOffset:11 },
  { gospel:'john',    ch:18, vs:16,  papId:'P59',    ourOffset:16 },
  { gospel:'john',    ch:18, vs:23,  papId:'P66',    ourOffset:4  },
  { gospel:'john',    ch:18, vs:36,  papId:'P90',    ourOffset:19 },
  { gospel:'john',    ch:20, vs:20,  papId:'P66',    ourOffset:3  },
];

let totalFiles = 0, totalChanges = 0;

for (const { gospel, ch, vs, papId, ourOffset } of DISPLACED) {
  const fp   = path.join(DATA, gospel, String(ch), `${vs}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const changed = removePapyrusFromFirstN(data.rows, papId, ourOffset);
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: removed from ${changed} leading row(s)`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
