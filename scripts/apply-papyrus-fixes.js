// scripts/apply-papyrus-fixes.js
//
// Reads DISPLACEMENT fixes from papyrus-intf-report.txt and applies them
// to the data JSON files by setting leading unattested rows to { type: 'lost' }.
//
// Dry-run by default — prints every change without writing.
// Pass --apply to actually write the data files.
//
// Rules enforced:
//   - Only DISPLACEMENT fixes are applied (not OVER_EXTENDED, PARTIAL_MATCH, etc.)
//   - Only leading rows (1..N) are set to lost; rows after N are untouched
//   - Rows already { type: 'lost' } are skipped silently
//   - Matthew 1–5 is flagged in output (manually verified) but still applied
//     unless you pass --skip-matt1-5
//   - The script never adds, removes, or reorders rows

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const REPORT  = path.join(ROOT, 'papyrus-intf-report.txt');
const DATA    = path.join(ROOT, 'data');

const DRY_RUN      = !process.argv.includes('--apply');
const SKIP_MATT15  = process.argv.includes('--skip-matt1-5');

// ── Parse report ─────────────────────────────────────────────────────────────

function parseDisplacements(text) {
  const fixes = [];
  const lines  = text.split('\n');

  let inSection = false;
  let current   = null;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Section header
    if (/^DISPLACEMENT \(\d+\)/.test(line)) {
      inSection = true;
      continue;
    }
    // Next section separator ends the DISPLACEMENT block
    if (inSection && /^─{10,}/.test(line)) {
      if (current) { fixes.push(current); current = null; }
      inSection = false;
      continue;
    }
    if (!inSection) continue;

    // Verse line:  "  matthew 1:14 [P1]"
    const vm = line.match(/^\s{2}(\w+)\s+(\d+):(\d+)\s+\[(.+?)\]/);
    if (vm) {
      if (current) fixes.push(current);
      current = {
        gospel:   vm[1],
        chapter:  parseInt(vm[2], 10),
        verse:    parseInt(vm[3], 10),
        fragment: vm[4],
        lostCount: null,
      };
      continue;
    }

    // FIX line:  "    FIX:  set rows 1–3 to lost; papyrus starts at row 4"
    //            (en-dash U+2013 or ASCII hyphen)
    const fm = line.match(/FIX:\s+set rows 1[–\-](\d+) to lost/);
    if (fm && current) {
      current.lostCount = parseInt(fm[1], 10);
    }
  }
  if (current) fixes.push(current);

  return fixes.filter(f => f.lostCount !== null);
}

// ── Apply one fix ─────────────────────────────────────────────────────────────

function applyFix(fix) {
  const filePath = path.join(DATA, fix.gospel, String(fix.chapter), `${fix.verse}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  MISSING  ${fix.gospel} ${fix.chapter}:${fix.verse} [${fix.fragment}]  — ${filePath}`);
    return 'missing';
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const rows = data.rows;

  const inMatt15 = fix.gospel === 'matthew' && fix.chapter <= 5;
  if (inMatt15 && SKIP_MATT15) {
    console.log(`  SKIP     ${fix.gospel} ${fix.chapter}:${fix.verse} [${fix.fragment}]  — Matt 1-5 excluded`);
    return 'skipped';
  }

  const toChange = [];
  for (let i = 0; i < fix.lostCount && i < rows.length; i++) {
    const row = rows[i];
    if (!row.papyrus)                     continue; // no papyrus cell
    if (row.papyrus.type === 'lost')      continue; // already correct
    toChange.push({ index: i, id: row.id });
  }

  if (toChange.length === 0) {
    console.log(`  OK       ${fix.gospel} ${fix.chapter}:${fix.verse} [${fix.fragment}]  — already correct`);
    return 'ok';
  }

  const flag   = inMatt15 ? '  ⚠ Matt 1-5' : '';
  const rowIds = toChange.map(r => r.id).join(', ');
  const verb   = DRY_RUN ? 'WOULD SET' : 'FIXED    ';
  console.log(`  ${verb}  ${fix.gospel} ${fix.chapter}:${fix.verse} [${fix.fragment}]  rows ${rowIds} → lost${flag}`);

  if (!DRY_RUN) {
    for (const { index } of toChange) {
      rows[index].papyrus = { type: 'lost' };
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  return 'changed';
}

// ── Main ──────────────────────────────────────────────────────────────────────

const reportText = fs.readFileSync(REPORT, 'utf8');
const fixes      = parseDisplacements(reportText);

console.log('Papyrus Displacement Fix Script');
console.log(`Mode:         ${DRY_RUN ? 'DRY RUN — pass --apply to write changes' : 'APPLYING CHANGES'}`);
console.log(`Matt 1–5:     ${SKIP_MATT15 ? 'SKIPPED (--skip-matt1-5)' : 'included (flag only)'}`);
console.log(`Fixes parsed: ${fixes.length}`);
console.log();

const counts = { changed: 0, ok: 0, missing: 0, skipped: 0 };

for (const fix of fixes) {
  const result = applyFix(fix);
  counts[result] = (counts[result] || 0) + 1;
}

console.log();
console.log('Summary');
console.log(`  To fix:          ${counts.changed}`);
console.log(`  Already correct: ${counts.ok}`);
console.log(`  Missing files:   ${counts.missing}`);
console.log(`  Skipped:         ${counts.skipped}`);

if (DRY_RUN && counts.changed > 0) {
  console.log();
  console.log('Run with --apply to write changes.');
}
