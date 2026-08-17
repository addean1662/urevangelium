'use strict';
// Fixes complex displacement/restoration MISMATCH verses (batch 3).
//
// Verses:
//  luke/7/37  [P75] — P75 INTF covers r1-r10; data has P75 only at r18-r21 (wrong).
//                     P3 covers all 21 rows; also missing from r1-r17.
//                     Fix: restore P3 to r1-r17, restore P75 to r1-r10, remove P75 from r18-r21.
//  luke/11/12 [P45+P75] — P75 lacks Vat "εαν" (r3) and "μη" (r6); has "ωον" at r5 (not "αρτον").
//                         P45 has "εαν" at r3, lacks "μη" at r6; has "αρτον" at r5.
//                         Both displaced: r6-r8 text and fragment assignments are wrong.
//  john/10/9  [P44+P45+P6+P66+P75] — r1-r8 were set to lost by over-correction.
//                                     P6 incorrectly at r9-r11; P44 incorrectly at r11-r17.
//
// Run: node scripts/fix-mismatch-batch3.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const DATA  = path.join(ROOT, 'data');
const DRY   = !process.argv.includes('--apply');

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

// ─────────────────────────────────────────────────────────
// LUKE 7:37 — Restore P3 and P75 to correct rows
//
// P3  INTF (21 words, full verse): rows 1-21
// P75 INTF (10 words): ["και","ιδου","γυνη","ητις","ην","εν","τη","πολει","αμαρτωλος","και"]
//                      → rows 1-10 only
// P82 INTF (4 words): ["φαρισαιου","κομισασα","αλαβαστρον","μυρου"] → rows 18-21
//
// Current broken state: r1-r17 all lost; r18-r21 have P3+P75+P82 (P75 wrong here)
{
  const { fp, data } = readVerse('luke', 7, 37);

  const P3  = { id: 'P3',  date: 'c. 6th c. CE' };
  const P75 = { id: 'P75', date: 'c. 175–225 CE' };

  // P3 INTF words for rows 1-17 (0-indexed 0-16)
  const p3words = [
    'και','ειδου','γυνη','ητις','ην','εν','τη','πολει','αμαρτωλος','και',
    'επιγνουσα','οτι','κατακειται','εν','τη','οικια','του',
  ];

  // P75 INTF words for rows 1-10 (0-indexed 0-9)
  const p75words = ['και','ιδου','γυνη','ητις','ην','εν','τη','πολει','αμαρτωλος','και'];

  let changed = 0;

  // r1-r10: P3 + P75 (use P75 text, which agrees with P3 mostly; "ιδου" vs "ειδου" at r2)
  for (let i = 0; i < 10; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') { log(`WARN r${i+1} not lost: skipping`); continue; }
    row.papyrus = makeExtant([P3, P75], p75words[i], gloss(row));
    changed++;
  }

  // r11-r17: P3 only
  for (let i = 10; i <= 16; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') { log(`WARN r${i+1} not lost: skipping`); continue; }
    row.papyrus = makeExtant([P3], p3words[i], gloss(row));
    changed++;
  }

  // r18-r21: remove P75 (P75 only has 10 words; P3+P82 remain)
  let removedP75 = 0;
  for (let i = 17; i <= 20; i++) {
    const row = data.rows[i];
    if (!row || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P75');
    if (row.papyrus.fragments.length < before) removedP75++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} luke/7/37: restored ${changed} rows (r1-r17 P3+P75/P3); removed P75 from ${removedP75} tail rows`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 11:12 — Fix P45/P75 alignment
//
// Vaticanus: r1=ἢ r2=καὶ r3=ἐὰν r4=αἰτήσει r5=ᾠόν r6=μὴ r7=ἐπιδώσει r8=αὐτῷ r9=σκορπίον
//
// P45 INTF (8 words): η,και,εαν,αιτησει,αρτον,επιδωσει,αυτωι,σκορπιον
//   → r1,r2,r3(εαν✓),r4(αιτησει),r5(αρτον/variant),r6=empty,r7,r8,r9
//
// P75 INTF (7 words): η,και,αιτησει,ωον,επιδωσει,αυτω,σκορπιον
//   → r1,r2,r3=empty(P75 lacks εαν),r4(αιτησει),r5(ωον✓),r6=empty,r7,r8,r9
//
// Current broken state:
//   r3: P45+P75 "εαν" — P75 should NOT be here
//   r4: P45+P75 "αιτηση" — text should be "αιτησει"
//   r5: P45+P75 "αρτον" — text should be "ωον" (P75/Vat; shared row with P45 variant)
//   r6: P45+P75 "επιδωσει" — should be empty (both lack Vat "μη")
//   r7: P45+P75 "αυτωι" — text should be "επιδωσει"
//   r8: empty — should be P45+P75 "αυτω"
{
  const { fp, data } = readVerse('luke', 11, 12);

  const P45 = { id: 'P45', date: 'c. 200–250 CE' };
  const P75 = { id: 'P75', date: 'c. 175–225 CE' };

  let changed = 0;

  // r3 (idx 2): P45 only — P75 lacks Vat "εαν"
  {
    const row = data.rows[2];
    row.papyrus = makeExtant([P45], 'εαν', gloss(row));
    changed++;
  }

  // r4 (idx 3): P45+P75, fix text "αιτηση" → "αιτησει"
  {
    const row = data.rows[3];
    row.papyrus = makeExtant([P45, P75], 'αιτησει', gloss(row));
    changed++;
  }

  // r5 (idx 4): P45+P75, fix text "αρτον" → "ωον" (P75/Vat reading; P45 has variant "αρτον")
  {
    const row = data.rows[4];
    row.papyrus = makeExtant([P45, P75], 'ωον', gloss(row));
    changed++;
  }

  // r6 (idx 5): empty — both lack Vat "μη"
  {
    const row = data.rows[5];
    row.papyrus = { type: 'empty' };
    changed++;
  }

  // r7 (idx 6): P45+P75, fix text "αυτωι" → "επιδωσει"
  {
    const row = data.rows[6];
    row.papyrus = makeExtant([P45, P75], 'επιδωσει', gloss(row));
    changed++;
  }

  // r8 (idx 7): restore P45+P75 "αυτω" (was empty)
  {
    const row = data.rows[7];
    row.papyrus = makeExtant([P45, P75], 'αυτω', gloss(row));
    changed++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} luke/11/12: fixed ${changed} rows (r3-r8 P45/P75 alignment + text)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 10:9 — Restore r1-r8 for P44+P45+P66+P75; fix P6 and P44 over-extension
//
// P44 INTF (10 words): r1-r10
// P45 INTF (17 words): r1-r17
// P66 INTF (17 words): r1-r17
// P75 INTF (17 words, "αν" at r7 vs "εαν"): r1-r17
// P6  INTF (6 words):  r12-r17
//
// Current broken state: r1-r8 all lost; r9-r17 have P44+P45+P6+P66+P75 (P6 and P44 over-extended)
{
  const { fp, data } = readVerse('john', 10, 9);

  const P44 = { id: 'P44', date: 'c. 5th–6th c. CE' };
  const P45 = { id: 'P45', date: 'c. 200–250 CE' };
  const P66 = { id: 'P66', date: 'c. 175–225 CE' };
  const P75 = { id: 'P75', date: 'c. 175–225 CE' };

  // INTF words for rows 1-8 (majority text: P44/P45/P66 agree; P75 has "αν" at r7)
  const words18 = ['εγω','ειμι','η','θυρα','δι','εμου','εαν','τις'];

  let changed = 0;

  // Restore r1-r8 (indices 0-7): P44+P45+P66+P75
  for (let i = 0; i < 8; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') { log(`WARN r${i+1} not lost: skipping`); continue; }
    row.papyrus = makeExtant([P44, P45, P66, P75], words18[i], gloss(row));
    changed++;
  }

  // r9-r10 (indices 8-9): remove P6 (P6 starts at r12)
  for (let i = 8; i <= 9; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P6');
    if (row.papyrus.fragments.length < before) changed++;
  }

  // r11 (index 10): remove P44 (ends at r10) and P6 (starts at r12)
  {
    const row = data.rows[10];
    if (row.papyrus.type === 'extant') {
      const before = row.papyrus.fragments.length;
      row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P44' && f.id !== 'P6');
      if (row.papyrus.fragments.length < before) changed++;
    }
  }

  // r12-r17 (indices 11-16): remove P44 (P6 stays)
  for (let i = 11; i <= 16; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P44');
    if (row.papyrus.fragments.length < before) changed++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} john/10/9: ${changed} changes (r1-r8 restored; P6 trimmed from r9-r11; P44 trimmed from r11-r17)`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
