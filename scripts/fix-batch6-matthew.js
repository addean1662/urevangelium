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

// ── Matt 10:4 — Simon the Cananean, Judas who betrayed him ───────────────────
// GK: καὶ Σίμων ὁ Καναναῖος καὶ Ἰούδας ὁ Ἰσκαριώτης ὁ καὶ παραδοὺς αὐτόν
// VL: et Simon Chananaeus et Judas Iscariotes qui et tradidit eum
// Problem: "eum" at article row r2 (ὁ before Καναναῖος); cascade r8-r11
applyVulgate('matthew', '10', '4', [
  { r: 'r2',  text: null },
  { r: 'r8',  text: 'qui',      gloss: 'who' },
  { r: 'r9',  text: 'et',       gloss: 'also' },
  { r: 'r10', text: 'tradidit', gloss: 'betrayed' },
  { r: 'r11', text: 'eum',      gloss: 'him' },
]);

// ── Matt 10:22 — "He who endures to the end will be saved" ───────────────────
// GK: καὶ ἔσεσθε μισούμενοι ὑπὸ πάντων διὰ τὸ ὄνομά μου· ὁ δὲ ὑπομείνας
//     εἰς τέλος, οὗτος σωθήσεται (16r)
// VL: et eritis odio omnibus propter nomen meum; qui autem perseveraverit
//     usque in finem hic salvus erit
// Problem: "omnibus" 1 row early at ὑπὸ (r4); cascade r4-r16
applyVulgate('matthew', '10', '22', [
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'omnibus',      gloss: 'by all' },
  { r: 'r6',  text: 'propter',      gloss: 'on account of' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'nomen',        gloss: 'name' },
  { r: 'r9',  text: 'meum',         gloss: 'my' },
  { r: 'r10', text: 'qui',          gloss: 'who' },
  { r: 'r11', text: 'autem',        gloss: 'but' },
  { r: 'r12', text: 'perseveraverit', gloss: 'shall have endured' },
  { r: 'r13', text: 'usque in',     gloss: 'even to' },
  { r: 'r14', text: 'finem',        gloss: 'end' },
  { r: 'r15', text: 'hic',          gloss: 'this one' },
  { r: 'r16', text: 'salvus erit',  gloss: 'will be saved' },
]);

// ── Matt 11:11 — "Least in kingdom is greater than John" ─────────────────────
// GK: οὐκ ἐγήγερται ... μείζων Ἰωάννου τοῦ βαπτιστοῦ· ὁ δὲ μικρότερος ἐν
//     τῇ βασιλείᾳ τῶν οὐρανῶν μείζων αὐτοῦ ἐστιν (23r)
// VL: non surrexit ... major Johanne Baptista; qui autem minor est in regno
//     cælorum major est illo
// Problem: "est" at genitive article r11 (τοῦ); "illo" at article r13 (ὁ); cascade
applyVulgate('matthew', '11', '11', [
  { r: 'r11', text: null },
  { r: 'r13', text: 'qui',      gloss: 'who' },
  { r: 'r14', text: 'autem',    gloss: 'but' },
  { r: 'r15', text: 'minor est', gloss: 'is lesser' },
  { r: 'r16', text: 'in',       gloss: 'in' },
  { r: 'r18', text: 'regno',    gloss: 'kingdom' },
  { r: 'r20', text: 'cælorum',  gloss: 'of heavens' },
  { r: 'r21', text: 'major',    gloss: 'greater' },
  { r: 'r22', text: 'illo',     gloss: 'than him' },
  { r: 'r23', text: 'est',      gloss: 'is' },
]);

// ── Matt 11:12 — "Kingdom suffers violence and the violent take it" ───────────
// GK: ἀπὸ δὲ τῶν ἡμερῶν Ἰωάννου τοῦ βαπτιστοῦ ἕως ἄρτι ἡ βασιλεία τῶν
//     οὐρανῶν βιάζεται, καὶ βιασταὶ ἁρπάζουσιν αὐτήν (18r)
// VL: A diebus autem Joannis Baptistæ usque nunc regnum cælorum vim patitur
//     et violenti rapiunt illud
// Problem: "illud" at article r3 (τῶν); δέ/ἡμερῶν swapped; cascade r14-r18
applyVulgate('matthew', '11', '12', [
  { r: 'r2',  text: 'autem',       gloss: 'but' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'diebus',      gloss: 'days' },
  { r: 'r14', text: 'vim patitur', gloss: 'suffers violence' },
  { r: 'r15', text: 'et',          gloss: 'and' },
  { r: 'r16', text: 'violenti',    gloss: 'the violent' },
  { r: 'r17', text: 'rapiunt',     gloss: 'seize' },
  { r: 'r18', text: 'illud',       gloss: 'it' },
]);

