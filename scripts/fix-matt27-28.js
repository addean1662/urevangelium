// Fix Matthew 27:62, 27:63, 28:3, 28:4 [P105] papyrus issues
//
// 27:62 [P105]: INTF reads "τον πειλατον" (2 words) but data has only "πιλατον" (1 word).
//               r16 → P105 "τον"; insert new r17 with P105 "πειλατον" + copy other cols from r16.
//
// 27:63 [P105]: r2 "κυριε," → "κε" (P105 uses NS abbreviation for κύριε)
//
// 28:3  [P105]: r14 "χιων." → "χειων" (INTF P105 spells with εi diphthong)
//
// 28:4  [P105]: r6 "εσεισθησαν" → "εσισθησαν" (INTF P105 reading, shorter form)

const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/matthew');

function P105(text, gloss) {
  return { type: 'extant', fragments: [{ id: 'P105', date: 'c. 4th c. CE' }], text, gloss: { gloss, source: 'TAGNT' } };
}

// ── Matt 27:62 [P105] ────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '27/62.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  const r16 = d.rows.find(r => r.id === 'r16');

  // Save r16's non-papyrus columns to carry forward into new r17
  const { papyrus: _p, id: _id, ...otherCols } = r16;

  // r16 becomes P105 "τον"; other traditions have nothing here (they skip directly to Pilate)
  r16.papyrus = P105('τον', 'the');
  for (const col of ['vaticanus', 'sinaiticus', 'vulgate', 'peshitta', 'byzantine', 'bezae']) {
    r16[col] = { type: 'empty' };
  }

  // New r17: P105 "πειλατον" aligned with the other traditions' Pilate word
  const r17 = { id: 'r17', papyrus: P105('πειλατον', 'Pilate'), ...otherCols };
  d.rows.push(r17);

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 27:62');
}

// ── Matt 27:63 [P105] ────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '27/63.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  for (const row of d.rows) {
    if (row.id === 'r2' && row.papyrus?.type === 'extant') {
      row.papyrus.text  = 'κε';
      row.papyrus.gloss = { gloss: 'lord', source: 'TAGNT' };
    }
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 27:63');
}

// ── Matt 28:3 [P105] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '28/3.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  for (const row of d.rows) {
    if (row.id === 'r14' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'χειων';
    }
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 28:3');
}

// ── Matt 28:4 [P105] ─────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '28/4.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  for (const row of d.rows) {
    if (row.id === 'r6' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'εσισθησαν';
    }
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 28:4');
}
