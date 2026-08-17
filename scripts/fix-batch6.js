'use strict';
// Batch 6 fixes: mark/6/39 [P84+P45] and matthew/26/7 [P45].
//
// mark/6/39 [P84+P45]:
//   P45 INTF (9 words): και επεταξεν αυτοις ανακλιναι συμποσια συμποσια επι χλωρωι χορτωι
//   P84 INTF (5 words): συμποσια επι τω χλωρω χορτω
//   Vaticanus (11 rows): και επεταξεν αυτοις ανακλιναι | παντας | συμποσια συμποσια επι τω χλωρω χορτω
//   Current: P45+P84 on all 11 rows; texts at r5-r11 are wrong (shifted/misaligned).
//   P45 skips Vat "παντας" (r5) and "τω" (r9); P84 starts at Vat r7 (2nd συμποσια).
//   Fix:
//     r1-r4: P45 only (remove P84); texts unchanged (και,επεταξεν,αυτοισ,ανακλιναι)
//     r5:    empty  (P45 skips Vat "παντας"; P84 not in coverage)
//     r6:    P45 only, text="συμποσια"  (P45 1st συμποσια; remove P84)
//     r7:    P45+P84, text="συμποσια"  (P45 2nd / P84 1st)
//     r8:    P45+P84, text="επι"
//     r9:    P84 only, text="τω"  (P45 skips Vat "τω"; P84 has it)
//     r10:   P45+P84, text="χλωρωι"  (P45 dative form; P84 INTF "χλωρω" — P45 form used)
//     r11:   P45+P84, text="χορτωι."  (P45 dative form; P84 INTF "χορτω" — P45 form used)
//   Note: r10-r11 shared-row conflict (P45 dative "χλωρωι/χορτωι" vs P84 "χλωρω/χορτω");
//         P45 forms used since they match Vaticanus declension; P84 will remain PARTIAL_MATCH.
//
// matthew/26/7 [P45]:
//   P45 INTF (14 words): προσηλθεν αυτωι γυνη αλαβαστρον εχουσα μυρου βαρυτιμου
//                        και κατεχεεν επι την κεφαλην αυτου ανακειμενου
//   P64+P67 INTF (3 words at r12-r14): κεφαλης αυτου ανακειμενου
//   Current: r1-r9 type=lost (fragments wrongly carry P45+P64+P67); r10-r11 P45 extant;
//            r12-r14 P45+P64+P67 extant.  r11 text "τησ" but P45 INTF has "την".
//   P45 has reversed word order at r4-r5 vs Vaticanus ("αλαβαστρον εχουσα" not "εχουσα αλαβαστρον").
//   P45 uses accusative "την κεφαλην" (r11-r12) vs Vaticanus genitive "τησ κεφαλησ".
//   Fix:
//     r1-r9: change lost→extant for P45 only (remove P64+P67 from these rows)
//     r11:   P45 text "τησ" → "την"
//     r12:   keep text "κεφαλησ" (P64+P67 INTF form; avoids breaking P64+P67's OK status)
//   Result: P45 matches r1-r11 (11 contiguous) → PARTIAL_MATCH; P64+P67 remains OK.
//
// Run: node scripts/fix-batch6.js [--apply]

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
// MARK 6:39 [P84+P45]
{
  const { fp, data } = readVerse('mark', 6, 39);

  const P45 = { id: 'P45', date: 'c. 200–250 CE' };
  const P84 = { id: 'P84', date: 'c. 5th–6th c. CE' };

  let changed = 0;

  // r1-r4 (indices 0-3): Remove P84, keep P45 only; texts unchanged
  for (let i = 0; i <= 3; i++) {
    if (removeFragId(data.rows[i], 'P84')) changed++;
  }

  // r5 (index 4): set to empty — P45 skips Vat "παντας"; P84 doesn't reach here
  data.rows[4].papyrus = { type: 'empty' };
  changed++;
  log(`  r5: set to empty (P45 skips "παντας")`);

  // r6 (index 5): P45 only, text="συμποσια" (1st; remove P84)
  if (removeFragId(data.rows[5], 'P84')) {
    changed++;
  } else {
    log(`  WARN r6: P84 not found in fragments`);
  }
  // text is already "συμποσια" — verify
  if (data.rows[5].papyrus?.type === 'extant' && data.rows[5].papyrus.text !== 'συμποσια') {
    log(`  WARN r6: unexpected text "${data.rows[5].papyrus.text}"`);
  }

  // r7 (index 6): P45+P84, text="συμποσια" (P45 2nd / P84 1st)
  data.rows[6].papyrus = makeExtant([P45, P84], 'συμποσια', gloss(data.rows[6]));
  changed++;
  log(`  r7: P45+P84 "συμποσια" (was "επι")`);

  // r8 (index 7): P45+P84, text="επι"
  data.rows[7].papyrus = makeExtant([P45, P84], 'επι', gloss(data.rows[7]));
  changed++;
  log(`  r8: P45+P84 "επι" (was "χλωρωι")`);

  // r9 (index 8): P84 only, text="τω" (P45 skips Vat "τω")
  data.rows[8].papyrus = makeExtant([P84], 'τω', gloss(data.rows[8]));
  changed++;
  log(`  r9: P84 only "τω" (P45 skips; was P45+P84 "χορτωι")`);

  // r10 (index 9): P45+P84, text="χλωρωι" (P45 dative form; P84 INTF "χλωρω")
  data.rows[9].papyrus = makeExtant([P45, P84], 'χλωρωι', gloss(data.rows[9]));
  changed++;
  log(`  r10: P45+P84 "χλωρωι" (was "χλωρω")`);

  // r11 (index 10): P45+P84, text="χορτωι." (P45 dative form; P84 INTF "χορτω")
  data.rows[10].papyrus = makeExtant([P45, P84], 'χορτωι.', gloss(data.rows[10]));
  changed++;
  log(`  r11: P45+P84 "χορτωι." (was "χορτω.")`);

  log(`${DRY ? 'WOULD' : 'DID'} mark/6/39: ${changed} changes`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// MATTHEW 26:7 [P45]
// P45 INTF (14 words) — r1-r9 currently lost; r11 text wrong
{
  const { fp, data } = readVerse('matthew', 26, 7);

  const P45 = { id: 'P45', date: 'c. 200–250 CE' };

  let changed = 0;

  // P45 words for r1-r9 (P45 reverses word order at r4-r5 vs Vaticanus)
  const p45words = [
    'προσηλθεν',   // r1 = Vat "προσῆλθεν"
    'αυτωι',       // r2 = Vat "αὐτῷ"
    'γυνη',        // r3 = Vat "γυνὴ"
    'αλαβαστρον',  // r4 = Vat "ἔχουσα" — P45 reversed: αλαβαστρον before εχουσα
    'εχουσα',      // r5 = Vat "ἀλάβαστρον" — P45 reversed
    'μυρου',       // r6 = Vat "μύρου"
    'βαρυτιμου',   // r7 = Vat "βαρυτίμου"
    'και',         // r8 = Vat "καὶ"
    'κατεχεεν',    // r9 = Vat "κατέχεεν"
  ];

  // r1-r9 (indices 0-8): change lost→extant for P45 only (drop P64+P67 from these rows)
  for (let i = 0; i < 9; i++) {
    const row = data.rows[i];
    // These rows have type=lost but fragments array — replace with P45-only extant
    row.papyrus = makeExtant([P45], p45words[i], gloss(row));
    changed++;
  }
  log(`  r1-r9: lost → P45 extant with INTF words`);

  // r11 (index 10): P45 only — fix "τησ" → "την" (P45 INTF accusative form)
  {
    const row = data.rows[10];
    if (row.papyrus?.type === 'extant' && row.papyrus.text === 'τησ') {
      row.papyrus.text = 'την';
      changed++;
      log(`  r11: "τησ" → "την" (P45 accusative form)`);
    } else {
      log(`  SKIP r11: expected "τησ" but got "${row.papyrus?.text}"`);
    }
  }

  // r12 (index 11): keep "κεφαλησ" — P64+P67 INTF has "κεφαλης" (genitive); P45 INTF has "κεφαλην"
  // Irresolvable shared-row conflict; keep P64+P67 form to preserve P64+P67 OK status.
  log(`  r12: keeping "κεφαλησ" (P64+P67 form; P45 INTF "κεφαλην" — shared-row conflict)`);

  log(`${DRY ? 'WOULD' : 'DID'} matthew/26/7: ${changed} changes (r1-r9 restored for P45; r11 text fixed)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
