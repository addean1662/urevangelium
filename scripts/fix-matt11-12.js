// Fix Matthew 11:5, 12:4, 12:5, 12:32 papyrus issues
//
// 11:5 [P19]:  coverage ends at "περιπατουσιν" (r5); r5 missing final ν;
//              r6-r16 should be lacuna ("λε προι" is a broken read of Vat "λεπροὶ")
//
// 12:4 [P70]:  P70 is displaced 9 rows early (starts at r1 = αρτους but should be r10);
//              r1-r3 = lacuna; r4-r9 = new extant (τον οικον του θυ και τους);
//              r10-r19 = shift current r1-r10; r20-r28 already correct
//
// 12:5 [P70]:  r8 "τω" should be "εν" (P70 reads "εν τω σαββατω", Vat has "τοῖς σάββασιν");
//              P70 coverage ends at r10 "οι" → r11-r20 = lacuna
//
// 12:32 [P21]: missing initial "και" (INTF word 1); shift all current r1-r31 to r2-r32;
//              set r1 = "και"; set r33-r34 = lacuna (trailing ditto)

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/matthew');

const lacuna = { type: 'lacuna' };

function extant(id, date, text, gloss) {
  return { type: 'extant', fragments: [{ id, date }], text, gloss: { gloss, source: 'TAGNT' } };
}

// ── Matt 11:5 [P19] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '11/5.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r5') {
      row.papyrus.text = 'περιπατουσιν';   // add final ν
    } else if (['r6','r7','r8','r9','r10','r11','r12','r13','r14','r15','r16'].includes(row.id)) {
      row.papyrus = lacuna;                 // beyond P19 coverage
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 11:5');
}

// ── Matt 12:4 [P70] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '12/4.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // Save the current r1-r10 content (to be moved to r10-r19)
  const saved = {};
  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n >= 1 && n <= 10) saved[n] = row.papyrus;
  }

  // Pull Vaticanus glosses for new leading rows
  const vatG = {};
  for (const row of d.rows) vatG[row.id] = row.vaticanus?.gloss?.gloss || '';

  const P70 = (t, g) => extant('P70', 'c. 4th c. CE', t, g);

  const fixes = {
    r1:  lacuna,
    r2:  lacuna,
    r3:  lacuna,
    r4:  P70('τον',          vatG['r4']  || 'the'),
    r5:  P70('οικον',        vatG['r5']  || 'house'),
    r6:  P70('του',          vatG['r6']  || 'of'),
    r7:  P70('θυ',           vatG['r7']  || 'God'),
    r8:  P70('και',          vatG['r8']  || 'and'),
    r9:  P70('τους',         vatG['r9']  || 'the'),
    r10: saved[1],  // αρτους
    r11: saved[2],  // τησ
    r12: saved[3],  // προθεσεωσ
    r13: saved[4],  // εφαγεν
    r14: saved[5],  // ο
    r15: saved[6],  // ουκ
    r16: saved[7],  // εξον
    r17: saved[8],  // ην
    r18: saved[9],  // αυτω
    r19: saved[10], // φαγειν
    // r20-r28: already correct — keep as-is
  };

  for (const row of d.rows) {
    if (fixes[row.id] !== undefined) row.papyrus = fixes[row.id];
  }

  // Strip trailing punctuation from r28 papyrus text if present
  const r28 = d.rows.find(r => r.id === 'r28');
  if (r28?.papyrus?.type === 'extant') {
    r28.papyrus.text = r28.papyrus.text.replace(/[;¶.\s]+$/, '');
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 12:4');
}

// ── Matt 12:5 [P70] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '12/5.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r8') {
      row.papyrus.text = 'εν';  // P70 reads "εν τω σαββατω" not "τω σαββατω"
    } else if (['r11','r12','r13','r14','r15','r16','r17','r18','r19','r20'].includes(row.id)) {
      row.papyrus = lacuna;     // beyond P70 coverage (ends at r10 "οι")
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 12:5');
}

// ── Matt 12:32 [P21] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '12/32.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // Save r1-r31 (shift to r2-r32)
  const saved = {};
  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n >= 1 && n <= 31) saved[n] = row.papyrus;
  }

  const P21 = (t, g) => extant('P21', 'c. 4th–5th c. CE', t, g);

  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n === 1) {
      row.papyrus = P21('και', 'And');
    } else if (n >= 2 && n <= 32) {
      row.papyrus = saved[n - 1];  // shift down by 1
    } else if (n === 33 || n === 34) {
      row.papyrus = lacuna;        // trailing ditto removed
    }
  }

  // Strip trailing punctuation from r32 papyrus text
  const r32 = d.rows.find(r => r.id === 'r32');
  if (r32?.papyrus?.type === 'extant') {
    r32.papyrus.text = r32.papyrus.text.replace(/[;¶.\s]+$/, '');
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 12:32');
}
