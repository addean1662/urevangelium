'use strict';
// Bulk fix: OVER_EXTENDED (390 entries) + DISPLACEMENT (1 entry: matthew 26:2 P73).
//
// For each OVER_EXTENDED papyrus/verse:
//   The INTF covers N words; stored data has N+extra rows for this papyrus.
//   Fix: for each of the last `extra` rows:
//     - If row has ONLY this papyrus → set papyrus to {type:"lost"}
//     - If shared with other papyri  → remove this papyrus from fragments list
//
// For matthew 26:2 [P73] DISPLACEMENT:
//   INTF is "το σταυρωθηναι" (2 words) found at stored rows 16-17.
//   P73 also erroneously covers rows 1-15 (shared with P45).
//   Fix: remove P73 from rows 1-15 fragments (P45 stays).
//
// Run: node scripts/fix-overextended.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const DATA   = path.join(ROOT, 'data');
const REPORT = path.join(ROOT, 'papyrus-intf-report.txt');
const DRY    = !process.argv.includes('--apply');

function readVerse(gospel, chapter, verse) {
  const fp = path.join(DATA, gospel, String(chapter), `${verse}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Parse OVER_EXTENDED entries from the report
function parseReport() {
  const text = fs.readFileSync(REPORT, 'utf8');
  const lines = text.split('\n');
  const entries = [];
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('OVER_EXTENDED')) { inSection = true; continue; }
    if (inSection && lines[i].startsWith('─')) break;
    if (!inSection) continue;

    const hm = lines[i].match(/^  (\w+) (\d+):(\d+) \[P([^\]]+)\]$/);
    if (!hm) continue;
    const gospel = hm[1], ch = +hm[2], vs = +hm[3], papSuffix = hm[4];
    const papId = 'P' + papSuffix;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const im = lines[j].match(/INFO: our data has (\d+) extra/);
      if (im) { entries.push({ gospel, ch, vs, papId, extra: +im[1] }); break; }
    }
  }
  return entries;
}

// Remove a specific papyrus fragment from a row (or set to lost if sole fragment)
function removePapyrusFromRow(row, papId) {
  if (!row.papyrus || row.papyrus.type !== 'extant') return false;
  const before = row.papyrus.fragments.length;
  const filtered = row.papyrus.fragments.filter(f => f.id !== papId);
  if (filtered.length === before) return false;
  if (filtered.length === 0) {
    row.papyrus = { type: 'lost' };
  } else {
    row.papyrus.fragments = filtered;
  }
  return true;
}

let totalFiles = 0, totalChanges = 0;

// ── OVER_EXTENDED bulk fix ──────────────────────────────────
const entries = parseReport();
console.log(`Processing ${entries.length} OVER_EXTENDED entries...`);

for (const { gospel, ch, vs, papId, extra } of entries) {
  const { fp, data } = readVerse(gospel, ch, vs);

  const coveredRows = data.rows.filter(r =>
    r.papyrus?.type === 'extant' && r.papyrus.fragments.some(f => f.id === papId)
  );

  if (coveredRows.length === 0) {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: no rows found`);
    continue;
  }

  const intfCount = coveredRows.length - extra;
  if (intfCount < 0) {
    console.log(`  WARN ${gospel} ${ch}:${vs} [${papId}]: extra=${extra} > rows=${coveredRows.length}`);
    continue;
  }

  const toRemove = coveredRows.slice(intfCount);
  let changed = 0;
  for (const row of toRemove) {
    if (removePapyrusFromRow(row, papId)) changed++;
  }

  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    save(fp, data);
  } else {
    console.log(`  SKIP ${gospel} ${ch}:${vs} [${papId}]: nothing changed`);
  }
}

// ── DISPLACEMENT fix: matthew 26:2 [P73] ───────────────────
{
  console.log('\nProcessing DISPLACEMENT: matthew 26:2 [P73]...');
  const { fp, data } = readVerse('matthew', 26, 2);
  const p73rows = data.rows.filter(r =>
    r.papyrus?.type === 'extant' && r.papyrus.fragments.some(f => f.id === 'P73')
  );
  // P73 INTF = 2 words → keep last 2 rows, remove from all earlier rows
  const toRemove = p73rows.slice(0, p73rows.length - 2);
  let changed = 0;
  for (const row of toRemove) {
    if (removePapyrusFromRow(row, 'P73')) changed++;
  }
  if (changed > 0) {
    totalFiles++;
    totalChanges += changed;
    console.log(`  ${DRY?'WOULD':'DID'} matthew 26:2 [P73]: removed from ${changed} leading row(s)`);
    save(fp, data);
  } else {
    console.log('  SKIP matthew 26:2 [P73]: nothing to change');
  }
}

console.log('');
console.log(`${DRY ? '[DRY RUN]' : '[APPLIED]'} Files touched: ${totalFiles}, row-changes: ${totalChanges}`);
console.log(DRY ? 'Pass --apply to write changes.' : 'Done.');
