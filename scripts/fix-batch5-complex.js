'use strict';
// Complex verse reconstructions (batch 5).
//
// john/19/16 [P60+P66]:
//   Both papyri have a different reading for the second clause:
//   P66 INTF (12 words): τοτε ουν παρεδωκεν αυτον αυτοις ινα στρθη | οι δε παραλαβοντες αυτον απηγαγον
//   P60 INTF  (6 words): οι δε παραλαβοντες τον ιν απηγαγον
//   Vaticanus: τοτε ουν παρεδωκεν αυτον αυτοις ινα σταυρωθη | παρελαβον ουν τον ιησουν και απηγαγον
//   Current data: 2-row displacement; P60 wrongly covers r1-r7.
//   Fix:
//     r1-r7: P66 only (remove P60); r7 text "σθη" → "στρθη" (P66 INTF abbrev.)
//     r8: P60+P66, text="οι"
//     r9: P60+P66, text="δε"
//     r10: P60+P66, text="παραλαβοντεσ"
//     r11: P60+P66, text="τον"  (P60 "τον ιν"; P66 has "αυτον" — unavoidable shared-row conflict)
//     r12: P60 only, text="ιν"  (P60's accusative "τον ιν"; P66 skips this row)
//     r13: P60+P66, text="απηγαγον·"
//
// john/21/13 [P59+P122]:
//   Both skip Vaticanus "ουν" (r2) and "ο" (r3).
//   P122 INTF (13 words): ερχεται ιης και λαμβανει τον αρτον και διδωσιν αυτοις και το οψαριον ομοιως
//   P59  INTF  (4 words): ερχεται ις και λαμβανει  [same as first 4 P122 words]
//   Current data: 2-row displacement; r2-r3 have papyrus instead of empty;
//                 r12-r13 empty but should have P122.
//   Fix:
//     r1:     P122+P59, text="ερχεται"  (already correct)
//     r2:     empty  (both skip Vaticanus "ουν")
//     r3:     empty  (both skip Vaticanus "ο")
//     r4:     P122+P59, text="ιης"
//     r5:     P122+P59, text="και"
//     r6:     P122+P59, text="λαμβανει"
//     r7:     P122 only, text="τον"
//     r8:     P122 only, text="αρτον"
//     r9:     P122 only, text="και"
//     r10:    P122 only, text="διδωσιν"
//     r11:    P122 only, text="αυτοισ"
//     r12:    P122 only, text="και"   (currently empty — add P122)
//     r13:    P122 only, text="το"    (currently empty — add P122)
//     r14:    P122 only, text="οψαριον"
//     r15:    P122 only, text="ομοιως."
//
// Run: node scripts/fix-batch5-complex.js [--apply]

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

function gloss(row) {
  return (row.vaticanus?.gloss) ? row.vaticanus.gloss : null;
}

function makeExtant(fragments, text, gl) {
  return { type: 'extant', fragments, text, ...(gl ? { gloss: gl } : {}) };
}

