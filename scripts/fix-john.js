// Fix John papyrus issues
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/john');

function textFix(d, id, text) {
  const row = d.rows.find(r => r.id === id);
  if (row?.papyrus?.type === 'extant') row.papyrus.text = text;
}

// Remove one papyrus ID from fragments in rows startId..endId.
// If removing leaves a row with no fragments, convert it to {type:'empty'}.
function narrowFragments(d, startId, endId, removeId) {
  const rowMap = {};
  for (const r of d.rows) rowMap[r.id] = r;
  const startN = parseInt(startId.slice(1));
  const endN   = parseInt(endId.slice(1));
  for (let n = startN; n <= endN; n++) {
    const row = rowMap['r' + n];
    if (row?.papyrus?.fragments) {
      row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== removeId);
      if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'empty' };
    }
  }
}

function save(f, d, msg) {
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed ' + msg);
}

// ── John 4:52 [P45] OVER_EXTENDED: ditto rows r21-r22 beyond INTF P45 ────────
// INTF P45 = 20 words (ends at ο πυρετος). r21-r22 = ditto ο πυρετος.¶
{
  const f = path.join(BASE, '4/52.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  narrowFragments(d, 'r21', 'r22', 'P45');
  save(f, d, 'John 4:52 P45 r21-r22→narrow (P45 OK)');
}

// ── John 4:53 [P45] OVER_EXTENDED: 15 extra words beyond INTF P45 ────────────
// INTF P45 = 12 words (εγνω…ειπεν). r13-r28 are P66/P75-only extension.
{
  const f = path.join(BASE, '4/53.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  narrowFragments(d, 'r13', 'r28', 'P45');
  save(f, d, 'John 4:53 P45 r13-r28→narrow (P45 OK)');
}

// ── John 5:2 [P45] OVER_EXTENDED: 4 extra words beyond INTF P45 ──────────────
// INTF P45 = 12 words (εστιν…εβραιστι). r13-r16 = βηθζαθα…εχουσα P66 only.
{
  const f = path.join(BASE, '5/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  narrowFragments(d, 'r13', 'r16', 'P45');
  save(f, d, 'John 5:2 P45 r13-r16→narrow (P45 OK)');
}

// ── John 10:13 [P44] OVER_EXTENDED: ditto r11-r14 beyond INTF P44 ────────────
// INTF P44 = 10 words (ends at προβατων). r11-r14 = ditto αυτω περι των προβατων.
{
  const f = path.join(BASE, '10/13.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  narrowFragments(d, 'r11', 'r14', 'P44');
  save(f, d, 'John 10:13 P44 r11-r14→narrow (P44 OK)');
}

// ── John 8:15 r3: "τη σαρκα" → "την σαρκα" ──────────────────────────────────
// INTF P39/P66/P75 all have "την" (accusative after κατα). Our data has "τη".
// Fixing P39 → OK. P66 and P75 still PARTIAL_MATCH (krinestai/de differences).
{
  const f = path.join(BASE, '8/15.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r3', 'την');
  save(f, d, 'John 8:15 r3 τη→την (P39 OK)');
}

// ── John 12:14 r6: "εκαθισε" → "εκαθισεν" ───────────────────────────────────
// INTF P2/P66/P75 all agree: εκαθισεν (with nu). Simple moveable-nu restoration.
{
  const f = path.join(BASE, '12/14.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r6', 'εκαθισεν');
  save(f, d, 'John 12:14 r6 εκαθισε→εκαθισεν (P2, P66, P75 OK)');
}

// ── John 18:2 r13: remove "ο" article before Jesus name ─────────────────────
// INTF P108/P59/P66 all have the Jesus NS form without the article.
// r13 = "ο" (P108+P59+P66) → narrow all three → r13 becomes empty.
// P108 and P66 → OK.  P59 still PARTIAL_MATCH (εκι vs εκει at r15).
{
  const f = path.join(BASE, '18/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  narrowFragments(d, 'r13', 'r13', 'P108');
  narrowFragments(d, 'r13', 'r13', 'P59');
  narrowFragments(d, 'r13', 'r13', 'P66');
  save(f, d, 'John 18:2 r13 remove ο-article (P108, P66 OK)');
}
