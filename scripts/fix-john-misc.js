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

// ── John 19:30 — "It is finished" ─────────────────────────────────────────────
// Greek: ὅτε οὖν ἔλαβεν τὸ ὄξος ὁ Ἰησοῦς εἶπεν τετέλεσται καὶ κλίνας τὴν
//        κεφαλὴν παρέδωκεν τὸ πνεῦμα  (16 rows)
// Vulgate: Cum ergo accepisset Jesus acetum dixit Consummatum est
//          Et inclinato capite tradidit spiritum
applyMap('data/john/19/30.json', [
  { r: 'r4',  text: null },                             // τό = article
  { r: 'r5',  text: 'acetum',        gloss: 'vinegar' },
  { r: 'r7',  text: 'Jesus',         gloss: 'Jesus' },
  { r: 'r9',  text: 'Consummatum est', gloss: 'it is finished' },
  { r: 'r10', text: 'Et',            gloss: 'and' },
  { r: 'r11', text: 'inclinato',     gloss: 'having bowed' },
  { r: 'r13', text: 'capite',        gloss: 'head' },
  { r: 'r14', text: 'tradidit',      gloss: 'gave up' },
  { r: 'r16', text: 'spiritum',      gloss: 'spirit' },
]);
console.log('Fixed John 19:30');

// ── John 20:31 — written that you may believe ─────────────────────────────────
// Greek: ταῦτα δὲ γέγραπται ἵνα πιστεύσητε ὅτι ὁ Ἰησοῦς ἐστιν ὁ χριστὸς ὁ
//        υἱὸς τοῦ θεοῦ καὶ ἵνα πιστεύοντες ζωὴν ἔχητε ἐν τῷ ὀνόματι αὐτοῦ (24r)
// Vulgate: Haec autem scripta sunt ut credatis quia Jesus est Christus Filius Dei
//          et ut credentes vitam habeatis in nomine ejus
applyMap('data/john/20/31.json', [
  { r: 'r3',  text: 'scripta sunt', gloss: 'have been written' },
  { r: 'r4',  text: 'ut',           gloss: 'that' },
  { r: 'r5',  text: 'credatis',     gloss: 'you may believe' },
  { r: 'r6',  text: 'quia',         gloss: 'that' },
  { r: 'r7',  text: null },                             // ὁ = article
  { r: 'r8',  text: 'Jesus',        gloss: 'Jesus' },
  { r: 'r9',  text: 'est',          gloss: 'is' },
  { r: 'r10', text: null },                             // ὁ = article
  { r: 'r11', text: 'Christus',     gloss: 'Christ' },
  { r: 'r12', text: null },                             // ὁ = article
  { r: 'r13', text: 'Filius',       gloss: 'Son' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'Dei',          gloss: 'of God' },
  { r: 'r16', text: 'et',           gloss: 'and' },
  { r: 'r17', text: 'ut',           gloss: 'that' },
  { r: 'r18', text: 'credentes',    gloss: 'believing' },
  { r: 'r19', text: 'vitam',        gloss: 'life' },
  { r: 'r20', text: 'habeatis',     gloss: 'you may have' },
  { r: 'r21', text: 'in',           gloss: 'in' },
  { r: 'r22', text: null },
  { r: 'r23', text: 'nomine',       gloss: 'name' },
  { r: 'r24', text: 'ejus',         gloss: 'his' },
]);
console.log('Fixed John 20:31');

// Verify
const j1930 = JSON.parse(fs.readFileSync('data/john/19/30.json', 'utf8'))
  .rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
const j2031 = JSON.parse(fs.readFileSync('data/john/20/31.json', 'utf8'))
  .rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
console.log('John 19:30:', j1930);
console.log('John 20:31:', j2031);