// ── Matt 11:13 — "Prophets and law prophesied until John" ─────────────────────
// GK: πάντες γὰρ οἱ προφῆται καὶ ὁ νόμος ἕως Ἰωάννου ἐπροφήτευσαν (10r)
// VL: Omnes enim prophetæ et lex usque ad Joannem prophetaverunt
// Problem: "prophetaverunt" at article r3 (οἱ); "ad Joannem" split at r9/r10
applyVulgate('matthew', '11', '13', [
  { r: 'r3',  text: null },
  { r: 'r9',  text: 'ad Joannem',     gloss: 'to John' },
  { r: 'r10', text: 'prophetaverunt', gloss: 'prophesied' },
]);

// ── Matt 12:13 — "Stretch out your hand" — healed like the other ─────────────
// GK: Τότε λέγει τῷ ἀνθρώπῳ· ἔκτεινόν σου τὴν χεῖρα. καὶ ἐξέτεινεν, καὶ
//     ἀπεκατεστάθη ὑγιὴς ὡς ἡ ἄλλη (16r)
// VL: Tunc ait homini Extende manum tuam Et extendit et restituta est sanitati sicut altera
// Problem: "altera" at dative article r3 (τῷ); σου/χεῖρα swapped; cascade r12-r16
applyVulgate('matthew', '12', '13', [
  { r: 'r3',  text: null },
  { r: 'r6',  text: 'tuam',          gloss: 'your' },
  { r: 'r8',  text: 'manum',         gloss: 'hand' },
  { r: 'r12', text: 'restituta est', gloss: 'was restored' },
  { r: 'r13', text: 'sanitati',      gloss: 'to health' },
  { r: 'r14', text: 'sicut',         gloss: 'as' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'altera',        gloss: 'the other' },
]);

// ── Matt 12:48 — "Who is my mother? Who are my brothers?" ────────────────────
// GK: ὁ δὲ ἀποκριθεὶς εἶπεν τῷ λέγοντι αὐτῷ· τίς ἐστιν ἡ μήτηρ μου καὶ
//     τίνες εἰσὶν οἱ ἀδελφοί μου; (18r)
// VL: At ipse respondens ait ei Quæ est mater mea et qui sunt fratres mei
// Problem: "mei" at article row r1 (ὁ); massive cascade through r18
applyVulgate('matthew', '12', '48', [
  { r: 'r1',  text: 'ipse',    gloss: 'he himself' },
  { r: 'r3',  text: 'respondens', gloss: 'answering' },
  { r: 'r4',  text: 'ait',     gloss: 'said' },
  { r: 'r8',  text: 'Quæ',     gloss: 'who' },
  { r: 'r9',  text: 'est',     gloss: 'is' },
  { r: 'r11', text: 'mater',   gloss: 'mother' },
  { r: 'r12', text: 'mea',     gloss: 'my' },
  { r: 'r14', text: 'qui',     gloss: 'who' },
  { r: 'r15', text: 'sunt',    gloss: 'are' },
  { r: 'r17', text: 'fratres', gloss: 'brothers' },
  { r: 'r18', text: 'mei',     gloss: 'my' },
]);

// ── Matt 13:3 — "A sower went out to sow" ────────────────────────────────────
// GK: καὶ ἐλάλησεν αὐτοῖς πολλὰ ἐν παραβολαῖς λέγων· ἰδοὺ ἐξῆλθεν ὁ σπείρων
//     τοῦ σπείρειν (13r)
// VL: Et locutus est eis multa in parabolis dicens Ecce exiit qui seminat seminare
// Problem: "locutus est" split across r2/r3 pushing everything 1 row late; cascade r2-r12
applyVulgate('matthew', '13', '3', [
  { r: 'r2',  text: 'locutus est', gloss: 'spoke' },
  { r: 'r3',  text: 'eis',         gloss: 'to them' },
  { r: 'r4',  text: 'multa',       gloss: 'many things' },
  { r: 'r5',  text: 'in',          gloss: 'in' },
  { r: 'r6',  text: 'parabolis',   gloss: 'parables' },
  { r: 'r7',  text: 'dicens',      gloss: 'saying' },
  { r: 'r8',  text: 'Ecce',        gloss: 'behold' },
  { r: 'r9',  text: 'exiit',       gloss: 'went out' },
  { r: 'r10', text: 'qui',         gloss: 'who' },
  { r: 'r11', text: 'seminat',     gloss: 'sows' },
  { r: 'r12', text: null },
]);

