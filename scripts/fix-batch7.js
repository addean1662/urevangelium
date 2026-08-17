'use strict';
// Batch 7 fixes: john/12/18 [P128+P66+P75] and john/10/25 [P45].
//
// john/12/18 [P128+P66+P75]:
//   P128 INTF (5 words): δια τουτο και υπηντησεν αυτω
//   P66  INTF (14 words): δια τουτο και υπηντησεν αυτω ο οχλος οτι ηκουσαν
//                         αυτον τουτο πεποιηκεναι το σημιον
//   P75  INTF (13 words): δια τουτο υπηντησεν αυτω ο οχλος οτι ηκουσαν
//                         τουτο αυτον πεποιηκεναι το σημειον
//   Current: texts r3-r13 displaced by 1 row; P75 wrongly at r3;
//            r10 text="τουτο" and r14 text="σημειον.¶" already correct.
//   Fix:
//     r3:  fragments=[P66,P128] (remove P75 — P75 skips "και"), text="και"
//     r4:  [P128,P66,P75], text="υπηντησεν"
//     r5:  [P128,P66,P75], text="αυτω"
//     r6:  [P66,P75], text="ο"    (P128 ends at r5; P66+P75 only from here)
//     r7:  [P66,P75], text="οχλος"
//     r8:  [P66,P75], text="οτι"
//     r9:  [P66,P75], text="ηκουσαν"
//     r10: NO CHANGE ("τουτο" already P75/Vat order; P66 word-order anomaly accepted)
//     r11: [P66,P75], text="αυτον"
//     r12: [P66,P75], text="πεποιηκεναι"
//     r13: [P66,P75], text="το"
//     r14: NO CHANGE ("σημειον.¶" P75 form already stored)
//   Result: P128→OK (5/5); P66→PARTIAL_MATCH(9, r1-r9); P75→OK (13/13)
//   Note: P66 word-order anomaly at r10-r11 ("αυτον τουτο" vs P75/Vat "τουτο αυτον");
//         P75/Vat order used at shared rows; P66 PARTIAL_MATCH is expected.
//   Note: P66 uses "σημιον" vs P75/stored "σημειον" — irresolvable spelling variant;
//         P75 form kept; P66 mismatches only r10-r11 and r14.
//
// john/10/25 [P45]:
//   P45 INTF (5 words): και απεκριθη αυτοις ο ιη
//   Current: r3 text="ο" (article) — matches P66 INTF[1] but not P45 INTF[2]="αυτοις"
//   Fix: r3 text "ο" → "αυτοισ"  (P45 and P75 both have "αυτοις" at this position)
//   Result: P45 gets 3-word run "και απεκριθη αυτοισ" → PARTIAL_MATCH (removed from MISMATCH)
//           P66 best run shifts to 9-word "τα εργα α εγω ποιω εν τω ονοματι" run
//           P75 best run decreases by 1 word but stays PARTIAL_MATCH
//
// Run: node scripts/fix-batch7.js [--apply]

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
// JOHN 12:18 [P128+P66+P75]
{
  const { fp, data } = readVerse('john', 12, 18);

  const P128 = { id: 'P128', date: 'c. 3rd–4th c. CE' };
  const P66  = { id: 'P66',  date: 'c. 175–225 CE' };
  const P75  = { id: 'P75',  date: 'c. 175–225 CE' };

  let changed = 0;

  // r3 (index 2): remove P75; text="και" (P66+P128 have "και"; P75 skips it)
  if (removeFragId(data.rows[2], 'P75')) {
    changed++;
    log(`  r3: removed P75 from fragments`);
  } else {
    log(`  WARN r3: P75 not found`);
  }
  data.rows[2].papyrus.text = 'και';
  changed++;
  log(`  r3: text → "και"`);

  // r4 (index 3): P128+P66+P75, text="υπηντησεν"
  data.rows[3].papyrus = makeExtant([P128, P66, P75], 'υπηντησεν', gloss(data.rows[3]));
  changed++;
  log(`  r4: [P128,P66,P75] "υπηντησεν"`);

  // r5 (index 4): P128+P66+P75, text="αυτω" (P128's last word)
  data.rows[4].papyrus = makeExtant([P128, P66, P75], 'αυτω', gloss(data.rows[4]));
  changed++;
  log(`  r5: [P128,P66,P75] "αυτω"`);

  // r6 (index 5): P66+P75 only (P128 ends at r5), text="ο"
  data.rows[5].papyrus = makeExtant([P66, P75], 'ο', gloss(data.rows[5]));
  changed++;
  log(`  r6: [P66,P75] "ο"`);

  // r7 (index 6): P66+P75, text="οχλος"
  data.rows[6].papyrus = makeExtant([P66, P75], 'οχλος', gloss(data.rows[6]));
  changed++;
  log(`  r7: [P66,P75] "οχλος"`);

  // r8 (index 7): P66+P75, text="οτι"
  data.rows[7].papyrus = makeExtant([P66, P75], 'οτι', gloss(data.rows[7]));
  changed++;
  log(`  r8: [P66,P75] "οτι"`);

  // r9 (index 8): P66+P75, text="ηκουσαν"
  data.rows[8].papyrus = makeExtant([P66, P75], 'ηκουσαν', gloss(data.rows[8]));
  changed++;
  log(`  r9: [P66,P75] "ηκουσαν"`);

  // r10 (index 9): NO CHANGE — already [P66,P75] text="τουτο" (P75/Vat order)
  log(`  r10: NO CHANGE (text="τουτο", P75/Vat order; P66 word-order anomaly)`);

  // r11 (index 10): P66+P75, text="αυτον"
  data.rows[10].papyrus = makeExtant([P66, P75], 'αυτον', gloss(data.rows[10]));
  changed++;
  log(`  r11: [P66,P75] "αυτον"`);

  // r12 (index 11): P66+P75, text="πεποιηκεναι"
  data.rows[11].papyrus = makeExtant([P66, P75], 'πεποιηκεναι', gloss(data.rows[11]));
  changed++;
  log(`  r12: [P66,P75] "πεποιηκεναι"`);

  // r13 (index 12): P66+P75, text="το"
  data.rows[12].papyrus = makeExtant([P66, P75], 'το', gloss(data.rows[12]));
  changed++;
  log(`  r13: [P66,P75] "το"`);

  // r14 (index 13): NO CHANGE — already [P66,P75] text="σημειον.¶" (P75 form)
  log(`  r14: NO CHANGE (text="σημειον.¶", P75 form; P66 uses "σημιον" — spelling variant)`);

  log(`${DRY ? 'WOULD' : 'DID'} john/12/18: ${changed} changes (r3 P75 removed + text fixed; r4-r9 reconstructed; r11-r13 fixed)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 10:25 [P45]
// P45 INTF[2]="αυτοις" should appear at r3, but r3 currently stores "ο" (article).
// Changing r3 text to "αυτοισ" gives P45 a 3-word run: "και απεκριθη αυτοισ".
{
  const { fp, data } = readVerse('john', 10, 25);

  let changed = 0;

  // r3 (index 2): text "ο" → "αυτοισ"
  {
    const row = data.rows[2];
    if (row.papyrus?.type === 'extant' && row.papyrus.text === 'ο') {
      row.papyrus.text = 'αυτοισ';
      changed++;
      log(`  r3: "ο" → "αυτοισ" (P45+P75 INTF have "αυτοις" here)`);
    } else {
      log(`  SKIP r3: expected "ο" but got "${row.papyrus?.text}"`);
    }
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/10/25: ${changed} changes (r3 text fixed for P45)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
