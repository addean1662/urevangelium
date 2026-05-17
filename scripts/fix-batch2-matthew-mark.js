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

// ── Matt 5:10 — Beatitude: persecuted for righteousness ──────────────────────
// GK: Μακάριοι οἱ δεδιωγμένοι ἕνεκεν δικαιοσύνης, ὅτι αὐτῶν ἐστιν ἡ βασιλεία τῶν οὐρανῶν (12r)
// VL: Beati qui persecutionem patiuntur propter justitiam quoniam ipsorum est regnum caelorum
// Problem: "regnum" at article row r2 (οἱ), "cælorum" at article row r9 (ἡ); cascade
applyVulgate('matthew', '5', '10', [
  { r: 'r2',  text: 'qui',                     gloss: 'who' },
  { r: 'r3',  text: 'persecutionem patiuntur',  gloss: 'suffer persecution' },
  { r: 'r4',  text: 'propter',                  gloss: 'for' },
  { r: 'r5',  text: 'justitiam',                gloss: 'righteousness' },
  { r: 'r6',  text: 'quoniam',                  gloss: 'for' },
  { r: 'r7',  text: 'ipsorum',                  gloss: 'theirs' },
  { r: 'r8',  text: 'est',                      gloss: 'is' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'regnum',                   gloss: 'kingdom' },
  { r: 'r12', text: 'caelorum',                 gloss: 'of heavens' },
]);

// ── Matt 5:45 — Love enemies like Father loves all ───────────────────────────
// GK: ὅπως γένησθε υἱοὶ τοῦ πατρὸς ὑμῶν τοῦ ἐν τοῖς οὐρανοῖς, ὅτι τὸν ἥλιον
//     αὐτοῦ ἀνατέλλει ἐπὶ πονηροὺς καὶ ἀγαθοὺς καὶ βρέχει ἐπὶ δικαίους καὶ ἀδίκους (25r)
// VL: ut sitis filii Patris vestri qui est in caelis qui solem suum oriri facit
//     super bonos et malos et pluit super iustos et iniustos
// Problem: "justos" at article row r4 (τοῦ), "injustos" at article row r9 (τοῖς); cascade
applyVulgate('matthew', '5', '45', [
  { r: 'r4',  text: null },
  { r: 'r7',  text: 'qui est',    gloss: 'who is' },
  { r: 'r8',  text: 'in',         gloss: 'in' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'caelis',     gloss: 'heavens' },
  { r: 'r11', text: 'qui',        gloss: 'who' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'solem',      gloss: 'sun' },
  { r: 'r14', text: 'suum',       gloss: 'his' },
  { r: 'r15', text: 'oriri facit', gloss: 'makes rise' },
  { r: 'r16', text: 'super',      gloss: 'upon' },
  { r: 'r17', text: 'malos',      gloss: 'evil' },
  { r: 'r18', text: 'et',         gloss: 'and' },
  { r: 'r19', text: 'bonos',      gloss: 'good' },
  { r: 'r20', text: 'et',         gloss: 'and' },
  { r: 'r21', text: 'pluit',      gloss: 'rains' },
  { r: 'r22', text: 'super',      gloss: 'upon' },
  { r: 'r23', text: 'justos',     gloss: 'just' },
  { r: 'r24', text: 'et',         gloss: 'and' },
  { r: 'r25', text: 'injustos',   gloss: 'unjust' },
]);

// ── Matt 5:48 — "Be perfect as your heavenly Father is perfect" ──────────────
// GK: ἔσεσθε οὖν ὑμεῖς τέλειοι ὡς ὁ πατὴρ ὑμῶν ὁ οὐράνιος τέλειός ἐστιν (12r)
// VL: Estote ergo vos perfecti sicut et Pater vester caelestis perfectus est
// Problem: "est" at article row r6 (ὁ), cascade through r12
applyVulgate('matthew', '5', '48', [
  { r: 'r5',  text: 'sicut et',  gloss: 'just as also' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'Pater',     gloss: 'Father' },
  { r: 'r8',  text: 'vester',    gloss: 'your' },
  { r: 'r10', text: 'caelestis', gloss: 'heavenly' },
  { r: 'r11', text: 'perfectus', gloss: 'perfect' },
  { r: 'r12', text: 'est',       gloss: 'is' },
]);

// ── Matt 19:14 — "Let the children come to me" ───────────────────────────────
// GK: ὁ δὲ Ἰησοῦς εἶπεν· ἄφετε τὰ παιδία καὶ μὴ κωλύετε αὐτὰ ἐλθεῖν πρός με·
//     τῶν γὰρ τοιούτων ἐστὶν ἡ βασιλεία τῶν οὐρανῶν (22r)
// VL: Jesus vero ait eis Sinite parvulos et nolite eos prohibere ad me venire
//     talium est enim regnum caelorum
// Problem: "cælorum" at article row r1 (ὁ); r2/r3 swapped; "eis" cascade
applyVulgate('matthew', '19', '14', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'vero',       gloss: 'truly' },
  { r: 'r3',  text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r4',  text: 'ait eis',    gloss: 'said to them' },
  { r: 'r5',  text: 'Sinite',     gloss: 'allow' },
  { r: 'r7',  text: 'parvulos',   gloss: 'little ones' },
  { r: 'r8',  text: 'et',         gloss: 'and' },
  { r: 'r9',  text: 'nolite',     gloss: 'do not' },
  { r: 'r10', text: 'prohibere',  gloss: 'forbid' },
  { r: 'r11', text: 'eos',        gloss: 'them' },
  { r: 'r12', text: 'venire',     gloss: 'to come' },
  { r: 'r13', text: 'ad',         gloss: 'to' },
  { r: 'r14', text: 'me',         gloss: 'me' },
  { r: 'r16', text: 'enim',       gloss: 'for' },
  { r: 'r17', text: 'talium',     gloss: 'of such' },
  { r: 'r18', text: 'est',        gloss: 'is' },
  { r: 'r20', text: 'regnum',     gloss: 'kingdom' },
  { r: 'r22', text: 'caelorum',   gloss: 'of heavens' },
]);

