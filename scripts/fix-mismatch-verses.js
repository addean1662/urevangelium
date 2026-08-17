'use strict';
// Fixes specific MISMATCH verses identified during QA inspection.
// All fixes are verified against INTF VMR cache data.
//
// Verses:
//  luke/22/43  — P69/P75 skip this passage; set papyrus to lost
//  luke/22/44  — P69/P75 skip this passage; set papyrus to lost
//  luke/2/32   — rebuild per INTF: P141 starts at r2, P42 covers r1-r3
//  luke/3/20   — fix 1-row displacement of P75; fix P4 coverage
//
// Run: node scripts/fix-mismatch-verses.js [--apply]

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
// Luke 22:43 and 22:44 — Neither P69 nor P75 attests these verses.
// P75 cache B03K22V43 returns Luke 22:45 content (P75 skips 43-44).
// P69 cache has no keys for V43 or V44.
// These are the doubly-bracketed agony/angel verses absent from early papyri.

for (const verse of [43, 44]) {
  const { fp, data } = readVerse('luke', 22, verse);
  let count = 0;
  for (const row of data.rows) {
    if (row.papyrus && row.papyrus.type !== 'lost') {
      row.papyrus = { type: 'lost' };
      count++;
    }
  }
  log(`${DRY ? 'WOULD' : 'DID'} set luke/22/${verse} all ${count} rows → papyrus lost (P69/P75 skip this verse)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// Luke 2:32 — Rebuild from INTF
// Vat (9 rows): φως(r1) εις(r2) αποκαλυψιν(r3) εθνων(r4) και(r5) δοξαν(r6)
//               λαου(r7) σου(r8) ισραηλ(r9)
// P141 INTF (8 words): εις αποκαλυψιν εθνων και δοξαν λαου σου ισραηλ → r2-r9
// P42  INTF (3 words): φως εις αποκαλυψιν                              → r1-r3
{
  const { fp, data } = readVerse('luke', 2, 32);

  const P141 = { id: 'P141', date: 'c. 4th–5th c. CE' };
  const P42  = { id: 'P42',  date: 'c. 7th c. CE' };

  // P141 INTF words (0-indexed → r2-r9)
  const p141words = ['εις','αποκαλυψιν','εθνων','και','δοξαν','λαου','σου','ισραηλ'];
  // P42 INTF words (0-indexed → r1-r3)
  const p42words  = ['φως','εις','αποκαλυψιν'];

  // Per-row plan:
  // r1 (idx 0): P42 only, "φως"
  // r2 (idx 1): P141+P42, "εις"
  // r3 (idx 2): P141+P42, "αποκαλυψιν"
  // r4 (idx 3): P141 only, "εθνων"
  // r5 (idx 4): P141 only, "και"
  // r6 (idx 5): P141 only, "δοξαν"
  // r7 (idx 6): P141 only, "λαου"
  // r8 (idx 7): P141 only, "σου"
  // r9 (idx 8): P141 only, "ισραηλ"

  const plan = [
    { frags: [P42],        text: p42words[0]  },  // r1
    { frags: [P141, P42],  text: p141words[0] },  // r2
    { frags: [P141, P42],  text: p141words[1] },  // r3
    { frags: [P141],       text: p141words[2] },  // r4
    { frags: [P141],       text: p141words[3] },  // r5
    { frags: [P141],       text: p141words[4] },  // r6
    { frags: [P141],       text: p141words[5] },  // r7
    { frags: [P141],       text: p141words[6] },  // r8
    { frags: [P141],       text: p141words[7] },  // r9
  ];

  for (let i = 0; i < plan.length; i++) {
    const row = data.rows[i];
    const { frags, text } = plan[i];
    const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
    row.papyrus = { type: 'extant', fragments: frags, text, gloss };
  }

  log(`${DRY ? 'WOULD' : 'DID'} rebuild luke/2/32 papyrus (9 rows) from P141/P42 INTF data`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// Luke 3:20 — Fix P75 displacement and P4 coverage
// Vat (12 rows): προσεθηκεν(r1) και(r2) τουτο(r3) επι(r4) πασιν(r5) και(r6)
//                κατεκλεισεν(r7) τον(r8) ιωαννην(r9) εν(r10) τη(r11) φυλακη.¶(r12)
//
// P75 INTF (10 words): προσεθηκεν και τουτο επι πασιν κατεκλεισεν τον ιωανην εν φυλακη
//   → covers r1-r5 and r7-r10 and r12 (lacks r6 "και" and r11 "τη")
//
// P4 INTF (4 words): προσεθηκεν και εν φυλακη
//   → covers r1-r2 and r10, r12 (lacuna r3-r9, r11)
{
  const { fp, data } = readVerse('luke', 3, 20);

  const P4  = { id: 'P4',  date: 'c. 150–200 CE' };
  const P75 = { id: 'P75', date: 'c. 175–225 CE' };

  // Per-row correct state (0-indexed):
  // r1  (idx 0): P4+P75, "προσεθηκεν"
  // r2  (idx 1): P4+P75, "και"
  // r3  (idx 2): P75 only, "τουτο"
  // r4  (idx 3): P75 only, "επι"
  // r5  (idx 4): P75 only, "πασιν"
  // r6  (idx 5): empty (P75 lacks Vat "και"; P4 doesn't cover here)
  // r7  (idx 6): P75 only, "κατεκλεισεν"
  // r8  (idx 7): P75 only, "τον"
  // r9  (idx 8): P75 only, "ιωανην"  (P75 spelling)
  // r10 (idx 9): P4+P75, "εν"
  // r11 (idx 10): empty (both P4 and P75 lack Vat "τη")
  // r12 (idx 11): P4+P75, "φυλακη"

  const plan = [
    { type: 'extant', frags: [P4, P75], text: 'προσεθηκεν' }, // r1
    { type: 'extant', frags: [P4, P75], text: 'και' },         // r2
    { type: 'extant', frags: [P75],     text: 'τουτο' },       // r3
    { type: 'extant', frags: [P75],     text: 'επι' },         // r4
    { type: 'extant', frags: [P75],     text: 'πασιν' },       // r5
    { type: 'empty' },                                         // r6
    { type: 'extant', frags: [P75],     text: 'κατεκλεισεν' }, // r7
    { type: 'extant', frags: [P75],     text: 'τον' },         // r8
    { type: 'extant', frags: [P75],     text: 'ιωανην' },      // r9
    { type: 'extant', frags: [P4, P75], text: 'εν' },          // r10
    { type: 'empty' },                                         // r11
    { type: 'extant', frags: [P4, P75], text: 'φυλακη' },      // r12 (end punct not in papyrus)
  ];

  for (let i = 0; i < plan.length; i++) {
    const row = data.rows[i];
    const p = plan[i];
    if (p.type === 'empty') {
      row.papyrus = { type: 'empty' };
    } else {
      const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
      row.papyrus = { type: 'extant', fragments: p.frags, text: p.text, gloss };
    }
  }

  // The last row "φυλακη" should end with paragraph mark per convention in other verses.
  // Keep as "φυλακη" (no period) since P75 INTF shows "φυλακη" without end punct.

  log(`${DRY ? 'WOULD' : 'DID'} fix luke/3/20 papyrus (12 rows): P75 displacement + P4 coverage`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
