// Fix Mark papyrus issues across P137, P84, P88, P45
//
// P137 1:17  r12,r13 → empty  (ditto "αλιεισ ανθρωπω")
// P137 1:18  r6,r8  → empty  (INTF omits "αυτων" / "αυτω")
// P88  2:3   r3 "φεροτεσ" → "φεροντεσ"  (typo; also shared with P84)
// P88  2:4   r16 "χαλωσιν" → "χααλωσιν"  (INTF double-α)
// P88  2:8   r18 "διαλογιζεσθαι" → "διαλογιζεσθε"
// P88  2:13  r14 → "και"; r15.papyrus → P88 "εδιδασκεν"
// P88  2:15  r27,r28 → empty  (ditto)
// P88  2:16  r5 "φαρισαιων" → "φαρεισεων"; r23 "τελωνω" → "τελωνων"
// P88  2:18  r5 "ιωανου" → "ιωαννου"; r24 "φαρειασεων" → "φαρεισεων"; r26-r32 → empty
// P88  2:22  r31-r33 → empty  (ditto)
// P88  2:23  r9 "τω" → "των"; r15 "ηρξατο" → "ηρξαντο"
// P88  2:25  r2 "λεγει" → "ελεγεν"; r17 "μετ" → "οι"; r18 "αυτου" → "μετ"
// P88  2:26  r9 "αβι" → "αβιαθαρ"; r10-r32 → empty
// P45  4:34  r11 → empty  ("ιδιοισ" not in INTF)
// P84  6:40  r5 "κατα" → "ανα"; r8 "κατα" → "ανα"
// P45  7:15  r22-r24 → empty  (ditto "εστιν τα κοινουντα")
// P45  8:34  r24-r26 → empty  (ditto "και ακολουθειτω μοι")
// P45  9:31  r22 → empty; r23-r26 → lacuna  (ditto + beyond coverage)
// P45 11:27  r13-r22 → empty  (full ditto)
// P45 12:13  r13-r14 → empty  (ditto)
// P45 12:17  r6 → empty; r21 → empty  ("αυτοισ" not in INTF; ditto "αυτω")
// P45 12:19  r11 → empty; r27 → empty  ("καταλιπηι" not in INTF; ditto "σπερμα")

const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/mark');

const empty  = { type: 'empty' };
const lacuna = { type: 'lacuna' };

function P88(text, gloss) {
  return { type:'extant', fragments:[{id:'P88',date:'c. 4th c. CE'}], text, gloss:{gloss,source:'TAGNT'} };
}

function patch(d, map) {
  for (const row of d.rows) {
    if (map[row.id] !== undefined) row.papyrus = map[row.id];
  }
}

function textFix(d, id, text) {
  const row = d.rows.find(r => r.id === id);
  if (row?.papyrus?.type === 'extant') row.papyrus.text = text;
}

// ── Mark 1:17 [P137] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '1/17.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r12: empty, r13: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 1:17');
}

// ── Mark 1:18 [P137] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '1/18.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r6: empty, r8: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 1:18');
}

// ── Mark 2:3 [P84+P88] ───────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/3.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r3', 'φεροντεσ');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:3');
}

// ── Mark 2:4 [P88] ───────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/4.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r16', 'χααλωσιν');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:4');
}

// ── Mark 2:8 [P84+P88] ───────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/8.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r18', 'διαλογιζεσθε');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:8');
}

// ── Mark 2:13 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/13.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  // r14: "εδιδασκεν" → "και"; r15 (currently empty) → P88 "εδιδασκεν"
  textFix(d, 'r14', 'και');
  const r15 = d.rows.find(r => r.id === 'r15');
  if (r15) r15.papyrus = P88('εδιδασκεν', 'taught');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:13');
}

// ── Mark 2:15 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/15.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r27: empty, r28: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:15');
}

// ── Mark 2:16 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/16.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r5',  'φαρεισεων');
  textFix(d, 'r23', 'τελωνων');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:16');
}

// ── Mark 2:18 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/18.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r5',  'ιωαννου');
  textFix(d, 'r24', 'φαρεισεων');
  patch(d, { r26:empty, r27:empty, r28:empty, r29:empty, r30:empty, r31:empty, r32:empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:18');
}

// ── Mark 2:22 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/22.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r31: empty, r32: empty, r33: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:22');
}

// ── Mark 2:23 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/23.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r9',  'των');
  textFix(d, 'r15', 'ηρξαντο');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:23');
}

// ── Mark 2:25 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/25.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r2',  'ελεγεν');
  textFix(d, 'r17', 'οι');
  textFix(d, 'r18', 'μετ');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:25');
}

// ── Mark 2:26 [P88] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '2/26.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r9', 'αβιαθαρ');
  // r10-r32: P88 coverage ends; set papyrus to empty on all extant P88 rows beyond r9
  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n >= 10 && row.papyrus?.type === 'extant') row.papyrus = empty;
  }
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 2:26');
}

// ── Mark 4:34 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '4/34.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r11: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 4:34');
}

// ── Mark 6:40 [P84] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '6/40.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  textFix(d, 'r5', 'ανα');
  textFix(d, 'r8', 'ανα');
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 6:40');
}

// ── Mark 7:15 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '7/15.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r22: empty, r23: empty, r24: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 7:15');
}

// ── Mark 8:34 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '8/34.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r24: empty, r25: empty, r26: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 8:34');
}

// ── Mark 9:31 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '9/31.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r22: empty, r23: lacuna, r24: lacuna, r25: lacuna, r26: lacuna });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 9:31');
}

// ── Mark 11:27 [P45] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '11/27.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, {
    r13:empty, r14:empty, r15:empty, r16:empty, r17:empty,
    r18:empty, r19:empty, r20:empty, r21:empty, r22:empty,
  });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 11:27');
}

// ── Mark 12:13 [P45] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/13.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r13: empty, r14: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 12:13');
}

// ── Mark 12:17 [P45] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/17.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r6: empty, r21: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 12:17');
}

// ── Mark 12:19 [P45] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/19.json');
  const d = JSON.parse(fs.readFileSync(f,'utf8'));
  patch(d, { r11: empty, r27: empty });
  fs.writeFileSync(f, JSON.stringify(d,null,2));
  console.log('Fixed Mark 12:19');
}
