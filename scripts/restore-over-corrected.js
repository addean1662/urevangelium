'use strict';
// Restores rows that were incorrectly set to `lost` by the displacement fix
// because the displacement only applied to one fragment (P44) but the fix
// blanket-set all rows to lost, losing P45/P66/P75 data.
//
// Verses affected:
//   john/10/8  — r1-r10 set to lost; P45/P66/P75 cover most of verse
//   john/15/2  — r1-r18 set to lost; P75 has full verse
//   john/16/29 — r1-r2 set to lost; P66 starts at r1 "λεγουσιν"
//   john/17/7  — r1-r7 set to lost; P66 covers r1-r6, P84 covers r8-r10
//
// Run: node scripts/restore-over-corrected.js [--apply]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(DATA, 'cache', 'intf');
const DRY = !process.argv.includes('--apply');

function loadCache(ga, gospel) {
  const f = path.join(CACHE, `${ga}-${gospel}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

function verseKey(book, chapter, verse) {
  // B04K10V8 format: book number, chapter, verse
  const books = { matthew: 'B02', mark: 'B03', luke: 'B03', john: 'B04' };
  // INTF uses different book numbers:
  // Matthew=B02, Mark=B03, Luke=B03... actually let me use the correct ones
  // Matthew=2, Mark=3, Luke=3, John=4... no:
  // Actually INTF NT book order: Matt=B02, Mark=B03, Luke=B03, John=B04
  // The actual keys in cache files follow INTF format
  return null; // We'll look up keys directly
}

function makeExtant(fragments, text, gloss) {
  return { type: 'extant', fragments, text, gloss };
}

const p75j = loadCache(10075, 'john');
const p66j = loadCache(10066, 'john');
const p45j = loadCache(10045, 'john');
const p84j = loadCache(10084, 'john');

// ─────────────────────────────────────────────────────────
// Helper: save file
function save(filePath, data) {
  if (DRY) return;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function log(msg) { console.log(msg); }

// ─────────────────────────────────────────────────────────
// JOHN 15:2 — restore r1-r18 with P75 data
// P75: ["παν","κλημα","εν","εμοι","μη","φερον","καρπον","αιρει",
//       "αυτο","και","παν","το","καρπον","φερον","καθαιρει","αυτο",
//       "ινα","πλειονα","καρπον","φερη"]  (20 words → r1-r20)
// r19-r20 already extant. Restore r1-r18.
{
  const fp = path.join(DATA, 'john', '15', '2.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const p75words = p75j['B04K15V2'];
  if (!p75words) { log('SKIP john/15/2 — no P75 cache entry'); }
  else {
    const P75_FRAG = [{ id: 'P75', date: 'c. 175–225 CE' }];
    let changed = 0;
    for (let i = 0; i < 18; i++) {
      const row = data.rows[i];
      if (row.papyrus.type !== 'lost') continue;
      const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
      row.papyrus = makeExtant(P75_FRAG, p75words[i], gloss);
      changed++;
    }
    log(`${DRY ? 'WOULD' : 'DID'} restore john/15/2 r1-r18 (${changed} rows) with P75 data`);
    save(fp, data);
  }
}

// ─────────────────────────────────────────────────────────
// JOHN 17:7 — restore r1-r6 with P66 data; remove P66 from r8-r10
// P66: ["νυν","εγνωκαν","οτι","παντα","οσα","δεδωκας"] (6 words → r1-r6)
// P84: ["παρα","σου","εισιν"] (3 words → r8-r10)
{
  const fp = path.join(DATA, 'john', '17', '7.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const p66words = p66j['B04K17V7'];
  if (!p66words) { log('SKIP john/17/7 — no P66 cache entry'); }
  else {
    const P66_FRAG = [{ id: 'P66', date: 'c. 175–225 CE' }];
    let changed = 0;

    // Restore r1-r6
    for (let i = 0; i < 6; i++) {
      const row = data.rows[i];
      if (row.papyrus.type !== 'lost') continue;
      const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
      row.papyrus = makeExtant(P66_FRAG, p66words[i], gloss);
      changed++;
    }

    // Remove P66 from r8-r10 (P66 only has 6 words; r8-r10 are P84 territory)
    for (let i = 7; i <= 9; i++) {
      const row = data.rows[i];
      if (row.papyrus.type !== 'extant') continue;
      const before = row.papyrus.fragments.length;
      row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P66');
      if (row.papyrus.fragments.length < before) changed++;
    }

    log(`${DRY ? 'WOULD' : 'DID'} restore john/17/7 (${changed} changes): r1-r6 P66, r8-r10 P66 removed`);
    save(fp, data);
  }
}

// ─────────────────────────────────────────────────────────
// JOHN 16:29 — restore r1 with P66 "λεγουσιν"
// P66: ["λεγουσιν","οι","μαθηται","αυτου","ιδε"] (5 words)
// r1 (Vat: λεγουσιν) → P66 word 1 = "λεγουσιν"
// r2 (Vat: αυτω)     → P66 lacks "αυτω" — leave as lost
// r3 (Vat: οι)       → P66 word 2 = "οι" — also lost, restore
{
  const fp = path.join(DATA, 'john', '16', '29.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const p66words = p66j['B04K16V29'];
  if (!p66words) { log('SKIP john/16/29 — no P66 cache entry'); }
  else {
    const P66_FRAG = [{ id: 'P66', date: 'c. 175–225 CE' }];
    let changed = 0;

    // r1 (index 0): P66 "λεγουσιν"
    {
      const row = data.rows[0];
      if (row.papyrus.type === 'lost') {
        const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
        row.papyrus = makeExtant(P66_FRAG, p66words[0], gloss);
        changed++;
      }
    }
    // r2 (index 1): P66 lacks "αυτω" — leave as lost (P66 omits this word)
    // r3 (index 2): P66 "οι" (P66 word 2)
    {
      const row = data.rows[2];
      if (row.papyrus.type === 'lost') {
        const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
        row.papyrus = makeExtant(P66_FRAG, p66words[1], gloss);
        changed++;
      }
    }

    log(`${DRY ? 'WOULD' : 'DID'} restore john/16/29 (${changed} changes): r1 P66 "λεγουσιν", r3 P66 "οι"`);
    save(fp, data);
  }
}

// ─────────────────────────────────────────────────────────
// JOHN 10:8 — restore r1-r10 for P45/P75 (and P66 where it agrees)
// P45: ["παντες","οσοι","ηλθον","κλεπται","εισιν","και","λησται","αλλ","ουκ","ηκουσεν","αυτων","τα","προβατα"]
// P66: ["παντες","οσοι","ηλθον","προ","εμου","κλεπτε","ειειν","εισιν","και","λησται","αλλ","ουκ","ηκουσαν","αυτων","τα","προβατα"]
// P75: ["παντες","οσοι","ηλθον","κλεπται","εισιν","και","λησται","αλλ","ουκ","ηκουσαν","αυτοι","αυτον","τα","προβατα"]
//
// Vaticanus row alignment (15 rows):
//  r1=παντες r2=οσοι r3=ηλθον r4=προ r5=εμου
//  r6=κλεπται r7=εισιν r8=και r9=λησται r10=αλλ
//  r11=ουκ r12=ηκουσαν r13=αυτων r14=τα r15=προβατα
//
// P45 and P75 omit "προ εμου" (r4-r5); P66 has them.
// For r4-r5: only P66 is attested; others lack the word → show P66 only.
// For r6-r10: P45, P75 agree on κλεπται/εισιν/και/λησται/αλλ.
//   P66 has extra "κλεπτε ειειν" before "εισιν" but these don't fit the row structure.
//   Use P75 text for r6 (κλεπται), r7 (εισιν), r8 (και), r9 (λησται), r10 (αλλ).
{
  const fp = path.join(DATA, 'john', '10', '8.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const p45words = p45j['B04K10V8'];
  const p66words = p66j['B04K10V8'];
  const p75words = p75j['B04K10V8'];

  const P45_FRAG = [{ id: 'P45', date: 'c. 200–250 CE' }];
  const P66_FRAG = [{ id: 'P66', date: 'c. 175–225 CE' }];
  const P75_FRAG = [{ id: 'P75', date: 'c. 175–225 CE' }];
  const MULTI_FRAG = [
    { id: 'P45', date: 'c. 200–250 CE' },
    { id: 'P66', date: 'c. 175–225 CE' },
    { id: 'P75', date: 'c. 175–225 CE' }
  ];

  let changed = 0;

  // r1-r3: P45/P66/P75 all have παντες/οσοι/ηλθον
  const r1_3_texts = ['παντες', 'οσοι', 'ηλθον'];
  for (let i = 0; i < 3; i++) {
    const row = data.rows[i];
    if (row.papyrus.type !== 'lost') continue;
    const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
    row.papyrus = makeExtant(MULTI_FRAG, r1_3_texts[i], gloss);
    changed++;
  }

  // r4 (index 3): P66 only has "προ"; P45/P75 omit → P66 only
  {
    const row = data.rows[3];
    if (row.papyrus.type === 'lost') {
      const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
      // Only P66 attests "προ" here
      row.papyrus = makeExtant(P66_FRAG, 'προ', gloss);
      changed++;
    }
  }

  // r5 (index 4): P66 only has "εμου"; P45/P75 omit → P66 only
  {
    const row = data.rows[4];
    if (row.papyrus.type === 'lost') {
      const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
      row.papyrus = makeExtant(P66_FRAG, 'εμου', gloss);
      changed++;
    }
  }

  // r6-r10: P45 and P75 agree. P66 has a complex reading but these words are present.
  // Use P75 (= P45) text: κλεπται, εισιν, και, λησται, αλλ
  const r6_10_texts = ['κλεπται', 'εισιν', 'και', 'λησται', 'αλλ'];
  for (let i = 0; i < 5; i++) {
    const row = data.rows[5 + i]; // r6=index5 ... r10=index9
    if (row.papyrus.type !== 'lost') continue;
    const gloss = row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
    row.papyrus = makeExtant(MULTI_FRAG, r6_10_texts[i], gloss);
    changed++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} restore john/10/8 (${changed} changes): r1-r10 with P45/P66/P75`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
