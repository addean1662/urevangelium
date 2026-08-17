// Fix Matthew 17:1, 18:16, 18:33, 19:1, 19:18, 25:9, 25:15, 25:22
//
// 17:1  [P44]:  r23 "κατ᾽" → "καθ᾽" (INTF reads "καθ")
//
// 18:16 [P44]:  word-order fix — P44 reads "παραλαβε ετι ενα η δυο μετα σου"
//               (vs Vaticanus "παραλαβε μετα σου ετι ενα η δυο");
//               r4 strip trailing comma; r6→ετι r7→ενα r8→η r9→δυο r10→μετα r11→σου
//
// 18:33 [P25]:  r5 "το" → "τον"; r12 → lacuna (dittography)
//
// 19:1  [P25]:  11-row leading displacement; r1-r11 → lacuna; r12 → "τησ";
//               r13-r23 already hold the correct P25 text (keep, strip r23 period)
//
// 19:18 [P71]:  r9 "φονευσεισ" → "φονευσησ" (INTF reads φονευσης = subjunctive);
//               r12 → lacuna (ditto of r11); r14-r16 → lacuna (beyond coverage)
//
// 25:9  [P44]:  r10 "ημιν" → "ημειν"; r14 → empty (P44 omits Vaticanus "δε")
//
// 25:15 [P35]:  r5 "ταλαντα" → "ε" (abbreviated πεντε); r6 → "ταλαντα";
//               r7-r20 → lacuna (P35 coverage ends at "ε ταλαντα")
//
// 25:22 [P35]:  missing "δε" at r2 causes 1-position shift from r2 onward;
//               P35 also omits Vaticanus "λαβών" at r8;
//               fix: r2→δε r3→και r4→ο r5→τα r6→δυο r7→ταλαντα r8→empty
//               r9→ειπεν r10→κε r11→δυο r12→ταλαντα r13→μοι r14→παρεδωκας
//               r15→ιδε r16→αλλα r17→δυο (r18,r19 already correct) r20-r21→lacuna

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/matthew');

const lacuna = { type: 'lacuna' };
const empty  = { type: 'empty' };

function extant(id, date, text, gloss) {
  return { type: 'extant', fragments: [{ id, date }], text, gloss: { gloss, source: 'TAGNT' } };
}

function patchRows(d, patches) {
  for (const row of d.rows) {
    if (patches[row.id] !== undefined) row.papyrus = patches[row.id];
  }
}

// ── Matt 17:1 [P44] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '17/1.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r23' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'καθ᾽';
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 17:1');
}

// ── Matt 18:16 [P44] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '18/16.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // Strip trailing comma from r4 "ακουση,"
  for (const row of d.rows) {
    if (row.id === 'r4' && row.papyrus?.type === 'extant') {
      row.papyrus.text = row.papyrus.text.replace(/,+$/, '');
    }
  }

  // Reorder r6-r11: INTF order is ετι ενα η δυο μετα σου
  // (Vaticanus has μετα σου ετι ενα η δυο — P44 differs)
  const P44 = (t, g) => extant('P44', 'c. 4th–5th c. CE', t, g);
  patchRows(d, {
    r6:  P44('ετι',  'yet'),
    r7:  P44('ενα',  'one'),
    r8:  P44('η',    'or'),
    r9:  P44('δυο',  'two'),
    r10: P44('μετα', 'with'),
    r11: P44('σου',  'you'),
  });

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 18:16');
}

// ── Matt 18:33 [P25] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '18/33.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, {
    r5:  (() => { const r = d.rows.find(r => r.id === 'r5'); const c = {...r.papyrus}; c.text = 'τον'; return c; })(),
    r12: lacuna,
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 18:33');
}

// ── Matt 19:1 [P25] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '19/1.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  const P25 = (t, g) => extant('P25', 'c. 4th c. CE', t, g);

  patchRows(d, {
    r1:  lacuna, r2:  lacuna, r3:  lacuna, r4:  lacuna,
    r5:  lacuna, r6:  lacuna, r7:  lacuna, r8:  lacuna,
    r9:  lacuna, r10: lacuna, r11: lacuna,
    r12: P25('τησ', 'of'),
    // r13-r22 retain existing ditto content (already correct)
  });

  // Strip trailing period from r23
  const r23 = d.rows.find(r => r.id === 'r23');
  if (r23?.papyrus?.type === 'extant') {
    r23.papyrus.text = r23.papyrus.text.replace(/[.¶\s]+$/, '');
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 19:1');
}

// ── Matt 19:18 [P71] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '19/18.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // r9: "φονευσεισ" → "φονευσησ" (INTF P71 reads aorist subjunctive)
  for (const row of d.rows) {
    if (row.id === 'r9' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'φονευσης';
    }
  }

  patchRows(d, {
    r12: lacuna,   // ditto of r11
    r14: lacuna,   // beyond P71 coverage
    r15: lacuna,
    r16: lacuna,
  });

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 19:18');
}

// ── Matt 25:9 [P44] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '25/9.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  for (const row of d.rows) {
    if (row.id === 'r10' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'ημειν';
    }
  }
  patchRows(d, { r14: empty });  // P44 omits Vaticanus "δε"

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 25:9');
}

// ── Matt 25:15 [P35] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '25/15.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  const P35 = (t, g) => extant('P35', 'c. 4th c. CE', t, g);

  patchRows(d, {
    r5:  P35('ε',        'five'),   // abbreviated πεντε
    r6:  P35('ταλαντα',  'talents'),
    r7:  lacuna, r8:  lacuna, r9:  lacuna, r10: lacuna,
    r11: lacuna, r12: lacuna, r13: lacuna, r14: lacuna,
    r15: lacuna, r16: lacuna, r17: lacuna, r18: lacuna,
    r19: lacuna, r20: lacuna,
  });

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 25:15');
}

// ── Matt 25:22 [P35] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '25/22.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  const P35 = (t, g) => extant('P35', 'c. 4th c. CE', t, g);

  patchRows(d, {
    r2:  P35('δε',          'and'),
    r3:  P35('και',         'and'),
    r4:  P35('ο',           'the'),
    r5:  P35('τα',          'the'),
    r6:  P35('δυο',         'two'),
    r7:  P35('ταλαντα',     'talents'),
    r8:  empty,                              // P35 omits Vaticanus "λαβών"
    r9:  P35('ειπεν',       'said'),
    r10: P35('κε',          'lord'),
    r11: P35('δυο',         'two'),
    r12: P35('ταλαντα',     'talents'),
    r13: P35('μοι',         'to me'),
    r14: P35('παρεδωκας',   'you entrusted'),
    r15: P35('ιδε',         'see'),
    r16: P35('αλλα',        'other'),
    r17: P35('δυο',         'two'),
    // r18=ταλαντα and r19=εκερδησα already correct after shift
    r20: lacuna,
    r21: lacuna,
  });

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 25:22');
}
