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

// ── Matt 5:6 — Beatitude: hunger and thirst for righteousness ────────────────
// GK: Μακάριοι οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην, ὅτι αὐτοὶ χορτασθήσονται (10r)
// VL: Beati qui esuriunt et sitiunt iustitiam quoniam ipsi saturabuntur
// Problem: "saturabuntur" at article row r2 (οἱ); cascade through r10
applyVulgate('matthew', '5', '6', [
  { r: 'r2',  text: 'qui',          gloss: 'who' },
  { r: 'r3',  text: 'esuriunt',     gloss: 'hunger' },
  { r: 'r4',  text: 'et',           gloss: 'and' },
  { r: 'r5',  text: 'sitiunt',      gloss: 'thirst' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'justitiam',    gloss: 'righteousness' },
  { r: 'r8',  text: 'quoniam',      gloss: 'for' },
  { r: 'r9',  text: 'ipsi',         gloss: 'they' },
  { r: 'r10', text: 'saturabuntur', gloss: 'will be satisfied' },
]);

// ── Matt 16:18 — "You are Peter and on this rock I will build my church" ─────
// GK: κἀγὼ δέ σοι λέγω ὅτι σὺ εἶ Πέτρος καὶ ἐπὶ ταύτῃ τῇ πέτρᾳ οἰκοδομήσω
//     μου τὴν ἐκκλησίαν, καὶ πύλαι ᾅδου οὐ κατισχύσουσιν αὐτῆς (23r)
// VL: Et ego dico tibi quia tu es Petrus et super hanc petram ædificabo
//     Ecclesiam meam et portæ inferi non prævalebunt adversus eam
// Problem: "eam" at article row r12 (τῇ); r15/r17 (meam/Ecclesiam) swapped;
//          r23 missing "eam"
applyVulgate('matthew', '16', '18', [
  { r: 'r12', text: null },
  { r: 'r15', text: 'meam',         gloss: 'my' },
  { r: 'r17', text: 'Ecclesiam',    gloss: 'Church' },
  { r: 'r23', text: 'adversus eam', gloss: 'against it' },
]);

// ── Mark 12:30 — Great Commandment (love God) ────────────────────────────────
// GK: καὶ ἀγαπήσεις κύριον τὸν θεόν σου ... αὕτη πρώτη ἐντολή (32r)
// VL: et diliges Dominum Deum tuum ex toto corde ... Hoc est primum mandatum
// Problem: "mandatum" at article row r4 (τὸν); r30-r32 garbled
applyVulgate('mark', '12', '30', [
  { r: 'r4',  text: null },
  { r: 'r30', text: 'Hoc est',    gloss: 'this is' },
  { r: 'r31', text: 'primum',     gloss: 'first' },
  { r: 'r32', text: 'mandatum',   gloss: 'commandment' },
]);

// ── John 3:5 — "born of water and the Spirit" ────────────────────────────────
// GK: Ἀπεκρίθη ὁ Ἰησοῦς· ἀμὴν ἀμὴν λέγω σοι, ἐὰν μή τις γεννηθῇ ἐξ ὕδατος
//     καὶ πνεύματος, οὐ δύναται εἰσελθεῖν εἰς τὴν βασιλείαν τοῦ θεοῦ (23r)
// VL: Respondit Jesus Amen amen dico tibi nisi quis renatus fuerit ex aqua
//     et Spiritu Sancto non potest introire in regnum Dei
// Problem: "Dei" at article row r2 (ὁ); "Sancto" at negation row r16; cascade
applyVulgate('john', '3', '5', [
  { r: 'r2',  text: null },
  { r: 'r15', text: 'Spiritu Sancto', gloss: 'Holy Spirit' },
  { r: 'r16', text: 'non',            gloss: 'not' },
  { r: 'r17', text: 'potest',         gloss: 'is able' },
  { r: 'r18', text: 'introire',       gloss: 'to enter' },
  { r: 'r19', text: 'in',             gloss: 'into' },
  { r: 'r21', text: 'regnum',         gloss: 'kingdom' },
  { r: 'r23', text: 'Dei',            gloss: 'of God' },
]);

