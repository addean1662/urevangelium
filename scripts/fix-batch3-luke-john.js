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

// ── Luke 6:27 — "Love your enemies, do good to those who hate you" ─────────
// GK: ἀλλ᾽ ὑμῖν λέγω τοῖς ἀκούουσιν· ἀγαπᾶτε τοὺς ἐχθροὺς ὑμῶν,
//     καλῶς ποιεῖτε τοῖς μισοῦσιν ὑμᾶς (14r)
// VL: Sed vobis dico qui auditis Diligite inimicos vestros benefacite his qui oderunt vos
// Problem: "oderunt" at article row r4 (τοῖς), "vos" at article row r7 (τοὺς); cascade
applyVulgate('luke', '6', '27', [
  { r: 'r4',  text: 'qui',         gloss: 'who' },
  { r: 'r5',  text: 'auditis',     gloss: 'listen' },
  { r: 'r6',  text: 'Diligite',    gloss: 'love' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'inimicos',    gloss: 'enemies' },
  { r: 'r9',  text: 'vestros',     gloss: 'your' },
  { r: 'r10', text: 'benefacite',  gloss: 'do good' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'his',         gloss: 'to those' },
  { r: 'r13', text: 'qui oderunt', gloss: 'who hate' },
  { r: 'r14', text: 'vos',         gloss: 'you' },
]);

// ── Luke 19:10 — "The Son of Man came to seek and save the lost" ─────────────
// GK: ἦλθεν γὰρ ὁ υἱὸς τοῦ ἀνθρώπου ζητῆσαι καὶ σῶσαι τὸ ἀπολωλός (11r)
// VL: Venit enim Filius hominis quærere et salvum facere quod perierat
// Problem: "quod" at article row r3 (ὁ), "perierat" at article row r5 (τοῦ);
//          "salvum facere" split; "quod perierat" missing at end
applyVulgate('luke', '19', '10', [
  { r: 'r3',  text: null },
  { r: 'r5',  text: null },
  { r: 'r9',  text: 'salvum facere',  gloss: 'to save' },
  { r: 'r11', text: 'quod perierat',  gloss: 'what was lost' },
]);

// ── John 5:24 — "Has passed from death to life" ──────────────────────────────
// GK: Ἀμὴν ἀμὴν λέγω ὑμῖν ὅτι ὁ τὸν λόγον μου ἀκούων καὶ πιστεύων τῷ
//     πέμψαντί με ἔχει ζωὴν αἰώνιον καὶ εἰς κρίσιν οὐκ ἔρχεται, ἀλλὰ
//     μεταβέβηκεν ἐκ τοῦ θανάτου εἰς τὴν ζωήν (31r)
// VL: Amen amen dico vobis quia qui verbum meum audit et credit ei qui misit me
//     habet vitam aeternam et in judicium non venit sed transiit a morte in vitam
// Problem: "morte" at article row r6 (ὁ), "in" at article row r7 (τὸν),
//          "vitam" at article row r13 (τῷ); massive cascade
applyVulgate('john', '5', '24', [
  { r: 'r6',  text: 'qui',          gloss: 'who' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'verbum',       gloss: 'word' },
  { r: 'r9',  text: 'meum',         gloss: 'my' },
  { r: 'r10', text: 'audit',        gloss: 'hears' },
  { r: 'r11', text: 'et',           gloss: 'and' },
  { r: 'r12', text: 'credit',       gloss: 'believes' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'ei qui misit', gloss: 'him who sent' },
  { r: 'r15', text: 'me',           gloss: 'me' },
  { r: 'r16', text: 'habet',        gloss: 'has' },
  { r: 'r17', text: 'vitam',        gloss: 'life' },
  { r: 'r18', text: 'aeternam',     gloss: 'eternal' },
  { r: 'r19', text: 'et',           gloss: 'and' },
  { r: 'r20', text: 'in',           gloss: 'into' },
  { r: 'r21', text: 'judicium',     gloss: 'judgment' },
  { r: 'r22', text: 'non',          gloss: 'not' },
  { r: 'r23', text: 'venit',        gloss: 'comes' },
  { r: 'r24', text: 'sed',          gloss: 'but' },
  { r: 'r25', text: 'transiit',     gloss: 'has passed' },
  { r: 'r26', text: 'a',            gloss: 'from' },
  { r: 'r28', text: 'morte',        gloss: 'death' },
  { r: 'r29', text: 'in',           gloss: 'into' },
  { r: 'r31', text: 'vitam',        gloss: 'life' },
]);

