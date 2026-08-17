// Fix Luke papyrus issues
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/luke');

function P4(text, gloss) {
  return { type:'extant', fragments:[{id:'P4', date:'c. 150–200 CE'}], text, gloss:{gloss, source:'TAGNT'} };
}

function textFix(d, id, text) {
  const row = d.rows.find(r => r.id === id);
  if (row?.papyrus?.type === 'extant') row.papyrus.text = text;
}

function setEmpty(d, id) {
  const row = d.rows.find(r => r.id === id);
  if (row) row.papyrus = { type: 'empty' };
}

function emptyRange(d, startId, endId) {
  const startN = parseInt(startId.slice(1));
  const endN   = parseInt(endId.slice(1));
  const rowMap = {};
  for (const r of d.rows) rowMap[r.id] = r;
  for (let n = startN; n <= endN; n++) {
    if (rowMap['r' + n]) rowMap['r' + n].papyrus = { type: 'empty' };
  }
}

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

function save(f, d, msg) {
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed ' + msg);
}

// ── Luke 1:55 [P42] ──────────────────────────────────────────────────────────
// r5 "πατερας" → "πρας" (NS abbrev matching INTF)
{
  const f = path.join(BASE, '1/55.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r5', 'πρας');
  save(f, d, 'Luke 1:55 P42 r5→πρας');
}