// ── John 8:31 — "If you abide in my word you are truly my disciples" ─────────
// GK: Ἔλεγεν οὖν ὁ Ἰησοῦς πρὸς τοὺς πεπιστευκότας αὐτῷ Ἰουδαίους·
//     ἐὰν ὑμεῖς μείνητε ἐν τῷ λόγῳ τῷ ἐμῷ, ἀληθῶς μαθηταί μού ἐστε (21r)
// VL: Dicebat ergo Jesus ad eos qui crediderunt ei Judæos Si vos manseritis
//     in sermone meo vere discipuli mei eritis
// Problem: "mei" at article row r3 (ὁ); "eritis" at article row r6 (τοὺς); cascade
applyVulgate('john', '8', '31', [
  { r: 'r3',  text: null },
  { r: 'r6',  text: 'eos',             gloss: 'those' },
  { r: 'r7',  text: 'qui crediderunt', gloss: 'who believed' },
  { r: 'r8',  text: 'ei',              gloss: 'in him' },
  { r: 'r9',  text: 'Judæos',          gloss: 'Jews' },
  { r: 'r10', text: 'Si',              gloss: 'if' },
  { r: 'r11', text: 'vos',             gloss: 'you' },
  { r: 'r12', text: 'manseritis',      gloss: 'shall abide' },
  { r: 'r13', text: 'in',              gloss: 'in' },
  { r: 'r15', text: 'sermone',         gloss: 'word' },
  { r: 'r17', text: 'meo',             gloss: 'my' },
  { r: 'r18', text: 'vere',            gloss: 'truly' },
  { r: 'r19', text: 'discipuli',       gloss: 'disciples' },
  { r: 'r20', text: 'mei',             gloss: 'my' },
  { r: 'r21', text: 'eritis',          gloss: 'you will be' },
]);

// ── Luke 4:18 — "The Spirit of the Lord is upon me" (Isaiah 61 quote) ────────
// GK: πνεῦμα κυρίου ἐπ᾽ ἐμέ, οὗ εἵνεκεν ἔχρισέν με εὐαγγελίσασθαι πτωχοῖς,
//     ἀπέσταλκέν με ἰὰσασθαι τοὺς συντετριμμένους τὴν καρδίαν κηρύξαι
//     αἰχμαλώτοις ἄφεσιν καὶ τυφλοῖς ἀνάβλεψιν ἀποστεῖλαι τεθραυσμένους
//     ἐν ἀφέσει (27r)
// VL: Spiritus Domini super me propter quod unxit me evangelizare pauperibus
//     misit me sanare contritos corde praedicare captivis remissionem
//     et caecis visum dimittere confractos in remissione
// Problem: entire verse garbled from r2 onward
applyVulgate('luke', '4', '18', [
  { r: 'r2',  text: 'Domini',       gloss: 'of the Lord' },
  { r: 'r3',  text: 'super',        gloss: 'upon' },
  { r: 'r4',  text: 'me',           gloss: 'me' },
  { r: 'r5',  text: 'propter quod', gloss: 'because' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'unxit',        gloss: 'anointed' },
  { r: 'r8',  text: 'me',           gloss: 'me' },
  { r: 'r9',  text: 'evangelizare', gloss: 'to preach good news' },
  { r: 'r10', text: 'pauperibus',   gloss: 'to the poor' },
  { r: 'r11', text: 'misit',        gloss: 'sent' },
  { r: 'r12', text: 'me',           gloss: 'me' },
  { r: 'r13', text: 'sanare',       gloss: 'to heal' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'contritos',    gloss: 'the broken' },
  { r: 'r16', text: null },
  { r: 'r17', text: 'corde',        gloss: 'in heart' },
  { r: 'r18', text: 'praedicare',   gloss: 'to proclaim' },
  { r: 'r19', text: 'captivis',     gloss: 'to captives' },
  { r: 'r20', text: 'remissionem',  gloss: 'release' },
  { r: 'r21', text: 'et',           gloss: 'and' },
  { r: 'r22', text: 'caecis',       gloss: 'to the blind' },
  { r: 'r23', text: 'visum',        gloss: 'sight' },
  { r: 'r24', text: 'dimittere',    gloss: 'to set free' },
  { r: 'r25', text: 'confractos',   gloss: 'the oppressed' },
  { r: 'r26', text: 'in',           gloss: 'in' },
  { r: 'r27', text: 'remissione',   gloss: 'freedom' },
]);

// Verify
const verses = [
  ['matthew', '5', '6'],
  ['matthew', '16', '18'],
  ['mark', '12', '30'],
  ['john', '3', '5'],
  ['john', '8', '31'],
  ['luke', '4', '18'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
