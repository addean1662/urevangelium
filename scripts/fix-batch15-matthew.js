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

// ── Matt 11:1 — Jesus departs to teach in their cities ──────────────────────
// GK: Καὶ ἐγένετο ὅτε ἐτέλεσεν ὁ Ἰησοῦς διατάσσων τοῖς δώδεκα μαθηταῖς
//     αὐτοῦ, μετέβη ἐκεῖθεν τοῦ διδάσκειν καὶ κηρύσσειν ἐν ταῖς πόλεσιν
//     αὐτῶν (21r)
// VL: Et factum est cum consummasset Jesus præcipiens duodecim discipulis suis
//     transiit inde ut doceret et prædicaret in civitatibus eorum
// Problem: "civitatibus" placed at article ὁ r5; cascade r2-r21
applyVulgate('matthew', '11', '1', [
  { r: 'r2',  text: 'factum est',   gloss: 'it came to pass' },
  { r: 'r3',  text: 'cum',          gloss: 'when' },
  { r: 'r4',  text: 'consummasset', gloss: 'he had finished' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Jesus',        gloss: 'Jesus' },
  { r: 'r7',  text: 'præcipiens',   gloss: 'commanding' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'duodecim',     gloss: 'twelve' },
  { r: 'r10', text: 'discipulis',   gloss: 'disciples' },
  { r: 'r11', text: 'suis',         gloss: 'his' },
  { r: 'r12', text: 'transiit',     gloss: 'departed' },
  { r: 'r13', text: 'inde',         gloss: 'from there' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'ut doceret',   gloss: 'to teach' },
  { r: 'r16', text: 'et',           gloss: 'and' },
  { r: 'r17', text: 'prædicaret',   gloss: 'to preach' },
  { r: 'r18', text: 'in',           gloss: 'in' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'civitatibus',  gloss: 'cities' },
  { r: 'r21', text: 'eorum',        gloss: 'their' },
]);

// ── Matt 11:2 — John hears in prison ────────────────────────────────────────
// GK: Ὁ δὲ Ἰωάννης ἀκούσας ἐν τῷ δεσμωτηρίῳ τὰ ἔργα τοῦ Χριστοῦ πέμψας
//     διὰ τῶν μαθητῶν αὐτοῦ (16r)
// VL: Joannes autem cum audisset in vinculis opera Christi mittens duos de
//     discipulis suis
// Problem: "discipulis" at article Ὁ r1; "suis" at τῷ r6; cascade r1-r16
applyVulgate('matthew', '11', '2', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'autem',        gloss: 'but' },
  { r: 'r3',  text: 'Joannes',      gloss: 'John' },
  { r: 'r4',  text: 'cum audisset', gloss: 'when he heard' },
  { r: 'r5',  text: 'in',           gloss: 'in' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'vinculis',     gloss: 'chains' },
  { r: 'r9',  text: 'opera',        gloss: 'works' },
  { r: 'r11', text: 'Christi',      gloss: 'of Christ' },
  { r: 'r12', text: 'mittens duos', gloss: 'sending two' },
  { r: 'r13', text: 'de',           gloss: 'of' },
  { r: 'r15', text: 'discipulis',   gloss: 'disciples' },
  { r: 'r16', text: 'suis',         gloss: 'his' },
]);

