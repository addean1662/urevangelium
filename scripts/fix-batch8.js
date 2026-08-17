'use strict';
// Batch 8 fixes: matthew/1/9 [P1], john/13/15 [P93], john/17/8 [P84].
//
// matthew/1/9 [P1]:
//   P1 INTF (3 words): οζειας δε εγεννησεν
//   Current: r3 text="εγεννησε" (missing ν-movable); INTF has "εγεννησεν"
//   Fix: r3 text "εγεννησε" → "εγεννησεν"
//   Result: P1 → OVER_EXTENDED (INTF 3-word sequence found at start of stored data)
//
// john/13/15 [P93]:
//   P93 INTF (3 words): και υμεις ποιητε
//   P66 INTF (12 words): ... και υμεις ποιηται  (P66 reads "ποιηται")
//   Current: r12 text="ποιηται" (P66+P93 shared row) — matches P66 but not P93
//   Fix: r12 text "ποιηται" → "ποιητε"
//   Result: P93 → OK (3/3); P66 drops from OK to PARTIAL_MATCH(11) (breaks only at r12)
//   Note: "ποιητε" (2nd person plural) is the Vaticanus/majority form; P66's "ποιηται"
//         (3rd person singular) is the minority reading; choosing majority form.
//
// john/17/8 [P84]:
//   P84 INTF (4 words): οτι τα ρημα τα  (P84 writes ρήματά as two tokens: "ρημα" + "τα")
//   P60 INTF (24 words): οτι τα ρειματα α εδωκας ...  (P60 writes it as one word)
//   Current: r3 text="ρηματα", r4 text="α" — matches neither P84 ("ρημα"+"τα") nor P60 fully
//   Fix: r3 text "ρηματα" → "ρημα"; r4 text "α" → "τα"
//   Result: P84 → OK (4/4); P60 stays PARTIAL_MATCH (drops from run=6 to run=5, starting r5)
//
// NOTE: verify-papyrus-intf.js NS table also updated (batch 8 companion):
//   'πρ':'πατηρ', 'ανοι':'ανθρωποι', 'σναι':'σταυρωθηναι'
//   These affect: matthew/26/2 P73 (σναι fix → DISPLACEMENT), luke 6:36 P75 (πρ fix)
//
// Run: node scripts/fix-batch8.js [--apply]

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
// MATTHEW 1:9 [P1]
{
  const { fp, data } = readVerse('matthew', 1, 9);
  let changed = 0;

  const row = data.rows[2]; // r3 (0-indexed)
  if (row.papyrus?.type === 'extant' && row.papyrus.text === 'εγεννησε') {
    row.papyrus.text = 'εγεννησεν';
    changed++;
    log(`  r3: "εγεννησε" → "εγεννησεν" (P1 INTF ν-movable form)`);
  } else {
    log(`  SKIP r3: expected "εγεννησε" but got "${row.papyrus?.text}"`);
  }

  log(`${DRY ? 'WOULD' : 'DID'} matthew/1/9: ${changed} changes`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 13:15 [P93]
{
  const { fp, data } = readVerse('john', 13, 15);
  let changed = 0;

  const row = data.rows[11]; // r12 (0-indexed)
  if (row.papyrus?.type === 'extant' && row.papyrus.text === 'ποιηται') {
    row.papyrus.text = 'ποιητε';
    changed++;
    log(`  r12: "ποιηται" → "ποιητε" (P93 majority/Vaticanus form; P66 PARTIAL_MATCH(11) accepted)`);
  } else {
    log(`  SKIP r12: expected "ποιηται" but got "${row.papyrus?.text}"`);
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/13/15: ${changed} changes`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 17:8 [P84]
{
  const { fp, data } = readVerse('john', 17, 8);
  let changed = 0;

  // r3 (index 2): "ρηματα" → "ρημα" (P84 writes ρήματά as two tokens)
  const r3 = data.rows[2];
  if (r3.papyrus?.type === 'extant' && r3.papyrus.text === 'ρηματα') {
    r3.papyrus.text = 'ρημα';
    changed++;
    log(`  r3: "ρηματα" → "ρημα" (P84 INTF first token of ρήματά)`);
  } else {
    log(`  SKIP r3: expected "ρηματα" but got "${r3.papyrus?.text}"`);
  }

  // r4 (index 3): "α" → "τα" (P84 INTF second token: "τα")
  const r4 = data.rows[3];
  if (r4.papyrus?.type === 'extant' && r4.papyrus.text === 'α') {
    r4.papyrus.text = 'τα';
    changed++;
    log(`  r4: "α" → "τα" (P84 INTF second token of ρήματά)`);
  } else {
    log(`  SKIP r4: expected "α" but got "${r4.papyrus?.text}"`);
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/17/8: ${changed} changes`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
