'use strict';
// Fixes remaining MISMATCH verses (batch 4).
//
// Verses:
//  john/14/8  [P75]: INTF has 1 word "μιν" (partial "ἡμῖν"); P75 over-extended to r1-r11.
//                    Keep P75 at r6 only (first "ἡμῖν"); remove from r1-r5 and r7-r11.
//  john/16/2  [P22+P66]: P22 INTF has 10 words → r1-r10 (currently lost + over-extended at r15-r16).
//                        P66 INTF has 3 words → r14-r16 (currently only at r15-r16, missing r14).
//  john/16/31 [P66]: r3 text "ιησ" → "ις" (P66 uses 2-letter nomina sacra ΙΣ per INTF).
//  john/17/20 [P60]: P60 INTF has 9 words → r1-r9; currently only at r9-r17.
//                    Restore P60 to r1-r8; remove P60 from r10-r17.
//  john/19/1  [P90]: Text rotation at r3-r5 and P90 at r8 (lacks Vat "καὶ").
//                    Fix r3 "ο"→"λαβων", r4 "πειλατοσ"→"ο", r5 "ελαβεν"→"πειλατοσ";
//                    remove P90 from r8.
//
// Run: node scripts/fix-mismatch-batch4.js [--apply]

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
  return (row.vaticanus && row.vaticanus.gloss) ? row.vaticanus.gloss : null;
}

function makeExtant(fragments, text, gl) {
  return { type: 'extant', fragments, text, ...(gl ? { gloss: gl } : {}) };
}