// ── Matt 11:10 — messenger sent before you ──────────────────────────────────
// GK: οὗτός γάρ ἐστιν περὶ οὗ γέγραπται· ἰδοὺ ἐγὼ ἀποστέλλω τὸν ἄγγελόν
//     μου πρὸ προσώπου σου ὃς κατασκευάσει τὴν ὁδόν σου ἔμπροσθέν σου (22r)
// VL: Hic est enim de quo scriptum est Ecce ego mitto angelum meum ante
//     faciem tuam qui præparabit viam tuam ante te
// Problem: "te" placed at article τόν r10; "est" at ἰδού r7; cascade r2-r22
applyVulgate('matthew', '11', '10', [
  { r: 'r2',  text: 'enim',         gloss: 'for' },
  { r: 'r3',  text: 'est',          gloss: 'is' },
  { r: 'r6',  text: 'scriptum est', gloss: 'it is written' },
  { r: 'r7',  text: 'Ecce',         gloss: 'behold' },
  { r: 'r8',  text: 'ego',          gloss: 'I' },
  { r: 'r9',  text: 'mitto',        gloss: 'send' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'angelum',      gloss: 'messenger' },
  { r: 'r12', text: 'meum',         gloss: 'my' },
  { r: 'r13', text: 'ante',         gloss: 'before' },
  { r: 'r14', text: 'faciem',       gloss: 'face' },
  { r: 'r15', text: 'tuam',         gloss: 'your' },
  { r: 'r17', text: 'præparabit',   gloss: 'will prepare' },
  { r: 'r19', text: 'viam',         gloss: 'way' },
  { r: 'r20', text: 'tuam',         gloss: 'your' },
  { r: 'r21', text: 'ante',         gloss: 'before' },
  { r: 'r22', text: 'te',           gloss: 'you' },
]);

// ── Matt 12:4 — David eats the bread of the Presence ────────────────────────
// GK: πῶς εἰσῆλθεν εἰς τὸν οἶκον τοῦ θεοῦ καὶ τοὺς ἄρτους τῆς προθέσεως
//     ἔφαγον, ὃ οὐκ ἐξὸν ἦν αὐτῷ φαγεῖν οὐδὲ τοῖς μετ᾽ αὐτοῦ εἰ μὴ τοῖς
//     ἱερεῦσιν μόνοις (28r)
// VL: quomodo intravit in domum Dei et panes propositionis comedit quos non
//     licebat ei edere neque his qui cum eo erant nisi solis sacerdotibus
// Problem: "sacerdotibus" at article τόν r4; r17-r27 cascade
applyVulgate('matthew', '12', '4', [
  { r: 'r4',  text: null },
  { r: 'r17', text: null },
  { r: 'r18', text: 'ei',              gloss: 'for him' },
  { r: 'r19', text: 'edere',           gloss: 'to eat' },
  { r: 'r20', text: 'neque',           gloss: 'nor' },
  { r: 'r22', text: 'his',             gloss: 'those' },
  { r: 'r23', text: 'cum eo',          gloss: 'with him' },
  { r: 'r24', text: null },
  { r: 'r25', text: 'nisi',            gloss: 'except' },
  { r: 'r27', text: 'sacerdotibus',    gloss: 'priests' },
  { r: 'r28', text: 'solis',           gloss: 'only' },
]);

// ── Matt 12:5 — priests violate the sabbath ─────────────────────────────────
// GK: Ἢ οὐκ ἀνέγνωτε ἐν τῷ νόμῳ ὅτι τοῖς σάββασιν οἱ ἱερεῖς ἐν τῷ ἱερῷ
//     τὸ σάββατον βεβηλοῦσιν καὶ ἀναίτιοί εἰσιν (20r)
// VL: aut non legistis in lege quia sabbatis sacerdotes in templo sabbatum
//     violant et sine crimine sunt
// Problem: "sunt" at τῷ r5; r19-r20 cascade
applyVulgate('matthew', '12', '5', [
  { r: 'r5',  text: null },
  { r: 'r19', text: 'sine crimine',   gloss: 'without blame' },
  { r: 'r20', text: 'sunt',           gloss: 'are' },
]);

// ── Matt 12:9 — enters synagogue ─────────────────────────────────────────────
// GK: Καὶ μεταβὰς ἐκεῖθεν ἦλθεν εἰς τὴν συναγωγὴν αὐτῶν (8r)
// VL: Et cum inde transisset venit in synagogam eorum
// Problem: "in" at article τήν r6; cascade r2-r6
applyVulgate('matthew', '12', '9', [
  { r: 'r2',  text: 'cum transisset', gloss: 'when he had moved on' },
  { r: 'r4',  text: 'venit',          gloss: 'came' },
  { r: 'r5',  text: 'in',             gloss: 'into' },
  { r: 'r6',  text: null },
]);

