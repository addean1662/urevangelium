// Fix Mark papyrus issues — Part 2
// Covers P45 (chapters 5–12) and P84 (chapter 6) corrections after fix-mark.js
//
// Text fixes:
//   5:26  r11 "εαυτησ" → "αυτης"
//   5:40  r7  "ο" → "αυτος"
//   6:31  r2  "λεγει" → "ειπεν"  r13 "αναπαυσασθε" → "αναπαυεσθε"
//   6:49  r9→"φαντασμα"  r10→"εδοξαν"  r11→"ειναι"
//   7:31  r20 "δεκαπολεωσ" → "εις"
//   8:22  r2  "ερχεται" → "ερχονται"
//   8:36  r12 "ζημιωθη" → "ζημιωθηναι"
//   9:8   r8  "ιη" → "ιν"
//   9:19  r9  "απιστε" → "απιστος"
//   12:6  r5  "ειχεν" → "εχων"  r14 "λεγω" → "λεγων"
//   12:14 r26 "αλλ" → "αλλα"
//   12:26 r15 "βατου" → "βατος"
//
// Empty/lost:
//   5:2   r10–r16 → lost   (INTF P45 ends at r9)
//   5:26  r21 → empty
//   6:2   r13–r16 → empty  (extra "επι τη διδαχη αυτου" not in INTF P45)
//   6:22  r29, r30 → empty (ditto)
//   6:23  r3, r16 → empty
//   6:30  r1–r9, r12 → empty  (INTF P84 starts at "αυτω"=r10)
//   6:31  r22–r26 → empty  (beyond INTF P84 coverage)
//   6:49  r12 → empty
//   8:21  r4 → empty
//   8:26  r5, r7–r19 → empty (INTF P45 = "εις οικον"; extra words cleared)
//   9:9   r3, r9–r24 → empty (extra "δε"; beyond INTF P45 coverage)
//   9:21  r6 → empty  ("λεγων" not in INTF P45)
//   9:28  r1, r8, r9 → empty  (leading "και" + "κατ ιδιαν" not in INTF P45)
//   12:7  r11 → empty  ("οτι" not in INTF P45)
//
// Insert (shift P45 column to make room for missing word):
//   6:17  insert "την"      at r16; shift r16–r21 → r17–r22
//   6:20  insert "και"      at r13; shift r13–r22 → r14–r23
//   6:22  insert "ηρωδης"   at r18; shift r18–r28 → r19–r29; r30→empty
//   8:19  insert "πεντε"    at r3;  shift r3–r13  → r4–r14;  r15→"ιβ"; r16→empty
//   9:31  insert "αυτοισ"   at r8;  shift r8–r21  → r9–r22
//   12:1  r15 → "ωρυξεν";  insert "πυργον" at r19; shift r19–r22 → r20–r23; r24→empty
//   12:26 r15 → "βατος";   insert "αυτω"   at r18; shift r18–r31 → r19–r32

const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/mark');

const empty  = { type: 'empty' };
const lost   = { type: 'lost' };

function P45(text, gloss) {
  return { type:'extant', fragments:[{id:'P45', date:'c. 200–250 CE'}], text, gloss:{gloss, source:'TAGNT'} };
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

// Insert newPapyrus at startId, shifting existing P45 content forward through endId.
// endId must currently be non-extant (empty/lacuna) — it receives the last shifted word.
// All row IDs between startId and endId must be consecutive integers.
function insertP45(d, startId, newPapyrus, endId) {
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

// ── Mark 5:2 [P45] ───────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '5/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r10:lost, r11:lost, r12:lost, r13:lost, r14:lost, r15:lost, r16:lost });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 5:2');
}

// ── Mark 5:26 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '5/26.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r11', 'αυτης');
  patch(d, { r21: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 5:26');
}

// ── Mark 5:40 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '5/40.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r7', 'αυτος');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 5:40');
}

// ── Mark 6:2 [P45] ───────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '6/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r13:empty, r14:empty, r15:empty, r16:empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:2');
}

// ── Mark 6:17 [P45] ──────────────────────────────────────────────────────────
// INTF: "δια ηρωδιαδα **την** φιλιππου" — our data missing "την"
// Insert "την" at r16; shift r16–r21 → r17–r22 (r22 was empty)
{
  const f = path.join(BASE, '6/17.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertP45(d, 'r16', P45('την', 'the'), 'r22');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:17');
}

// ── Mark 6:20 [P45] ──────────────────────────────────────────────────────────
// INTF: "αγιον **και** συνετηρει" — our data missing "και"
// Insert "και" at r13; shift r13–r22 → r14–r23 (r23 was empty)
{
  const f = path.join(BASE, '6/20.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertP45(d, 'r13', P45('και', 'and'), 'r23');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:20');
}