function removeFragId(row, fragId) {
  if (!row || !row.papyrus || row.papyrus.type !== 'extant') return false;
  const before = row.papyrus.fragments.length;
  row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== fragId);
  if (row.papyrus.fragments.length < before) {
    if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// JOHN 14:8 [P75] — "μιν" = partial end of "ἡμῖν" at r6
// Remove P75 from r1-r5 (indices 0-4) and r7-r11 (indices 6-10)
{
  const { fp, data } = readVerse('john', 14, 8);
  let removed = 0;
  for (let i = 0; i < data.rows.length; i++) {
    if (i === 5) continue; // keep r6 (index 5)
    if (removeFragId(data.rows[i], 'P75')) removed++;
  }
  log(`${DRY ? 'WOULD' : 'DID'} john/14/8: removed P75 from ${removed} rows; keeps P75 at r6 only`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 16:2 [P22 + P66]
//
// P22 INTF (10 words → r1-r10): αποσυναγωγους,ποιησουσιν,υμας,αλλ,ερχεται,ωρα,ινα,πας,ο,αποκτεινας
// P66 INTF (3 words → r14-r16): προσφερειν,τω,θω
//
// Fixes:
//  1. Restore P22 to r1-r10 (currently lost)
//  2. Remove P22 from r15-r16 (P22 only covers 10 words ending at r10)
//  3. Add P66 to r14 (currently lost; P66 covers r14-r16 but was missing from r14)
{
  const { fp, data } = readVerse('john', 16, 2);

  const P22 = { id: 'P22', date: 'c. 250–300 CE' };
  const P66 = { id: 'P66', date: 'c. 175–225 CE' };

  const p22words = [
    'αποσυναγωγους','ποιησουσιν','υμας','αλλ','ερχεται',
    'ωρα','ινα','πας','ο','αποκτεινας',
  ];

  let changed = 0;

  // 1. Restore P22 to r1-r10 (indices 0-9)
  for (let i = 0; i < 10; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') { log(`WARN j16:2 r${i+1} not lost`); continue; }
    row.papyrus = makeExtant([P22], p22words[i], gloss(row));
    changed++;
  }

  // 2. Remove P22 from r15-r16 (indices 14-15)
  for (let i = 14; i <= 15; i++) {
    if (removeFragId(data.rows[i], 'P22')) changed++;
  }

  // 3. Add P66 to r14 (index 13) with text "προσφερειν"
  {
    const row = data.rows[13];
    if (row.papyrus.type === 'lost') {
      row.papyrus = makeExtant([P66], 'προσφερειν', gloss(row));
      changed++;
    }
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/16/2: ${changed} changes (P22 r1-r10 restored; P22 r15-r16 removed; P66 r14 added)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 16:31 [P66] — Fix r3 nomina sacra "ιησ" → "ις"
// INTF confirms P66 uses the 2-letter form ΙΣ for Jesus
{
  const { fp, data } = readVerse('john', 16, 31);
  const row = data.rows[2]; // r3 = index 2
  if (row.papyrus && row.papyrus.type === 'extant' && row.papyrus.text === 'ιησ') {
    row.papyrus.text = 'ις';
    log(`${DRY ? 'WOULD' : 'DID'} john/16/31: r3 text "ιησ" → "ις" (P66 2-letter nomina sacra)`);
  } else {
    log(`SKIP john/16/31 r3: unexpected text "${row.papyrus && row.papyrus.text}"`);
  }
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 17:20 [P60] — Restore P60 to r1-r8; remove from r10-r17
//
// P60 INTF (9 words → r1-r9): ου,περι,τουτων,δε,ερωτω,μονον,αλλα,και,περι
// P66 INTF (9 words → r9-r17): περι,των,πιστευοντων,δια,του,λογου,αυτων,εις,εμε
// Both share r9 "περι". P60 should NOT extend to r10-r17.
{
  const { fp, data } = readVerse('john', 17, 20);

  const P60 = { id: 'P60', date: 'c. 7th c. CE' };

  const p60words = ['ου','περι','τουτων','δε','ερωτω','μονον','αλλα','και'];

  let changed = 0;

  // Restore P60 to r1-r8 (indices 0-7; currently all lost)
  for (let i = 0; i < 8; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') { log(`WARN j17:20 r${i+1} not lost`); continue; }
    row.papyrus = makeExtant([P60], p60words[i], gloss(row));
    changed++;
  }

  // Remove P60 from r10-r17 (indices 9-16)
  for (let i = 9; i <= 16; i++) {
    if (removeFragId(data.rows[i], 'P60')) changed++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/17/20: ${changed} changes (P60 r1-r8 restored; P60 r10-r17 removed)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 19:1 [P90] — Fix text rotation at r3-r5; remove P90 from r8
//
// P90 INTF: τοτε,ουν,λαβων,ο,πειλατος,τον,ιν,εμαστιγωσεν (lacks Vat "καὶ" at r8)
// Current broken: r3="ο" r4="πειλατοσ" r5="ελαβεν" (3-way rotation)
// Correct:        r3="λαβων" r4="ο" r5="πειλατοσ"
// Note: r3 uses P90's participial variant "λαβων" (vs Vat/P66 "ελαβεν"); shared row limitation.
{
  const { fp, data } = readVerse('john', 19, 1);

  let changed = 0;

  // Fix rotation at r3-r5 (indices 2-4)
  const rotationFixes = [
    [2, 'ο',           'λαβων'],     // r3: P90 variant (Vat "ελαβεν")
    [3, 'πειλατοσ',   'ο'],         // r4: Vat "ὁ"
    [4, 'ελαβεν',     'πειλατοσ'],  // r5: Vat "Πιλᾶτος"
  ];
  for (const [idx, from, to] of rotationFixes) {
    const row = data.rows[idx];
    if (row.papyrus && row.papyrus.type === 'extant' && row.papyrus.text === from) {
      log(`  r${idx+1}: "${from}" → "${to}"`);
      row.papyrus.text = to;
      changed++;
    } else {
      log(`  SKIP r${idx+1}: expected "${from}" but found "${row.papyrus && row.papyrus.text}"`);
    }
  }

  // Remove P90 from r8 (index 7) — P90 lacks Vat "καὶ"
  if (removeFragId(data.rows[7], 'P90')) {
    changed++;
    log(`  r8: removed P90 (P90 lacks Vat "καὶ")`);
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/19/1: ${changed} changes (r3-r5 rotation fixed; P90 removed from r8)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