// ── Matt 12:11 — sheep fallen in pit ─────────────────────────────────────────
// GK: Ὁ δὲ εἶπεν αὐτοῖς· τίς ἔσται ἐξ ὑμῶν ἄνθρωπος ὃς ἕξει πρόβατον ἓν,
//     καὶ ἐὰν ἐμπέσῃ τοῦτο τοῖς σάββασιν εἰς βόθυνον, οὐχὶ κρατήσει αὐτὸ
//     καὶ ἐγερεῖ (26r)
// VL: Ipse autem dixit illis Quis erit ex vobis homo qui habeat ovem unam et
//     si ceciderit hæc sabbatis in foveam nonne tenebit et levabit eam
// Problem: "eam" at article Ὁ r1; full cascade r1-r24
applyVulgate('matthew', '12', '11', [
  { r: 'r1',  text: 'Ipse',           gloss: 'he himself' },
  { r: 'r2',  text: 'autem',          gloss: 'but' },
  { r: 'r3',  text: 'dixit',          gloss: 'said' },
  { r: 'r4',  text: 'illis',          gloss: 'to them' },
  { r: 'r5',  text: 'Quis',           gloss: 'who' },
  { r: 'r6',  text: 'erit',           gloss: 'will be' },
  { r: 'r7',  text: 'ex',             gloss: 'among' },
  { r: 'r8',  text: 'vobis',          gloss: 'you' },
  { r: 'r9',  text: 'homo',           gloss: 'man' },
  { r: 'r11', text: 'habeat',         gloss: 'has' },
  { r: 'r12', text: 'ovem',           gloss: 'sheep' },
  { r: 'r13', text: 'unam',           gloss: 'one' },
  { r: 'r14', text: 'et',             gloss: 'and' },
  { r: 'r15', text: 'si',             gloss: 'if' },
  { r: 'r16', text: 'ceciderit',      gloss: 'it falls' },
  { r: 'r17', text: 'hæc',            gloss: 'it' },
  { r: 'r19', text: 'sabbatis',       gloss: 'on the sabbath' },
  { r: 'r20', text: 'in',             gloss: 'into' },
  { r: 'r21', text: 'foveam',         gloss: 'a pit' },
  { r: 'r22', text: 'nonne',          gloss: 'will he not' },
  { r: 'r23', text: 'tenebit',        gloss: 'grasp it' },
  { r: 'r24', text: 'eam',            gloss: 'it' },
  { r: 'r25', text: 'et',             gloss: 'and' },
  { r: 'r26', text: 'levabit',        gloss: 'lift it' },
]);

// ── Matt 12:26 — Satan divided against himself ───────────────────────────────
// GK: καὶ εἰ ὁ σατανᾶς τὸν σατανᾶν ἐκβάλλει, ἐφ᾽ ἑαυτὸν ἐμερίσθη· πῶς οὖν
//     σταθήσεται ἡ βασιλεία αὐτοῦ (16r)
// VL: Et si Satanas Satanam ejicit adversus se divisus est quomodo ergo stabit
//     regnum ejus
// Problem: "ejus" at article ὁ r3; r10-r16 cascade
applyVulgate('matthew', '12', '26', [
  { r: 'r3',  text: null },
  { r: 'r10', text: 'divisus est',    gloss: 'is divided' },
  { r: 'r11', text: 'quomodo',        gloss: 'how' },
  { r: 'r12', text: 'ergo',           gloss: 'then' },
  { r: 'r13', text: 'stabit',         gloss: 'will stand' },
  { r: 'r15', text: 'regnum',         gloss: 'kingdom' },
  { r: 'r16', text: 'ejus',           gloss: 'his' },
]);

