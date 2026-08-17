// Fix Matthew 10:13 and 10:14 P110 displacement errors
// Matt 10:13: P110 is placed 7 rows too early; r1-r6 should be lacuna,
//   r7 "η"→"αξια", r8 "αξια"→"ελθατω", r11 υμων→lacuna,
//   r12 "εφ"→"επ", r13 "υμασ"→"αυτην", r14 "επιστραφητω"→"εαν"
//   r18 strip comma, r24 strip period
// Matt 10:14: r11 extra "υμων" → lacuna (P110 has no υμων between λογους and εξερχομενων)
// Matt 10:41: "μισθο" → "μισθον" (missing final ν)

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data/matthew/10');

// ── Matt 10:13 ──────────────────────────────────────────────────────────────

const f13 = path.join(DATA, '13.json');
const d13 = JSON.parse(fs.readFileSync(f13, 'utf8'));

const P110_FRAG = [{ id: 'P110', date: 'c. 4th c. CE' }];

function extant(text, gloss) {
  return { type: 'extant', fragments: P110_FRAG, text, gloss: { gloss, source: 'TAGNT' } };
}
const lacuna = { type: 'lacuna' };

// Map row id → new papyrus cell
const fixes13 = {
  r1:  lacuna,
  r2:  lacuna,
  r3:  lacuna,
  r4:  lacuna,
  r5:  lacuna,
  r6:  lacuna,
  r7:  extant('αξια',         'worthy'),
  r8:  extant('ελθατω',       'let come'),
  // r9 "η" and r10 "ειρηνη" are already correct
  r11: lacuna,
  r12: extant('επ',           'upon'),
  r13: extant('αυτην',        'it'),
  r14: extant('εαν',          'if'),
  // r15-r17 already correct
  r18: extant('αξια',         'worthy'),   // strip trailing comma
  // r19-r23 already correct
  r24: extant('επιστραφητω',  'let return'), // strip trailing period
};

for (const row of d13.rows) {
  if (fixes13[row.id]) row.papyrus = fixes13[row.id];
}

fs.writeFileSync(f13, JSON.stringify(d13, null, 2));
console.log('Fixed Matt 10:13');

// ── Matt 10:14 ──────────────────────────────────────────────────────────────

const f14 = path.join(DATA, '14.json');
const d14 = JSON.parse(fs.readFileSync(f14, 'utf8'));

// r11: extra "υμων" between λογους and εξερχομενων — P110 has no υμων here
for (const row of d14.rows) {
  if (row.id === 'r11') row.papyrus = lacuna;
}

fs.writeFileSync(f14, JSON.stringify(d14, null, 2));
console.log('Fixed Matt 10:14');

// ── Matt 10:41 ──────────────────────────────────────────────────────────────

const f41 = path.join(DATA, '41.json');
const d41 = JSON.parse(fs.readFileSync(f41, 'utf8'));

for (const row of d41.rows) {
  if (row.papyrus?.type === 'extant' && row.papyrus.text === 'μισθο') {
    row.papyrus.text = 'μισθον';
    console.log(`  Fixed Matt 10:41 ${row.id}: μισθο → μισθον`);
  }
}

fs.writeFileSync(f41, JSON.stringify(d41, null, 2));
console.log('Fixed Matt 10:41');