// ── Luke 1:58 [P4] ───────────────────────────────────────────────────────────
// r13-r19 are ditto rows beyond INTF coverage → empty
{
  const f = path.join(BASE, '1/58.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  emptyRange(d, 'r13', 'r19');
  save(f, d, 'Luke 1:58 P4 r13-r19→empty');
}

// ── Luke 1:59 [P4] ───────────────────────────────────────────────────────────
// r9-r16 are ditto rows beyond INTF coverage → empty
{
  const f = path.join(BASE, '1/59.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  emptyRange(d, 'r9', 'r16');
  save(f, d, 'Luke 1:59 P4 r9-r16→empty');
}

// ── Luke 1:63 [P4] ───────────────────────────────────────────────────────────
// r5 "λεγω" → "λεγων"
{
  const f = path.join(BASE, '1/63.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r5', 'λεγων');
  save(f, d, 'Luke 1:63 P4 r5→λεγων');
}

// ── Luke 1:65 [P4] ───────────────────────────────────────────────────────────
// r1-r4 ditto rows → empty; r5 "φο" → "φo" (INTF has Latin o U+006F not Greek ο U+03BF)
{
  const f = path.join(BASE, '1/65.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  emptyRange(d, 'r1', 'r4');
  textFix(d, 'r5', 'φo'); // Latin 'o' to match INTF cache exactly
  save(f, d, 'Luke 1:65 P4 r1-r4→empty r5→φo');
}

// ── Luke 1:79 [P4] ───────────────────────────────────────────────────────────
// r13 "ημω" → "ημων"
{
  const f = path.join(BASE, '1/79.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r13', 'ημων');
  save(f, d, 'Luke 1:79 P4 r13→ημων');
}

// ── Luke 2:40 [P141] ─────────────────────────────────────────────────────────
// r10-r15 ditto rows beyond INTF coverage → empty
{
  const f = path.join(BASE, '2/40.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  emptyRange(d, 'r10', 'r15');
  save(f, d, 'Luke 2:40 P141 r10-r15→empty');
}

// ── Luke 3:9 [P4] ────────────────────────────────────────────────────────────
// r5 "αξεινη" → "αξινη"
{
  const f = path.join(BASE, '3/9.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r5', 'αξινη');
  save(f, d, 'Luke 3:9 P4 r5→αξινη');
}

// ── Luke 3:11 [P4] ───────────────────────────────────────────────────────────
// INTF: ...εχων δυο χιτωνας...  OURS missing "δυο" at r7
// Insert "δυο" at r7; shift r7-r16 → r8-r17 (r17 was empty buffer)
{
  const f = path.join(BASE, '3/11.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertPapyrus(d, 'r7', P4('δυο', 'two'), 'r17');
  save(f, d, 'Luke 3:11 P4 insert δυο at r7');
}

// ── Luke 3:12 [P4] ───────────────────────────────────────────────────────────
// r9 "αυτο" → "αυτον"
{
  const f = path.join(BASE, '3/12.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r9', 'αυτον');
  save(f, d, 'Luke 3:12 P4 r9→αυτον');
}

// ── Luke 3:13 [P4] ───────────────────────────────────────────────────────────
// r10 "διατεταγμενο" → "διατεταγμενον"
{
  const f = path.join(BASE, '3/13.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r10', 'διατεταγμενον');
  save(f, d, 'Luke 3:13 P4 r10→διατεταγμενον');
}

// ── Luke 3:16 [P4] ───────────────────────────────────────────────────────────
// r22 "ιματα" → "ιμαντα"
{
  const f = path.join(BASE, '3/16.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r22', 'ιμαντα');
  save(f, d, 'Luke 3:16 P4 r22→ιμαντα');
}

// ── Luke 3:17 [P4] ───────────────────────────────────────────────────────────
// r15 "σειτον" → "σιτον"
{
  const f = path.join(BASE, '3/17.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r15', 'σιτον');
  save(f, d, 'Luke 3:17 P4 r15→σιτον');
}

// ── Luke 3:21 [P75] ──────────────────────────────────────────────────────────
// r6 "παντα" → "απαντα"
{
  const f = path.join(BASE, '3/21.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r6', 'απαντα');
  save(f, d, 'Luke 3:21 P75 r6→απαντα');
}

// ── Luke 3:22 [P4+P75] ───────────────────────────────────────────────────────
// r10 "περιστερα" → "περιστεραν"; r11-r28 P75 rows beyond INTF coverage → empty
{
  const f = path.join(BASE, '3/22.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r10', 'περιστεραν');
  emptyRange(d, 'r11', 'r28');
  save(f, d, 'Luke 3:22 P4/P75 r10→περιστεραν r11-r28→empty');
}

// ── Luke 3:23 [P4] ───────────────────────────────────────────────────────────
// INTF: ...ωσει ετων λ ων υιος...  OURS missing "λ" at r8, r7 typo
// 1) Fix r7 "ετω" → "ετων"
// 2) Insert "λ" at r8; shift r8-r14 → r9-r15 (r15 was ηλει buffer)
// 3) r16 "ηλι" (ditto) → empty
{
  const f = path.join(BASE, '3/23.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r7', 'ετων');
  insertPapyrus(d, 'r8', P4('λ', 'thirty'), 'r15');
  setEmpty(d, 'r16');
  save(f, d, 'Luke 3:23 P4 r7→ετων insert λ at r8 r16→empty');
}

// ── Luke 3:30 [P4] ───────────────────────────────────────────────────────────
// INTF: "του συμεων του ιουδα"  OURS: r4="ιου", r5="δα" (split)
// r4 → "ιουδα", r5 → empty
{
  const f = path.join(BASE, '3/30.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r4', 'ιουδα');
  setEmpty(d, 'r5');
  save(f, d, 'Luke 3:30 P4 r4→ιουδα r5→empty');
}

// ── Luke 3:33 [P4] ───────────────────────────────────────────────────────────
// r2 "αμιναδαβ" → "αδαμ" (INTF starts at "αδαμ")
{
  const f = path.join(BASE, '3/33.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r2', 'αδαμ');
  save(f, d, 'Luke 3:33 P4 r2→αδαμ');
}

// ── Luke 4:1 [P4+P7+P75] ─────────────────────────────────────────────────────
// r4 "πνοσ" → "πνς" (correct NS abbreviation for πνευματος)
{
  const f = path.join(BASE, '4/1.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r4', 'πνς');
  save(f, d, 'Luke 4:1 P4/P7/P75 r4→πνς');
}

// ── Luke 4:2 [P4+P7+P75] ─────────────────────────────────────────────────────
// INTF: ημερας [τεσσερακοντα] πειραζομενος...  OURS missing "forty" word at r2
// r17 is a duplicate of r16 (buffer); insert at r2 shifting r2-r16 → r3-r17
{
  const f = path.join(BASE, '4/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  insertPapyrus(d, 'r2', {
    type: 'extant',
    fragments: [{id:'P4',date:'c. 150–200 CE'},{id:'P7',date:'c. 4th c. CE'},{id:'P75',date:'c. 175–225 CE'}],
    text: 'τεσσερακοντα',
    gloss: { gloss: 'forty', source: 'TAGNT' }
  }, 'r17');
  save(f, d, 'Luke 4:2 P4/P7/P75 insert τεσσερακοντα at r2');
}

// ── Luke 5:3 [P4] ────────────────────────────────────────────────────────────
// r8 "δε" → "και"; r16-r26 ditto rows → empty
{
  const f = path.join(BASE, '5/3.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r8', 'και');
  emptyRange(d, 'r16', 'r26');
  save(f, d, 'Luke 5:3 P4 r8→και r16-r26→empty');
}

// ── Luke 5:31 [P4] ───────────────────────────────────────────────────────────
// r13 "αλλα" → "αλλ" (INTF ends without final alpha)
{
  const f = path.join(BASE, '5/31.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r13', 'αλλ');
  save(f, d, 'Luke 5:31 P4 r13→αλλ');
}

// ── Luke 5:35 [P4] ───────────────────────────────────────────────────────────
// r8 "αυτω" → "αυτων"
{
  const f = path.join(BASE, '5/35.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r8', 'αυτων');
  save(f, d, 'Luke 5:35 P4 r8→αυτων');
}

// ── Luke 6:1 [P4+P75] ────────────────────────────────────────────────────────
// r18 "ψωχοτεσ" → "ψωχοντεσ"
{
  const f = path.join(BASE, '6/1.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r18', 'ψωχοντεσ');
  save(f, d, 'Luke 6:1 P4/P75 r18→ψωχοντεσ');
}

// ── Luke 6:6 [P4] ────────────────────────────────────────────────────────────
// r7 "εισελθει" → "εισελθειν"; r13 "διδασκει" → "διδασκειν"
{
  const f = path.join(BASE, '6/6.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r7', 'εισελθειν');
  textFix(d, 'r13', 'διδασκειν');
  save(f, d, 'Luke 6:6 P4 r7+r13 infinitive fix');
}

// ── Luke 6:14 [P4] ───────────────────────────────────────────────────────────
// INTF starts at "ον και ωνομασεν τον αδελφον..."
// r1 "σιμωνα", r5 "πετρον", r6 "και", r7 "ανδρεαν" are pre-INTF content → empty
{
  const f = path.join(BASE, '6/14.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  setEmpty(d, 'r1');
  setEmpty(d, 'r5');
  setEmpty(d, 'r6');
  setEmpty(d, 'r7');
  save(f, d, 'Luke 6:14 P4 r1,r5,r6,r7→empty');
}
