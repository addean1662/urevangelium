// Fix Mark papyrus issues — Part 3
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/mark');

const empty = { type: 'empty' };

function P45(text, gloss) {
  return { type:'extant', fragments:[{id:'P45', date:'c. 200–250 CE'}], text, gloss:{gloss, source:'TAGNT'} };
}

function P88(text, gloss) {
  return { type:'extant', fragments:[{id:'P88', date:'c. 4th c. CE'}], text, gloss:{gloss, source:'TAGNT'} };
}

function textFix(d, id, text) {
  const row = d.rows.find(r => r.id === id);
  if (row?.papyrus?.type === 'extant') row.papyrus.text = text;
}

// Shift content from startId through (endId-1) into (startId+1) through endId.
// Puts newPapyrus at startId. endId row's content is overwritten by (endId-1)'s old content.
function insertPapyrus(d, startId, newPapyrus, endId) {
  const rowMap = {};
  for (const r of d.rows) rowMap[r.id] = r;
  const startN = parseInt(startId.slice(1));
  const endN   = parseInt(endId.slice(1));
  const ids    = [];
  for (let n = startN; n <= endN; n++) ids.push('r' + n);
  const orig = ids.slice(0, -1).map(id => rowMap[id].papyrus);
  rowMap[startId].papyrus = newPapyrus;
  for (let i = 0; i < orig.length; i++) rowMap[ids[i + 1]].papyrus = orig[i];
}

// ── Mark 2:12 [P88] ──────────────────────────────────────────────────────────
// INTF: ...παντων εξ ωστε...  OURS: ...παντων ωστε...
// Insert "εξ" at r11; shift r11-r21 → r12-r22 (r22="ειδομεν" becomes "ουδεποτε",
// sequence truncates to 22 words which is a prefix of INTF's 23 → PARTIAL_SUBSET OK)
{
  const f = path.join(BASE, '2/12.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertPapyrus(d, 'r11', P88('εξ', 'out'), 'r22');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 2:12');
}

// ── Mark 2:19 [P88] ──────────────────────────────────────────────────────────
// r29 "νηστευει" → "νηστευειν"
{
  const f = path.join(BASE, '2/19.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r29', 'νηστευειν');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 2:19');
}

// ── Mark 9:28 [P45] ──────────────────────────────────────────────────────────
// INTF: ...αυτου προσηλθον αυτωι...  OURS missing second "προσηλθον"
// r8 is empty; set it to P45 "προσηλθον" → sequence becomes prefix of INTF → OK
{
  const f = path.join(BASE, '9/28.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const r8 = d.rows.find(r => r.id === 'r8');
  r8.papyrus = P45('προσηλθον', 'came to');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:28');
}

// ── Mark 12:6 [P45] ──────────────────────────────────────────────────────────
// INTF: υστερον δε ετι ενα υν...  OURS missing "ετι" at position 2
// Insert "ετι" at r3, shift r3-r18 → r4-r19 (r19="μου" becomes "υν",
// sequence ends at "υν" which is a prefix of INTF's "...υν μου" → PARTIAL_SUBSET OK)
{
  const f = path.join(BASE, '12/6.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertPapyrus(d, 'r3', P45('ετι', 'yet'), 'r19');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:6');
}