// ── Matt 13:19 — "Path-sown seed: evil one snatches word from heart" ──────────
// GK: παντὸς ἀκούοντος τὸν λόγον τῆς βασιλείας καὶ μὴ συνιέντος, ἔρχεται ὁ
//     πονηρὸς καὶ ἁρπάζει τὸ ἐσπαρμένον ἐν τῇ καρδίᾳ αὐτοῦ· οὗτός ἐστιν ὁ
//     παρὰ τὴν ὁδὸν σπαρείς (27r)
// VL: Omnis qui audit verbum regni et non intelligit venit malignus et rapit
//     quod seminatum est in corde ejus hic est qui secus viam seminatus est
// Problem: "secus" at article r5 (τῆς); "viam" at article r11 (ὁ); "seminatus" at article
//          r15 (τό); three cascades compound
applyVulgate('matthew', '13', '19', [
  { r: 'r2',  text: 'qui audit',       gloss: 'who hears' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'verbum',          gloss: 'word' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'regni',           gloss: 'of the kingdom' },
  { r: 'r7',  text: 'et',              gloss: 'and' },
  { r: 'r8',  text: 'non',             gloss: 'not' },
  { r: 'r9',  text: 'intelligit',      gloss: 'understands' },
  { r: 'r10', text: 'venit',           gloss: 'comes' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'malignus',        gloss: 'the evil one' },
  { r: 'r13', text: 'et',              gloss: 'and' },
  { r: 'r14', text: 'rapit',           gloss: 'snatches away' },
  { r: 'r15', text: 'quod',            gloss: 'what' },
  { r: 'r16', text: 'seminatum est',   gloss: 'was sown' },
  { r: 'r17', text: 'in',              gloss: 'in' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'corde',           gloss: 'heart' },
  { r: 'r20', text: 'ejus',            gloss: 'his' },
  { r: 'r21', text: 'hic',             gloss: 'this one' },
  { r: 'r22', text: 'est',             gloss: 'is' },
  { r: 'r23', text: 'qui',             gloss: 'who' },
  { r: 'r24', text: 'secus',           gloss: 'beside' },
  { r: 'r25', text: null },
  { r: 'r26', text: 'viam',            gloss: 'the path' },
  { r: 'r27', text: 'seminatus est',   gloss: 'was sown' },
]);

// ── Matt 13:20 — "Rocky-ground seed: receives with joy but falls away" ────────
// GK: ὁ δὲ ἐπὶ τὰ πετρώδη σπαρείς, οὗτός ἐστιν ὁ τὸν λόγον ἀκούων καὶ εὐθὺς
//     μετὰ χαρᾶς λαμβάνων αὐτόν (18r)
// VL: Qui autem super petrosa seminatus est, hic est qui verbum audit et
//     continuo cum gaudio accipit illud
// Problem: "gaudio" at article r1 (ὁ); "illud" at article r9 (ὁ); cascade
applyVulgate('matthew', '13', '20', [
  { r: 'r1',  text: 'Qui',           gloss: 'who' },
  { r: 'r2',  text: 'autem',         gloss: 'but' },
  { r: 'r3',  text: 'super',         gloss: 'on' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'petrosa',       gloss: 'rocky ground' },
  { r: 'r6',  text: 'seminatus est', gloss: 'was sown' },
  { r: 'r7',  text: 'hic',           gloss: 'this one' },
  { r: 'r8',  text: 'est',           gloss: 'is' },
  { r: 'r9',  text: 'qui',           gloss: 'who' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'verbum',        gloss: 'word' },
  { r: 'r12', text: 'audit',         gloss: 'hears' },
  { r: 'r13', text: 'et',            gloss: 'and' },
  { r: 'r14', text: 'continuo',      gloss: 'immediately' },
  { r: 'r15', text: 'cum',           gloss: 'with' },
  { r: 'r16', text: 'gaudio',        gloss: 'joy' },
  { r: 'r17', text: 'accipit',       gloss: 'receives' },
  { r: 'r18', text: 'illud',         gloss: 'it' },
]);

// Verify
const verses = [
  ['matthew', '10', '4'],
  ['matthew', '10', '22'],
  ['matthew', '11', '11'],
  ['matthew', '11', '12'],
  ['matthew', '11', '13'],
  ['matthew', '12', '13'],
  ['matthew', '12', '48'],
  ['matthew', '13', '3'],
  ['matthew', '13', '19'],
  ['matthew', '13', '20'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