// ── Matt 12:34 — out of abundance of the heart the mouth speaks ──────────────
// GK: γεννήματα ἐχιδνῶν, πῶς δύνασθε ἀγαθὰ λαλεῖν πονηροὶ ὄντες; ἐκ γὰρ
//     τοῦ περισσεύματος τῆς καρδίας τὸ στόμα λαλεῖ (17r)
// VL: Progenies viperarum quomodo potestis bona loqui cum sitis mali ex
//     abundantia enim cordis os loquitur
// Problem: "loquitur" at τοῦ r11; r7-r10 shifted; r14-r17 cascade
applyVulgate('matthew', '12', '34', [
  { r: 'r7',  text: 'mali',           gloss: 'evil' },
  { r: 'r8',  text: 'cum sitis',      gloss: 'since you are' },
  { r: 'r9',  text: 'ex',             gloss: 'from' },
  { r: 'r10', text: 'enim',           gloss: 'for' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'abundantia',     gloss: 'abundance' },
  { r: 'r14', text: 'cordis',         gloss: 'heart' },
  { r: 'r16', text: 'os',             gloss: 'mouth' },
  { r: 'r17', text: 'loquitur',       gloss: 'speaks' },
]);

// ── Matt 12:41 — men of Nineveh will rise up ─────────────────────────────────
// GK: Ἄνδρες Νινευῖται ἀναστήσονται ἐν τῇ κρίσει μετὰ τῆς γενεᾶς ταύτης
//     καὶ κατακρινοῦσιν αὐτήν, ὅτι μετενόησαν εἰς τὸ κήρυγμα Ἰωνᾶ· καὶ
//     ἰδοὺ πλεῖον Ἰωνᾶ ὧδε (24r)
// VL: Viri Ninivitæ surgent in judicio cum generatione ista et condemnabunt
//     eam quia pœnitentiam egerunt in prædicatione Jonæ et ecce plus quam
//     Jonas hic
// Problem: "Jonas" at τῇ r5; "hic" at τῆς r8; double cascade r5-r24
applyVulgate('matthew', '12', '41', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'judicio',        gloss: 'judgment' },
  { r: 'r7',  text: 'cum',            gloss: 'with' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'generatione',    gloss: 'generation' },
  { r: 'r10', text: 'ista',           gloss: 'this' },
  { r: 'r11', text: 'et',             gloss: 'and' },
  { r: 'r12', text: 'condemnabunt',   gloss: 'will condemn' },
  { r: 'r13', text: 'eam',            gloss: 'it' },
  { r: 'r14', text: 'quia',           gloss: 'because' },
  { r: 'r15', text: 'pœnitentiam egerunt', gloss: 'repented' },
  { r: 'r16', text: 'in',             gloss: 'at' },
  { r: 'r18', text: 'prædicatione',   gloss: 'preaching' },
  { r: 'r19', text: 'Jonæ',           gloss: 'of Jonah' },
  { r: 'r20', text: 'et',             gloss: 'and' },
  { r: 'r21', text: 'ecce',           gloss: 'behold' },
  { r: 'r22', text: 'plus',           gloss: 'more' },
  { r: 'r23', text: 'quam Jonas',     gloss: 'than Jonah' },
  { r: 'r24', text: 'hic',            gloss: 'here' },
]);

// ── Matt 12:42 — Queen of the South ──────────────────────────────────────────
// GK: Βασίλισσα νότου ἐγερθήσεται ἐν τῇ κρίσει μετὰ τῆς γενεᾶς ταύτης καὶ
//     κατακρινεῖ αὐτήν, ὅτι ἦλθεν ἐκ τῶν περάτων τῆς γῆς ἀκοῦσαι τὴν
//     σοφίαν Σολομῶνος· καὶ ἰδοὺ πλεῖον Σολομῶνος ὧδε (29r)
// VL: Regina austri surget in judicio cum generatione ista et condemnabit eam
//     quia venit a finibus terræ audire sapientiam Salomonis et ecce plus
//     quam Salomon hic
// Problem: "hic" at τῇ r5; cascade r5 and r28-r29
applyVulgate('matthew', '12', '42', [
  { r: 'r5',  text: null },
  { r: 'r28', text: 'quam Salomon',   gloss: 'than Solomon' },
  { r: 'r29', text: 'hic',            gloss: 'here' },
]);

