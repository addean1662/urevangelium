// Fix Luke papyrus issues — Part 2
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/luke');

function P75(text, gloss) {
  return { type:'extant', fragments:[{id:'P75', date:'c. 175–225 CE'}], text, gloss:{gloss, source:'TAGNT'} };
}

function textFix(d, id, text) {
  const row = d.rows.find(r => r.id === id);
  if (row?.papyrus?.type === 'extant') row.papyrus.text = text;
}

function save(f, d, msg) {
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed ' + msg);
}

// ── Luke 3:21 regression: revert r6 "απαντα"→"παντα" ─────────────────────────
// P4 and P75 share this row. INTF P4 = "παντα", INTF P75 = "απαντα".
// "παντα" is correct for P4 (the older papyrus); P75 mismatch is irresolvable.
{
  const f = path.join(BASE, '3/21.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  textFix(d, 'r6', 'παντα');
  save(f, d, 'Luke 3:21 revert r6→παντα (restore P4, accept P75 variant)');
}

// ── Luke 6:14: restore r1,r5,r6,r7 as P75-only (P4 fix left r1=empty) ─────────
// INTF P4 starts at "ον" (r2) — r1,r5,r6,r7 are not in P4 INTF.
// INTF P75 has "σιμωνα ον και ωνομασεν πετρον και ανδρεαν..." — needs r1,r5,r6,r7.
// Solution: keep those rows extant with P75-only fragments.
{
  const f = path.join(BASE, '6/14.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rowMap = {};
  for (const r of d.rows) rowMap[r.id] = r;
  rowMap['r1'].papyrus = P75('σιμωνα', 'Simon');
  rowMap['r5'].papyrus = P75('πετρον', 'Peter');
  rowMap['r6'].papyrus = P75('και', 'and');
  rowMap['r7'].papyrus = P75('ανδρεαν', 'Andrew');
  save(f, d, 'Luke 6:14 restore r1,r5,r6,r7 as P75-only');
}

// ── Luke 9:55 [P45] MISMATCH: "επετιμησεν"→"επετειμησεν" ─────────────────────
// INTF has "επετειμησεν" (with ε); our data has "επετιμησεν"
{
  const f = path.join(BASE, '9/55.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  // Find the row with this text
  const row = d.rows.find(r => r.papyrus?.text === 'επετιμησεν');
  if (row) { row.papyrus.text = 'επετειμησεν'; }
  save(f, d, 'Luke 9:55 P45 επετιμησεν→επετειμησεν');
}

// ── Luke 10:12 [P75] OVER_EXTENDED: r15 is 1 extra word → lost ───────────────
// r15 has only P75 (verified); INTF P75 ends at r14
{
  const f = path.join(BASE, '10/12.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const row = d.rows.find(r => r.id === 'r15');
  if (row) row.papyrus = { type: 'lost' };
  save(f, d, 'Luke 10:12 P75 r15→lost');
}

// ── Luke 24:30 [P141] DISPLACEMENT: r1-r6 → lost ─────────────────────────────
// Report explicitly says: "set rows 1–6 to lost; papyrus starts at row 7"
// P141+P75 share rows. Setting r1-r6 to lost removes the displaced content
// and makes the sequence start correctly from r7 "μετ᾽ αυτων..."
{
  const f = path.join(BASE, '24/30.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let n = 1; n <= 6; n++) {
    const row = d.rows.find(r => r.id === 'r' + n);
    if (row) row.papyrus = { type: 'lost' };
  }
  save(f, d, 'Luke 24:30 P141 r1-r6→lost (displacement fix)');
}
