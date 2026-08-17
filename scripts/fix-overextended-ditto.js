'use strict';
// Fix 2 OVER_EXTENDED entries revealed after dittography fix.
// Run: node scripts/fix-overextended-ditto.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

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
  { gospel:'matthew', ch:5,  vs:28, papId:'P64+P67', extraWords:1 },
  { gospel:'luke',    ch:2,  vs:7,  papId:'P4',      extraWords:4 },
];

let totalFiles = 0, totalChanges = 0;
for (const { gospel, ch, vs, papId, extraWords } of CASES) {
  const fp   = path.join(DATA, gospel, String(ch), `${vs}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const changed = removePapyrusFromLastN(data.rows, papId, extraWords);
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY ? 'WOULD' : 'DID'} ${gospel} ${ch}:${vs} [${papId}]: removed ${changed} trailing row(s)`);
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing to change`);
  }
}
console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