// ── Mark 6:22 [P45] ──────────────────────────────────────────────────────────
// INTF: "ειπεν ο **ηρωδης** βασιλευς" — our data missing "ηρωδης"
// Insert "ηρωδης" at r18; shift r18–r28 → r19–r29; r30→empty (ditto)
{
  const f = path.join(BASE, '6/22.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertP45(d, 'r18', P45('ηρωδης', 'Herod'), 'r29');
  patch(d, { r30: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:22');
}

// ── Mark 6:23 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '6/23.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r3: empty, r16: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:23');
}

// ── Mark 6:30 [P84] ──────────────────────────────────────────────────────────
// INTF P84 starts at "αυτω"=r10; r1–r9 and extra r12 ("και") → empty
{
  const f = path.join(BASE, '6/30.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, {
    r1:empty, r2:empty, r3:empty, r4:empty, r5:empty,
    r6:empty, r7:empty, r8:empty, r9:empty, r12:empty,
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:30');
}

// ── Mark 6:31 [P84] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '6/31.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r2',  'ειπεν');
  textFix(d, 'r13', 'αναπαυεσθε');
  patch(d, { r22:empty, r23:empty, r24:empty, r25:empty, r26:empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:31');
}

// ── Mark 6:49 [P45] ──────────────────────────────────────────────────────────
// INTF: "περιπατουντα φαντασμα εδοξαν ειναι" — our data has wrong word order/form
{
  const f = path.join(BASE, '6/49.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r9',  'φαντασμα');
  textFix(d, 'r10', 'εδοξαν');
  textFix(d, 'r11', 'ειναι');
  patch(d, { r12: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 6:49');
}

// ── Mark 7:31 [P45] ──────────────────────────────────────────────────────────
// INTF: "εις την δεκαπολιν" — our r20 has wrong form "δεκαπολεωσ"; fix to "εις"
{
  const f = path.join(BASE, '7/31.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r20', 'εις');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 7:31');
}

// ── Mark 8:19 [P45] ──────────────────────────────────────────────────────────
// INTF: "τους πεντε αρτους ... αυτωι ιβ" — missing "πεντε"; ditto rows → "ιβ"
// Insert "πεντε" at r3; shift r3–r13 → r4–r14; r15 → "ιβ"; r16 → empty
{
  const f = path.join(BASE, '8/19.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertP45(d, 'r3', P45('πεντε', 'five'), 'r14');
  const r15 = d.rows.find(r => r.id === 'r15');
  if (r15?.papyrus?.type === 'extant') {
    r15.papyrus.text  = 'ιβ';
    r15.papyrus.gloss = { gloss: 'twelve', source: 'TAGNT' };
  }
  patch(d, { r16: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 8:19');
}

// ── Mark 8:21 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '8/21.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r4: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 8:21');
}

// ── Mark 8:22 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '8/22.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r2', 'ερχονται');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 8:22');
}

// ── Mark 8:26 [P45] ──────────────────────────────────────────────────────────
// INTF P45: "και απεστειλεν αυτον εις οικον" (5 words)
{
  const f = path.join(BASE, '8/26.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, {
    r5:empty,
    r7:empty, r8:empty, r9:empty, r10:empty, r11:empty, r12:empty,
    r13:empty, r14:empty, r15:empty, r16:empty, r17:empty, r18:empty, r19:empty,
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 8:26');
}

// ── Mark 8:36 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '8/36.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r12', 'ζημιωθηναι');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 8:36');
}

// ── Mark 9:8 [P45] ───────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '9/8.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r8', 'ιν');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:8');
}

// ── Mark 9:9 [P45] ───────────────────────────────────────────────────────────
// INTF P45: 7 words ending at "διεστειλατο"; extra "δε" at r3; r9–r24 beyond coverage
{
  const f = path.join(BASE, '9/9.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, {
    r3:empty,
    r9:empty, r10:empty, r11:empty, r12:empty, r13:empty, r14:empty,
    r15:empty, r16:empty, r17:empty, r18:empty, r19:empty, r20:empty,
    r21:empty, r22:empty, r23:empty, r24:empty,
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:9');
}

// ── Mark 9:19 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '9/19.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r9', 'απιστος');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:19');
}

// ── Mark 9:21 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '9/21.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r6: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:21');
}

// ── Mark 9:28 [P45] ──────────────────────────────────────────────────────────
// INTF P45: starts "εισελθοντι" (no leading "και"); no "κατ ιδιαν"
{
  const f = path.join(BASE, '9/28.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r1: empty, r8: empty, r9: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:28');
}

// ── Mark 9:31 [P45] ──────────────────────────────────────────────────────────
// INTF: "ελεγεν αυτοις οτι" — our data missing "αυτοισ" between r7 and r8
// Insert "αυτοισ" at r8; shift r8–r21 → r9–r22 (r22 was empty)
{
  const f = path.join(BASE, '9/31.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertP45(d, 'r8', P45('αυτοισ', 'to them'), 'r22');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 9:31');
}

// ── Mark 12:1 [P45] ──────────────────────────────────────────────────────────
// INTF: "ωκοδομησεν πυργον και εξεδετο" — missing "πυργον"; also "ωρυξε"→"ωρυξεν"
// Fix r15; insert "πυργον" at r19; shift r19–r22 → r20–r23; r24→empty
{
  const f = path.join(BASE, '12/1.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r15', 'ωρυξεν');
  insertP45(d, 'r19', P45('πυργον', 'tower'), 'r23');
  patch(d, { r24: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:1');
}

// ── Mark 12:6 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/6.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r5',  'εχων');
  textFix(d, 'r14', 'λεγων');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:6');
}

// ── Mark 12:7 [P45] ──────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/7.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patch(d, { r11: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:7');
}

// ── Mark 12:14 [P45] ─────────────────────────────────────────────────────────
{
  const f = path.join(BASE, '12/14.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r26', 'αλλα');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:14');
}

// ── Mark 12:26 [P45] ─────────────────────────────────────────────────────────
// INTF: "ειπεν αυτω ο θς" — missing "αυτω"; also "βατου"→"βατος"
// Fix r15; insert "αυτω" at r18; shift r18–r31 → r19–r32 (r32 was empty)
{
  const f = path.join(BASE, '12/26.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r15', 'βατος');
  insertP45(d, 'r18', P45('αυτω', 'to him'), 'r32');
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Mark 12:26');
}
