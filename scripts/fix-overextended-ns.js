'use strict';
// Fix 4 OVER_EXTENDED entries revealed after the normForMatch/NS bug fix.
// Each has the correct starting position but our data extends beyond INTF coverage.
// Fix: remove the papyrus from the last N extant rows.
//
// Run: node scripts/fix-overextended-ns.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Remove papId from the last n extant rows (by extant-row count for this papId).
function removePapyrusFromLastN(rows, papId, n) {
  const extantIdx = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.papyrus?.type === 'extant' && r.papyrus.fragments?.some(f => f.id === papId))
      extantIdx.push(i);
  }
  const toRemove = extantIdx.slice(-n);
  let changed = 0;
  for (const i of toRemove) {
    const row = rows[i];
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== papId);
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    changed++;
  }
  return changed;
}

const CASES = [
  // extraWords from report:
  { gospel:'matthew', ch:11, vs:27, papId:'P70', extraWords:4  },
  { gospel:'matthew', ch:17, vs:7,  papId:'P44', extraWords:3  },
  { gospel:'matthew', ch:18, vs:19, papId:'P44', extraWords:4  },
  { gospel:'matthew', ch:24, vs:1,  papId:'P83', extraWords:12 },
];

let totalFiles = 0, totalChanges = 0;

for (const { gospel, ch, vs, papId, extraWords } of CASES) {
  const fp   = path.join(DATA, gospel, String(ch), `${vs}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const changed = removePapyrusFromLastN(data.rows, papId, extraWords);
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: removed from ${changed} trailing row(s)`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
