const fs = require('fs');

function applyMap(path, mapping) {
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const map = {};
  mapping.forEach(m => { map[m.r] = m; });
  d.rows = d.rows.map(row => {
    const m = map[row.id];
    if (!m) return row;
    return {
      ...row,
      vulgate: m.text
        ? { type: 'text', text: m.text, gloss: { gloss: m.gloss || m.text, source: 'Whitaker' } }
        : { type: 'empty' },
    };
  });
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
}

// ── John 11:25 — "I am the resurrection and the life" ─────────────────────────
// Greek: Εἶπεν αὐτῇ ὁ Ἰησοῦς Ἐγώ εἰμι ἡ ἀνάστασις καὶ ἡ ζωή ὁ πιστεύων
//        εἰς ἐμὲ κἂν ἀποθάνῃ ζήσεται (18 rows)
// Vulgate: Dixit ei Jesus Ego sum resurrectio et vita qui credit in me
//          etiam si mortuus fuerit vivet
applyMap('data/john/11/25.json', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r10', text: null },
  { r: 'r12', text: null },
  { r: 'r13', text: 'qui credit', gloss: 'who believes' },
  { r: 'r14', text: 'in',         gloss: 'in' },
  { r: 'r15', text: 'me',         gloss: 'me' },
  { r: 'r16', text: 'etiam si',   gloss: 'even if' },
  { r: 'r17', text: 'mortuus fuerit', gloss: 'should die' },
  { r: 'r18', text: 'vivet',      gloss: 'will live' },
]);
console.log('Fixed John 11:25');

// ── Luke 22:20 — New Covenant cup ─────────────────────────────────────────────
// Greek: καὶ τὸ ποτήριον ὡσαύτως μετὰ τὸ δειπνῆσαι λέγων τοῦτο τὸ ποτήριον
//        ἡ καινὴ διαθήκη ἐν τῷ αἵματί μου τὸ ὑπὲρ ὑμῶν ἐκχυννόμενον (22 rows)
// Vulgate: Similiter et calicem postquam coenavit dicens
//          Hic calix novum testamentum est in sanguine meo qui pro vobis fundetur
applyMap('data/luke/22/20.json', [
  { r: 'r2',  text: 'et',          gloss: 'also' },
  { r: 'r3',  text: 'calicem',     gloss: 'cup' },
  { r: 'r4',  text: 'postquam',    gloss: 'after' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: null },
  { r: 'r11', text: 'calix',       gloss: 'cup' },
  { r: 'r12', text: 'est',         gloss: 'is' },
  { r: 'r13', text: 'novum',       gloss: 'new' },
  { r: 'r14', text: 'testamentum', gloss: 'covenant' },
  { r: 'r15', text: 'in',          gloss: 'in' },
  { r: 'r16', text: null },
  { r: 'r17', text: 'sanguine',    gloss: 'blood' },
  { r: 'r18', text: 'meo',         gloss: 'my' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'qui',         gloss: 'which' },
  { r: 'r21', text: 'pro vobis',   gloss: 'for you' },
  { r: 'r22', text: 'fundetur',    gloss: 'will be poured' },
]);
console.log('Fixed Luke 22:20');

// Verify
const j1125 = JSON.parse(fs.readFileSync('data/john/11/25.json', 'utf8'))
  .rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
const l2220 = JSON.parse(fs.readFileSync('data/luke/22/20.json', 'utf8'))
  .rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
console.log('John 11:25:', j1125);
console.log('Luke 22:20:', l2220);