// ── John 6:40 — "Everyone who sees the Son and believes has eternal life" ─────
// GK: τοῦτο γάρ ἐστιν τὸ θέλημα τοῦ πατρός μου, ἵνα πᾶς ὁ θεωρῶν τὸν υἱὸν
//     καὶ πιστεύων εἰς αὐτὸν ἔχῃ ζωὴν αἰώνιον, καὶ ἀναστήσω αὐτὸν ἐγὼ
//     ἐν τῇ ἐσχάτῃ ἡμέρᾳ (29r)
// VL: Hæc est autem voluntas Patris mei qui misit me ut omnis qui videt Filium
//     et credit in eum habeat vitam aeternam et ego resuscitabo eum in novissimo die
// Problem: "eum" at article r4 (τὸ), "in" at genitive article r6 (τοῦ),
//          "novissimo" at article r11 (ὁ), "die" at article r13 (τὸν); massive cascade
applyVulgate('john', '6', '40', [
  { r: 'r4',  text: null },
  { r: 'r6',  text: 'qui misit me', gloss: 'who sent me' },
  { r: 'r9',  text: 'ut',           gloss: 'that' },
  { r: 'r10', text: 'omnis',        gloss: 'everyone' },
  { r: 'r11', text: 'qui',          gloss: 'who' },
  { r: 'r12', text: 'videt',        gloss: 'sees' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'Filium',       gloss: 'Son' },
  { r: 'r15', text: 'et',           gloss: 'and' },
  { r: 'r16', text: 'credit',       gloss: 'believes' },
  { r: 'r17', text: 'in',           gloss: 'in' },
  { r: 'r18', text: 'eum',          gloss: 'him' },
  { r: 'r19', text: 'habeat',       gloss: 'may have' },
  { r: 'r20', text: 'vitam',        gloss: 'life' },
  { r: 'r21', text: 'aeternam',     gloss: 'eternal' },
  { r: 'r22', text: 'et',           gloss: 'and' },
  { r: 'r23', text: 'resuscitabo',  gloss: 'I will raise' },
  { r: 'r24', text: 'eum',          gloss: 'him' },
  { r: 'r25', text: 'ego',          gloss: 'I' },
  { r: 'r26', text: 'in',           gloss: 'on' },
  { r: 'r28', text: 'novissimo',    gloss: 'last' },
  { r: 'r29', text: 'die',          gloss: 'day' },
]);

// ── John 10:27 — "My sheep hear my voice" ────────────────────────────────────
// GK: τὰ πρόβατα τὰ ἐμὰ τῆς φωνῆς μου ἀκούουσιν, κἀγὼ γινώσκω αὐτά,
//     καὶ ἀκολουθοῦσίν μοι (14r)
// VL: Oves meæ vocem meam audiunt et ego cognosco eas et sequuntur me
// Problem: "me" at article row r1 (τὰ); cascade r9-r14
applyVulgate('john', '10', '27', [
  { r: 'r1',  text: null },
  { r: 'r9',  text: 'et ego',     gloss: 'and I' },
  { r: 'r10', text: 'cognosco',   gloss: 'know' },
  { r: 'r11', text: 'eas',        gloss: 'them' },
  { r: 'r12', text: 'et',         gloss: 'and' },
  { r: 'r13', text: 'sequuntur',  gloss: 'follow' },
  { r: 'r14', text: 'me',         gloss: 'me' },
]);

// ── John 12:32 — "I will draw all to myself" ─────────────────────────────────
// GK: κἀγὼ ἐὰν ὑψωθῶ ἐκ τῆς γῆς, πάντας ἑλκύσω πρὸς ἐμαυτόν (10r)
// VL: Et ego si exaltatus fuero a terra omnia traham ad me ipsum
// Problem: "ego" at r2 (ἐὰν), entire verse shifted; "me ipsum" missing at end
applyVulgate('john', '12', '32', [
  { r: 'r1',  text: 'Et ego',          gloss: 'and I' },
  { r: 'r2',  text: 'si',              gloss: 'if' },
  { r: 'r3',  text: 'exaltatus fuero', gloss: 'shall be lifted up' },
  { r: 'r4',  text: 'a',               gloss: 'from' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'terra',           gloss: 'earth' },
  { r: 'r7',  text: 'omnia',           gloss: 'all' },
  { r: 'r8',  text: 'traham',          gloss: 'I will draw' },
  { r: 'r9',  text: 'ad',              gloss: 'to' },
  { r: 'r10', text: 'me ipsum',        gloss: 'myself' },
]);

// Verify
const verses = [
  ['luke', '6', '27'],
  ['luke', '19', '10'],
  ['john', '5', '24'],
  ['john', '6', '40'],
  ['john', '10', '27'],
  ['john', '12', '32'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
