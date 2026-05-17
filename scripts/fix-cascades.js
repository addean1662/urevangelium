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

// ── Mark 9:44 — ubi vermis eorum non moritur et ignis non extinguitur ──────
// Greek: ὅπου ὁ σκώληξ αὐτῶν οὐ τελευτᾷ καὶ τὸ πῦρ οὐ σβέννυται (11 rows)
applyVulgate('mark', '9', '44', [
  { r: 'r1',  text: 'ubi',          gloss: 'where' },
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'vermis',       gloss: 'worm' },
  { r: 'r4',  text: 'eorum',        gloss: 'their' },
  { r: 'r5',  text: 'non',          gloss: 'not' },
  { r: 'r6',  text: 'moritur',      gloss: 'dies' },
  { r: 'r7',  text: 'et',           gloss: 'and' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'ignis',        gloss: 'fire' },
  { r: 'r10', text: 'non',          gloss: 'not' },
  { r: 'r11', text: 'extinguitur',  gloss: 'is quenched' },
]);

// ── Mark 9:45 — Et si pes tuus te scandalizat... (31 rows) ──────────────────
// The Vulgate refrain at end of 9:45 is handled separately as verse 9:46
applyVulgate('mark', '9', '45', [
  { r: 'r1',  text: 'Et',              gloss: 'and' },
  { r: 'r2',  text: 'si',              gloss: 'if' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'pes',             gloss: 'foot' },
  { r: 'r5',  text: 'tuus',            gloss: 'your' },
  { r: 'r6',  text: 'scandalizat',     gloss: 'causes to sin' },
  { r: 'r7',  text: 'te',              gloss: 'you' },
  { r: 'r8',  text: 'amputa',          gloss: 'cut off' },
  { r: 'r9',  text: 'illum',           gloss: 'it' },
  { r: 'r10', text: 'bonum',           gloss: 'good' },
  { r: 'r11', text: 'est',             gloss: 'is' },
  { r: 'r12', text: 'tibi',            gloss: 'for you' },
  { r: 'r13', text: 'intrare',         gloss: 'to enter' },
  { r: 'r14', text: 'in',              gloss: 'into' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'vitam aeternam',  gloss: 'eternal life' },
  { r: 'r17', text: 'claudum',         gloss: 'lame' },
  { r: 'r18', text: 'quam',            gloss: 'than' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'duos',            gloss: 'two' },
  { r: 'r21', text: 'pedes',           gloss: 'feet' },
  { r: 'r22', text: 'habentem',        gloss: 'having' },
  { r: 'r23', text: 'mitti',           gloss: 'to be thrown' },
  { r: 'r24', text: 'in',              gloss: 'into' },
  { r: 'r25', text: null },
  { r: 'r26', text: 'gehennam',        gloss: 'hell' },
  { r: 'r27', text: null },
  { r: 'r28', text: null },
  { r: 'r29', text: 'ignis',           gloss: 'of fire' },
  { r: 'r30', text: null },
  { r: 'r31', text: 'incomprehensibilis', gloss: 'unquenchable' },
]);

// ── Mark 9:46 — ubi vermis eorum non moritur et ignis non extinguitur ──────
applyVulgate('mark', '9', '46', [
  { r: 'r1',  text: 'ubi',          gloss: 'where' },
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'vermis',       gloss: 'worm' },
  { r: 'r4',  text: 'eorum',        gloss: 'their' },
  { r: 'r5',  text: 'non',          gloss: 'not' },
  { r: 'r6',  text: 'moritur',      gloss: 'dies' },
  { r: 'r7',  text: 'et',           gloss: 'and' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'ignis',        gloss: 'fire' },
  { r: 'r10', text: 'non',          gloss: 'not' },
  { r: 'r11', text: 'extinguitur',  gloss: 'is quenched' },
]);

// ── Mark 9:47 — Et si oculus tuus te scandalizat... (29 rows) ───────────────
applyVulgate('mark', '9', '47', [
  { r: 'r1',  text: 'Et',          gloss: 'and' },
  { r: 'r2',  text: 'si',          gloss: 'if' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'oculus',      gloss: 'eye' },
  { r: 'r5',  text: 'tuus',        gloss: 'your' },
  { r: 'r6',  text: 'scandalizat', gloss: 'causes to sin' },
  { r: 'r7',  text: 'te',          gloss: 'you' },
  { r: 'r8',  text: 'erue',        gloss: 'pluck out' },
  { r: 'r9',  text: 'eum',         gloss: 'it' },
  { r: 'r10', text: 'bonum',       gloss: 'good' },
  { r: 'r11', text: 'est',         gloss: 'is' },
  { r: 'r12', text: 'tibi',        gloss: 'for you' },
  { r: 'r13', text: 'luscum',      gloss: 'one-eyed' },
  { r: 'r14', text: 'intrare',     gloss: 'to enter' },
  { r: 'r15', text: 'in',          gloss: 'into' },
  { r: 'r16', text: null },
  { r: 'r17', text: 'regnum',      gloss: 'kingdom' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'Dei',         gloss: 'of God' },
  { r: 'r20', text: 'quam',        gloss: 'than' },
  { r: 'r21', text: 'duos',        gloss: 'two' },
  { r: 'r22', text: 'oculos',      gloss: 'eyes' },
  { r: 'r23', text: 'habentem',    gloss: 'having' },
  { r: 'r24', text: 'mitti',       gloss: 'to be thrown' },
  { r: 'r25', text: 'in',          gloss: 'into' },
  { r: 'r26', text: null },
  { r: 'r27', text: 'gehennam',    gloss: 'hell' },
  { r: 'r28', text: null },
  { r: 'r29', text: 'ignis',       gloss: 'of fire' },
]);