// ── Matt 12:44 — unclean spirit returns ──────────────────────────────────────
// GK: τότε λέγει· εἰς τὸν οἶκόν μου ἐπιστρέψω ὅθεν ἐξῆλθον. καὶ ἐλθὸν
//     εὑρίσκει σχολάζοντα, καὶ σεσαρωμένον καὶ κεκοσμημένον (17r)
// VL: Tunc dicit Revertar in domum meam unde exivi Et veniens invenit eam
//     vacantem scopis mundatam et ornatam
// Problem: "in" at article τόν r4; cascade r3-r15
applyVulgate('matthew', '12', '44', [
  { r: 'r3',  text: 'in',             gloss: 'into' },
  { r: 'r4',  text: null },
  { r: 'r7',  text: 'Revertar',       gloss: 'I will return' },
  { r: 'r8',  text: 'unde',           gloss: 'whence' },
  { r: 'r9',  text: 'exivi',          gloss: 'I left' },
  { r: 'r10', text: 'Et',             gloss: 'and' },
  { r: 'r11', text: 'veniens',        gloss: 'coming' },
  { r: 'r12', text: 'invenit eam',    gloss: 'finds it' },
  { r: 'r13', text: 'vacantem',       gloss: 'empty' },
  { r: 'r14', text: 'et',             gloss: 'and' },
  { r: 'r15', text: 'scopis mundatam', gloss: 'swept clean' },
]);

// ── Matt 12:50 — whoever does the will of my Father ──────────────────────────
// GK: ὅστις γὰρ ἂν ποιήσῃ τὸ θέλημα τοῦ πατρός μου τοῦ ἐν οὐρανοῖς,
//     αὐτός μου ἀδελφὸς καὶ ἀδελφὴ καὶ μήτηρ ἐστίν (20r)
// VL: Quicumque enim fecerit voluntatem Patris mei qui est in cælis ipse meus
//     frater et soror et mater est
// Problem: "est" at article τό r5; ἄν r3 picked up "fecerit"; cascade r3-r20
applyVulgate('matthew', '12', '50', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'fecerit',        gloss: 'does' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'voluntatem',     gloss: 'will' },
  { r: 'r8',  text: 'Patris',         gloss: 'Father' },
  { r: 'r9',  text: 'mei',            gloss: 'my' },
  { r: 'r10', text: 'qui est',        gloss: 'who is' },
  { r: 'r11', text: 'in',             gloss: 'in' },
  { r: 'r12', text: 'cælis',          gloss: 'the heavens' },
  { r: 'r13', text: 'ipse',           gloss: 'he himself' },
  { r: 'r14', text: 'meus',           gloss: 'my' },
  { r: 'r15', text: 'frater',         gloss: 'brother' },
  { r: 'r16', text: 'et',             gloss: 'and' },
  { r: 'r17', text: 'soror',          gloss: 'sister' },
  { r: 'r18', text: 'et',             gloss: 'and' },
  { r: 'r19', text: 'mater',          gloss: 'mother' },
  { r: 'r20', text: 'est',            gloss: 'is' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '11', '1'],
  ['matthew', '11', '2'],
  ['matthew', '11', '10'],
  ['matthew', '12', '4'],
  ['matthew', '12', '5'],
  ['matthew', '12', '9'],
  ['matthew', '12', '11'],
  ['matthew', '12', '26'],
  ['matthew', '12', '34'],
  ['matthew', '12', '41'],
  ['matthew', '12', '42'],
  ['matthew', '12', '44'],
  ['matthew', '12', '50'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