function removeFragId(row, fragId) {
  if (!row?.papyrus || row.papyrus.type !== 'extant') return false;
  const before = row.papyrus.fragments.length;
  row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== fragId);
  if (row.papyrus.fragments.length < before) {
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// JOHN 19:16 [P60+P66]
{
  const { fp, data } = readVerse('john', 19, 16);

  const P60 = { id: 'P60', date: 'c. 7th c. CE' };
  const P66 = { id: 'P66', date: 'c. 175–225 CE' };

  let changed = 0;

  // r1-r7 (indices 0-6): Remove P60; keep P66 only
  // r7 (index 6): fix text "σθη" → "στρθη" (P66 INTF abbreviated "σταυρωθη")
  for (let i = 0; i <= 6; i++) {
    if (removeFragId(data.rows[i], 'P60')) changed++;
  }
  {
    const row = data.rows[6]; // r7
    if (row.papyrus?.type === 'extant' && row.papyrus.text === 'σθη') {
      row.papyrus.text = 'στρθη';
      log(`  r7: text "σθη" → "στρθη" (P66 INTF abbreviated σταυρωθη)`);
      changed++;
    } else {
      log(`  SKIP r7: expected "σθη" but got "${row.papyrus?.text}"`);
    }
  }

  // r8-r13 (indices 7-12): reconstruct P60+P66 reading
  // r8: P60+P66, text="οι"
  data.rows[7].papyrus = makeExtant([P60, P66], 'οι', gloss(data.rows[7]));
  changed++;

  // r9: P60+P66, text="δε"
  data.rows[8].papyrus = makeExtant([P60, P66], 'δε', gloss(data.rows[8]));
  changed++;

  // r10: P60+P66, text="παραλαβοντεσ"
  data.rows[9].papyrus = makeExtant([P60, P66], 'παραλαβοντεσ', gloss(data.rows[9]));
  changed++;

  // r11: P60+P66, text="τον" (P60 INTF "τον"; P66 INTF "αυτον" — unavoidable conflict)
  data.rows[10].papyrus = makeExtant([P60, P66], 'τον', gloss(data.rows[10]));
  changed++;

  // r12: P60 only, text="ιν" (P60 INTF "ιν"; P66 does not cover this row)
  data.rows[11].papyrus = makeExtant([P60], 'ιν', gloss(data.rows[11]));
  changed++;

  // r13: P60+P66, text="απηγαγον·"
  data.rows[12].papyrus = makeExtant([P60, P66], 'απηγαγον·', gloss(data.rows[12]));
  changed++;

  log(`${DRY ? 'WOULD' : 'DID'} john/19/16: ${changed} changes (P60 removed from r1-r7; r7 text fixed; r8-r13 reconstructed)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 21:13 [P59+P122]
{
  const { fp, data } = readVerse('john', 21, 13);

  const P59  = { id: 'P59',  date: 'c. 3rd–4th c. CE' };
  const P122 = { id: 'P122', date: 'c. 3rd–4th c. CE' };

  let changed = 0;

  // r1 (index 0): already correct "ερχεται" with P122+P59 — verify and leave
  // (no change needed)

  // r2 (index 1): set to empty — both skip Vaticanus "ουν"
  if (data.rows[1].papyrus?.type === 'extant') {
    data.rows[1].papyrus = { type: 'empty' };
    changed++;
    log(`  r2: extant → empty (both skip "ουν")`);
  }

  // r3 (index 2): set to empty — both skip Vaticanus "ο"
  if (data.rows[2].papyrus?.type === 'extant') {
    data.rows[2].papyrus = { type: 'empty' };
    changed++;
    log(`  r3: extant → empty (both skip "ο")`);
  }

  // r4 (index 3): P122+P59, text="ιης" (P122 INTF "ιης"; P59 INTF "ις")
  data.rows[3].papyrus = makeExtant([P122, P59], 'ιης', gloss(data.rows[3]));
  changed++;

  // r5 (index 4): P122+P59, text="και"
  data.rows[4].papyrus = makeExtant([P122, P59], 'και', gloss(data.rows[4]));
  changed++;

  // r6 (index 5): P122+P59, text="λαμβανει"
  data.rows[5].papyrus = makeExtant([P122, P59], 'λαμβανει', gloss(data.rows[5]));
  changed++;

  // r7 (index 6): P122 only (P59 ends at 4 words), text="τον"
  data.rows[6].papyrus = makeExtant([P122], 'τον', gloss(data.rows[6]));
  changed++;

  // r8 (index 7): P122 only, text="αρτον"
  data.rows[7].papyrus = makeExtant([P122], 'αρτον', gloss(data.rows[7]));
  changed++;

  // r9 (index 8): P122 only, text="και"
  data.rows[8].papyrus = makeExtant([P122], 'και', gloss(data.rows[8]));
  changed++;

  // r10 (index 9): P122 only, text="διδωσιν"
  data.rows[9].papyrus = makeExtant([P122], 'διδωσιν', gloss(data.rows[9]));
  changed++;

  // r11 (index 10): P122 only, text="αυτοισ"
  data.rows[10].papyrus = makeExtant([P122], 'αυτοισ', gloss(data.rows[10]));
  changed++;

  // r12 (index 11): currently empty — restore P122, text="και"
  data.rows[11].papyrus = makeExtant([P122], 'και', gloss(data.rows[11]));
  changed++;
  log(`  r12: empty → P122 extant "και"`);

  // r13 (index 12): currently empty — restore P122, text="το"
  data.rows[12].papyrus = makeExtant([P122], 'το', gloss(data.rows[12]));
  changed++;
  log(`  r13: empty → P122 extant "το"`);

  // r14 (index 13): P122 only (remove P59), text="οψαριον"
  data.rows[13].papyrus = makeExtant([P122], 'οψαριον', gloss(data.rows[13]));
  changed++;

  // r15 (index 14): P122 only (remove P59), text="ομοιως."
  data.rows[14].papyrus = makeExtant([P122], 'ομοιως.', gloss(data.rows[14]));
  changed++;

  log(`${DRY ? 'WOULD' : 'DID'} john/21/13: ${changed} changes (r2-r3 emptied; r4-r6 P122+P59; r7-r15 P122 only; r12-r13 restored)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
