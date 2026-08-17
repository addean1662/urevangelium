'use strict';
// Batch 9 fix: john/1/38 [P119].
//
// john/1/38 [P119]:
//   P119 INTF (3 words): διδασκαλε που μενεις
//   Current: r21="μεθερμηνευομενον", r22="διδασκαλε", r23="που" (P66+P75+P5+P119 shared)
//   Problem: P119 INTF starts at "διδασκαλε" (r22) but P119 has no r24 for "μενεις"
//   Fix: shift r21-r23 texts by one position:
//     r21: "μεθερμηνευομενον" → "διδασκαλε"
//     r22: "διδασκαλε"        → "που"
//     r23: "που"              → "μενεισ"
//   Result: P119 → OK (3/3); P66/P75/P5 unaffected (max-run analysis):
//     P66: run of 20 starts at r1, breaks at r21 due to "μθερμηνευομενον" duplicate
//          before AND after the fix — unchanged OVER_EXTENDED(20)
//     P75: best run is 8 (r1-r8, breaks at "αυτω" present in stored but absent from P75)
//          before AND after fix — unchanged PARTIAL_MATCH(8)
//     P5:  gains a 3-word match at r21-r23 — slight improvement, no regression
//
// Run: node scripts/fix-batch9.js [--apply]

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

// ─────────────────────────────────────────────────────────
// JOHN 1:38 [P119]
{
  const { fp, data } = readVerse('john', 1, 38);
  let changed = 0;

  // r21 (index 20): "μεθερμηνευομενον" → "διδασκαλε"
  const r21 = data.rows[20];
  if (r21.papyrus?.type === 'extant' && r21.papyrus.text === 'μεθερμηνευομενον') {
    r21.papyrus.text = 'διδασκαλε';
    changed++;
    log(`  r21: "μεθερμηνευομενον" → "διδασκαλε" (P119 INTF word 1)`);
  } else {
    log(`  SKIP r21: expected "μεθερμηνευομενον" but got "${r21.papyrus?.text}"`);
  }

  // r22 (index 21): "διδασκαλε" → "που"
  const r22 = data.rows[21];
  if (r22.papyrus?.type === 'extant' && r22.papyrus.text === 'διδασκαλε') {
    r22.papyrus.text = 'που';
    changed++;
    log(`  r22: "διδασκαλε" → "που" (P119 INTF word 2)`);
  } else {
    log(`  SKIP r22: expected "διδασκαλε" but got "${r22.papyrus?.text}"`);
  }

  // r23 (index 22): "που" → "μενεισ"
  const r23 = data.rows[22];
  if (r23.papyrus?.type === 'extant' && r23.papyrus.text === 'που') {
    r23.papyrus.text = 'μενεισ';
    changed++;
    log(`  r23: "που" → "μενεισ" (P119 INTF word 3; P119 → OK)`);
  } else {
    log(`  SKIP r23: expected "που" but got "${r23.papyrus?.text}"`);
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/1/38: ${changed} changes`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
