'use strict';
// Fix 13 NOT_IN_INTF entries: genuine INTF lacunae where our stored data
// incorrectly lists the papyrus as extant.
//
// Each entry: INTF has no transcript for that papyrus at that verse (confirmed
// by checking adjacent verses ARE present — these are genuine gaps, not coverage
// boundaries). Fix: remove the papyrus from all rows in that verse.
//   - sole fragment → {type:'lost'}
//   - shared         → remove from fragments array
//
// Entries:
//   P4  luke 1:74, 2:2, 2:3, 2:4
//   P45 luke 12:10
//   P66 john 5:5, 14:27, 14:31, 15:1, 16:16, 20:24, 21:12, 21:17
//
// Run: node scripts/fix-not-in-intf.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

const FIXES = [
  { gospel:'luke',  ch:1,  vs:74, papId:'P4'  },
  { gospel:'luke',  ch:2,  vs:2,  papId:'P4'  },
  { gospel:'luke',  ch:2,  vs:3,  papId:'P4'  },
  { gospel:'luke',  ch:2,  vs:4,  papId:'P4'  },
  { gospel:'luke',  ch:12, vs:10, papId:'P45' },
  { gospel:'john',  ch:5,  vs:5,  papId:'P66' },
  { gospel:'john',  ch:14, vs:27, papId:'P66' },
  { gospel:'john',  ch:14, vs:31, papId:'P66' },
  { gospel:'john',  ch:15, vs:1,  papId:'P66' },
  { gospel:'john',  ch:16, vs:16, papId:'P66' },
  { gospel:'john',  ch:20, vs:24, papId:'P66' },
  { gospel:'john',  ch:21, vs:12, papId:'P66' },
  { gospel:'john',  ch:21, vs:17, papId:'P66' },
];

function readVerse(gospel, ch, vs) {
  const fp = path.join(DATA, gospel, String(ch), `${vs}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

let totalFiles = 0, totalChanges = 0;

for (const { gospel, ch, vs, papId } of FIXES) {
  const { fp, data } = readVerse(gospel, ch, vs);
  let changed = 0;

  for (const row of data.rows) {
    if (!row.papyrus || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== papId);
    if (row.papyrus.fragments.length === before) continue;
    if (row.papyrus.fragments.length === 0) {
      row.papyrus = { type: 'lost' };
    }
    changed++;
  }

  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: ${changed} row(s) changed`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