// ── Matt 26:28 — Blood of the New Covenant ───────────────────────────────────
// GK: τοῦτο γάρ ἐστιν τὸ αἷμά μου τὸ τῆς καινῆς διαθήκης τὸ περὶ πολλῶν
//     ἐκχυννόμενον εἰς ἄφεσιν ἁμαρτιῶν (17r)
// VL: Hic est enim sanguis meus novi testamenti qui pro multis effundetur in remissionem peccatorum
// Problem: "peccatorum" at article row r4 (τὸ); r11-r17 cascade
applyVulgate('matthew', '26', '28', [
  { r: 'r4',  text: null },
  { r: 'r11', text: 'qui',          gloss: 'which' },
  { r: 'r12', text: 'pro',          gloss: 'for' },
  { r: 'r13', text: 'multis',       gloss: 'many' },
  { r: 'r14', text: 'effundetur',   gloss: 'will be poured out' },
  { r: 'r15', text: 'in',           gloss: 'for' },
  { r: 'r16', text: 'remissionem',  gloss: 'forgiveness' },
  { r: 'r17', text: 'peccatorum',   gloss: 'of sins' },
]);

// ── Mark 1:11 — Baptism: voice from heaven ───────────────────────────────────
// GK: καὶ φωνὴ ἐγένετο ἐκ τῶν οὐρανῶν· σὺ εἶ ὁ υἱός μου ὁ ἀγαπητός,
//     ἐν σοὶ εὐδόκησα (16r)
// VL: Et vox de caelis facta est Tu es Filius meus dilectus in te complacui
// Problem: "complacui" at article row r5 (τῶν); cascade r5-r16
applyVulgate('mark', '1', '11', [
  { r: 'r3',  text: 'facta est',  gloss: 'was made' },
  { r: 'r4',  text: 'de',         gloss: 'from' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'caelis',     gloss: 'heavens' },
  { r: 'r7',  text: 'Tu',         gloss: 'You' },
  { r: 'r8',  text: 'es',         gloss: 'are' },
  { r: 'r10', text: 'Filius',     gloss: 'Son' },
  { r: 'r11', text: 'meus',       gloss: 'my' },
  { r: 'r13', text: 'dilectus',   gloss: 'beloved' },
  { r: 'r14', text: 'in',         gloss: 'in' },
  { r: 'r15', text: 'te',         gloss: 'you' },
  { r: 'r16', text: 'complacui',  gloss: 'I am well pleased' },
]);

// ── Mark 10:27 — "With God all things are possible" ─────────────────────────
// GK: ἐμβλέψας δὲ αὐτοῖς ὁ Ἰησοῦς λέγει· παρὰ ἀνθρώποις ἀδύνατον ἀλλ᾽ οὐ
//     παρὰ τῷ θεῷ· πάντα γὰρ δυνατὰ ἐστιν παρὰ τῷ θεῷ (21r)
// VL: Et intuens illos Jesus ait Apud homines impossibile est sed non apud Deum
//     omnia enim possibilia sunt apud Deum
// Problem: "Deum" at article row r4 (ὁ); "est" at r10 (ἀλλ᾽); cascade
applyVulgate('mark', '10', '27', [
  { r: 'r4',  text: null },
  { r: 'r9',  text: 'impossibile est', gloss: 'is impossible' },
  { r: 'r10', text: 'sed',             gloss: 'but' },
  { r: 'r11', text: 'non',             gloss: 'not' },
  { r: 'r12', text: 'apud',            gloss: 'with' },
  { r: 'r14', text: 'Deum',            gloss: 'God' },
  { r: 'r15', text: 'omnia',           gloss: 'all things' },
  { r: 'r16', text: 'enim',            gloss: 'for' },
  { r: 'r17', text: 'possibilia',      gloss: 'possible' },
  { r: 'r18', text: 'sunt',            gloss: 'are' },
  { r: 'r19', text: 'apud',            gloss: 'with' },
  { r: 'r21', text: 'Deum',            gloss: 'God' },
]);

// Verify
const verses = [
  ['matthew', '5', '10'],
  ['matthew', '5', '45'],
  ['matthew', '5', '48'],
  ['matthew', '19', '14'],
  ['matthew', '26', '28'],
  ['mark', '1', '11'],
  ['mark', '10', '27'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