// ── Mark 9:48 — ubi vermis eorum non moritur et ignis non extinguitur ──────
applyVulgate('mark', '9', '48', [
  { r: 'r1',  text: 'ubi',          gloss: 'where' },
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'vermis',       gloss: 'worm' },
  { r: 'r4',  text: 'eorum',        gloss: 'their' },
  { r: 'r5',  text: 'non',          gloss: 'not' },
  { r: 'r6',  text: 'moritur',      gloss: 'dies' },
  { r: 'r7',  text: 'et',           gloss: 'and' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'ignis',        gloss: 'fire' },
  { r: 'r10', text: 'non',          gloss: 'not' },
  { r: 'r11', text: 'extinguitur',  gloss: 'is quenched' },
]);

// ── Matt 18:11 — Venit enim Filius hominis salvare quod perierat ─────────────
// Greek: Ἦλθεν γὰρ ὁ υἱὸς τοῦ ἀνθρώπου σῶσαι τὸ ἀπολωλός (9 rows)
applyVulgate('matthew', '18', '11', [
  { r: 'r1', text: 'Venit',    gloss: 'came' },
  { r: 'r2', text: 'enim',    gloss: 'for' },
  { r: 'r3', text: null },
  { r: 'r4', text: 'Filius',  gloss: 'Son' },
  { r: 'r5', text: null },
  { r: 'r6', text: 'hominis', gloss: 'of man' },
  { r: 'r7', text: 'salvare', gloss: 'to save' },
  { r: 'r8', text: 'quod',    gloss: 'what' },
  { r: 'r9', text: 'perierat', gloss: 'had been lost' },
]);

// ── Luke 17:36 — Duo in agro: unus assumetur et alter relinquetur ───────────
// Greek: δύο ἐν ἀγρῷ εἷς παραλημφθήσεται καὶ ὁ ἕτερος ἀφεθήσεται (9 rows)
applyVulgate('luke', '17', '36', [
  { r: 'r1', text: 'Duo',          gloss: 'two' },
  { r: 'r2', text: 'in',           gloss: 'in' },
  { r: 'r3', text: 'agro',         gloss: 'field' },
  { r: 'r4', text: 'unus',         gloss: 'one' },
  { r: 'r5', text: 'assumetur',    gloss: 'will be taken' },
  { r: 'r6', text: 'et',           gloss: 'and' },
  { r: 'r7', text: null },
  { r: 'r8', text: 'alter',        gloss: 'other' },
  { r: 'r9', text: 'relinquetur',  gloss: 'will be left' },
]);

// ── Luke 17:37 — Respondentes dicunt illi: Ubi, Domine? Qui dixit... ────────
// Greek: Καὶ ἀποκριθέντες λέγουσιν αὐτῷ Ποῦ κύριε Ὁ δὲ εἶπεν αὐτοῖς
//        Ὅπου τὸ σῶμα ἐκεῖ συναχθήσονται καὶ οἱ ἀετοί (18 rows)
applyVulgate('luke', '17', '37', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'Respondentes', gloss: 'answering' },
  { r: 'r3',  text: 'dicunt',       gloss: 'they said' },
  { r: 'r4',  text: 'illi',         gloss: 'to him' },
  { r: 'r5',  text: 'Ubi',          gloss: 'where' },
  { r: 'r6',  text: 'Domine',       gloss: 'Lord' },
  { r: 'r7',  text: 'Qui',          gloss: 'who' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'dixit',        gloss: 'said' },
  { r: 'r10', text: 'illis',        gloss: 'to them' },
  { r: 'r11', text: 'Ubicumque',    gloss: 'wherever' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'corpus',       gloss: 'body' },
  { r: 'r14', text: 'illuc',        gloss: 'there' },
  { r: 'r15', text: 'congregabuntur', gloss: 'will gather' },
  { r: 'r16', text: 'et',           gloss: 'and' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'aquilae',      gloss: 'eagles' },
]);

console.log('All cascades fixed.');
