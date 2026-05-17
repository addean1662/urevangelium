const fs = require('fs');

function applyVulgate(gospel, ch, v, mapping) {
  const path = `data/${gospel}/${ch}/${v}.json`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const map = {};
  mapping.forEach(m => { map[m.r] = m; });
  d.rows = d.rows.map(row => {
    const m = map[row.id];
    if (!m) return row;
    const cell = m.text
      ? { type: 'text', text: m.text, gloss: { gloss: m.gloss || m.text, source: 'Whitaker' } }
      : { type: 'empty' };
    return { ...row, vulgate: cell };
  });
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log('Fixed ' + gospel + ' ' + ch + ':' + v);
}

// ── John 3:36 — "who believes in the Son has eternal life" ───────────────────
// GK: ὁ πιστεύων εἰς τὸν υἱὸν ἔχει ζωὴν αἰώνιον· ὁ δὲ ἀπειθῶν τῷ υἱῷ
//     οὐκ ὄψεται ζωήν, ἀλλ᾽ ἡ ὀργὴ τοῦ θεοῦ μένει ἐπ᾽ αὐτόν (24 rows)
// VL: Qui credit in Filium habet vitam aeternam qui autem incredulus est Filio
//     non videbit vitam sed ira Dei manet super eum
// Problem: "manet/super/eum" displaced to article rows r1/r4/r9; cascade
applyVulgate('john', '3', '36', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'Qui credit',     gloss: 'who believes' },
  { r: 'r3',  text: 'in',             gloss: 'in' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Filium',         gloss: 'Son' },
  { r: 'r6',  text: 'habet',          gloss: 'has' },
  { r: 'r7',  text: 'vitam',          gloss: 'life' },
  { r: 'r8',  text: 'æternam',        gloss: 'eternal' },
  { r: 'r9',  text: 'qui',            gloss: 'who' },
  { r: 'r10', text: 'autem',          gloss: 'but' },
  { r: 'r11', text: 'incredulus est', gloss: 'is unbelieving' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'Filio',          gloss: 'Son' },
  { r: 'r14', text: 'non',            gloss: 'not' },
  { r: 'r15', text: 'videbit',        gloss: 'will see' },
  { r: 'r16', text: 'vitam',          gloss: 'life' },
  { r: 'r17', text: 'sed',            gloss: 'but' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'ira',            gloss: 'wrath' },
  { r: 'r20', text: null },
  { r: 'r21', text: 'Dei',            gloss: 'of God' },
  { r: 'r22', text: 'manet',          gloss: 'remains' },
  { r: 'r23', text: 'super',          gloss: 'upon' },
  { r: 'r24', text: 'eum',            gloss: 'him' },
]);

// ── John 8:12 — "I am the light of the world" ────────────────────────────────
// GK: Πάλιν οὖν αὐτοῖς ἐλάλησεν ὁ Ἰησοῦς λέγων· ἐγώ εἰμι τὸ φῶς τοῦ κόσμου·
//     ὁ ἀκολουθῶν ἐμοὶ οὐ μὴ περιπατήσῃ ἐν τῇ σκοτίᾳ ἀλλ᾽ ἕξει τὸ φῶς τῆς ζωῆς (28 rows)
// VL: Iterum ergo locutus est eis Jesus dicens Ego sum lux mundi qui sequitur me
//     non ambulat in tenebris sed habebit lumen vitæ
// Problem: "vitæ" displaced to article row r5 (ὁ); cascade from r3 onward
applyVulgate('john', '8', '12', [
  { r: 'r1',  text: 'Iterum',     gloss: 'again' },
  { r: 'r2',  text: 'ergo',       gloss: 'therefore' },
  { r: 'r3',  text: 'eis',        gloss: 'to them' },
  { r: 'r4',  text: 'locutus est', gloss: 'spoke' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r7',  text: 'dicens',     gloss: 'saying' },
  { r: 'r8',  text: 'Ego',        gloss: 'I' },
  { r: 'r9',  text: 'sum',        gloss: 'am' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'lux',        gloss: 'light' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'mundi',      gloss: 'of the world' },
  { r: 'r14', text: 'qui',        gloss: 'who' },
  { r: 'r15', text: 'sequitur',   gloss: 'follows' },
  { r: 'r16', text: 'me',         gloss: 'me' },
  { r: 'r17', text: 'non',        gloss: 'not' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'ambulat',    gloss: 'walks' },
  { r: 'r20', text: 'in',         gloss: 'in' },
  { r: 'r21', text: null },
  { r: 'r22', text: 'tenebris',   gloss: 'darkness' },
  { r: 'r23', text: 'sed',        gloss: 'but' },
  { r: 'r24', text: 'habebit',    gloss: 'will have' },
  { r: 'r25', text: null },
  { r: 'r26', text: 'lumen',      gloss: 'light' },
  { r: 'r27', text: null },
  { r: 'r28', text: 'vitæ',       gloss: 'of life' },
]);

// ── John 15:5 — "I am the vine, you are the branches" ────────────────────────
// GK: ἐγώ εἰμι ἡ ἄμπελος, ὑμεῖς τὰ κλήματα· ὁ μένων ἐν ἐμοὶ κἀγὼ ἐν αὐτῷ,
//     οὗτος φέρει καρπὸν πολύν· ὅτι χωρὶς ἐμοῦ οὐ δύνασθε ποιεῖν οὐδέν (25 rows)
// VL: Ego sum vitis vos palmites qui manet in me et ego in eo hic fert fructum
//     multum quia sine me nihil potestis facere
// Problem: "facere" displaced to article row r3 (ἡ); cascade from r8 onward
applyVulgate('john', '15', '5', [
  { r: 'r3',  text: null },
  { r: 'r8',  text: 'qui',     gloss: 'who' },
  { r: 'r9',  text: 'manet',   gloss: 'abides' },
  { r: 'r10', text: 'in',      gloss: 'in' },
  { r: 'r11', text: 'me',      gloss: 'me' },
  { r: 'r12', text: 'et ego',  gloss: 'and I' },
  { r: 'r13', text: 'in',      gloss: 'in' },
  { r: 'r14', text: 'eo',      gloss: 'him' },
  { r: 'r15', text: 'hic',     gloss: 'this one' },
  { r: 'r16', text: 'fert',    gloss: 'bears' },
  { r: 'r17', text: 'fructum', gloss: 'fruit' },
  { r: 'r18', text: 'multum',  gloss: 'much' },
  { r: 'r19', text: 'quia',    gloss: 'because' },
  { r: 'r20', text: 'sine',    gloss: 'apart from' },
  { r: 'r21', text: 'me',      gloss: 'me' },
  { r: 'r22', text: 'nihil',   gloss: 'nothing' },
  { r: 'r23', text: 'potestis', gloss: 'you can' },
  { r: 'r24', text: 'facere',  gloss: 'to do' },
  { r: 'r25', text: null },
]);

// Verify
['john/3/36', 'john/8/12', 'john/15/5'].forEach(ref => {
  const d = JSON.parse(require('fs').readFileSync('data/' + ref + '.json', 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(ref + ': ' + text);
});
