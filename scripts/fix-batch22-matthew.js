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

// ── Matt 19:1 — "factum est" bundle at r2; CASCADE at ὁ r5 ("Jordanem"); cascade r2-r23 ─
// GK: καὶ ἐγένετο ὅτε ἐτέλεσεν ὁ Ἰησοῦς τοὺς λόγους τούτους μετῆρεν ἀπὸ
//     τῆς Γαλιλαίας καὶ ἦλθεν εἰς τὰ ὅρια τῆς Ἰουδαίας πέραν τοῦ Ἰορδάνου
// VL: Et factum est cum consummasset Jesus sermones istos migravit a Galilæa
//     et venit in fines Judæe trans Jordanem
applyVulgate('matthew', '19', '1', [
  { r: 'r2',  text: 'factum est',  gloss: 'came to pass' },
  { r: 'r3',  text: 'cum',         gloss: 'when' },
  { r: 'r4',  text: 'consummasset', gloss: 'had finished' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Jesus',       gloss: 'Jesus' },
  { r: 'r8',  text: 'sermones',    gloss: 'words' },
  { r: 'r9',  text: 'istos',       gloss: 'these' },
  { r: 'r10', text: 'migravit',    gloss: 'withdrew' },
  { r: 'r11', text: 'a',           gloss: 'from' },
  { r: 'r13', text: 'Galilæa',     gloss: 'Galilee' },
  { r: 'r14', text: 'et',          gloss: 'and' },
  { r: 'r15', text: 'venit',       gloss: 'came' },
  { r: 'r16', text: 'in',          gloss: 'into' },
  { r: 'r18', text: 'fines',       gloss: 'the regions' },
  { r: 'r20', text: 'Judæe',       gloss: 'of Judea' },
  { r: 'r21', text: 'trans',       gloss: 'beyond' },
  { r: 'r23', text: 'Jordanem',    gloss: 'the Jordan' },
]);

// ── Matt 19:4 — CASCADE at ὁ r9 ("fecit"); bundle "fecit hominem" at κτίσας r10 ─────────
// GK: ὁ δὲ ἀποκριθεὶς εἶπεν· οὐκ ἀνέγνωτε ὅτι ὁ κτίσας ἀπ᾽ ἀρχῆς ἄρσεν
//     καὶ θῆλυ ἐποίησεν αὐτούς
// VL: Qui respondens ait Non legistis quia qui fecit hominem ab initio masculum
//     et feminam fecit eos
applyVulgate('matthew', '19', '4', [
  { r: 'r9',  text: 'qui',           gloss: 'who' },
  { r: 'r10', text: 'fecit hominem', gloss: 'made man' },
]);

// ── Matt 19:6 — "jam non" bundle at r2; CASCADE at ὁ r10 ("una") ──────────────────────
// GK: ὥστε οὐκέτι εἰσὶν δύο ἀλλὰ σὰρξ μία. ὃ οὖν ὁ θεὸς συνέζευξεν
//     ἄνθρωπος μὴ χωριζέτω
// VL: Itaque jam non sunt duo sed caro una. Quod ergo Deus conjunxit homo
//     non separet
applyVulgate('matthew', '19', '6', [
  { r: 'r2',  text: 'jam non', gloss: 'no longer' },
  { r: 'r3',  text: 'sunt',    gloss: 'are' },
  { r: 'r4',  text: 'duo',     gloss: 'two' },
  { r: 'r5',  text: 'sed',     gloss: 'but' },
  { r: 'r6',  text: 'caro',    gloss: 'one flesh' },
  { r: 'r8',  text: 'Quod',    gloss: 'what' },
  { r: 'r9',  text: 'ergo',    gloss: 'therefore' },
  { r: 'r10', text: null },
]);

// ── Matt 19:8 — CASCADE at τὴν r6 ("sic"); "cordis vestri" bundle at ὑμῶν r8; cascade r6-r20 ─
// GK: Λέγει αὐτοῖς ὅτι Μωϋσῆς πρὸς τὴν σκληροκαρδίαν ὑμῶν ἐπέτρεψεν
//     ὑμῖν ἀπολῦσαι τὰς γυναῖκας ὑμῶν· ἀπ᾽ ἀρχῆς δὲ οὐ γέγονεν οὕτως
// VL: Ait illis Quoniam Moyses ad duritiam cordis vestri permisit vobis
//     dimittere uxores vestras ab initio autem non fuit sic
applyVulgate('matthew', '19', '8', [
  { r: 'r6',  text: null },
  { r: 'r8',  text: 'cordis vestri', gloss: 'of your heart' },
  { r: 'r9',  text: 'permisit',      gloss: 'allowed' },
  { r: 'r10', text: 'vobis',         gloss: 'to you' },
  { r: 'r11', text: 'dimittere',     gloss: 'to divorce' },
  { r: 'r13', text: 'uxores',        gloss: 'wives' },
  { r: 'r14', text: 'vestras',       gloss: 'your' },
  { r: 'r15', text: 'ab',            gloss: 'from' },
  { r: 'r16', text: 'initio',        gloss: 'the beginning' },
  { r: 'r17', text: 'autem',         gloss: 'but' },
  { r: 'r18', text: 'non',           gloss: 'not' },
  { r: 'r19', text: 'fuit',          gloss: 'it was' },
  { r: 'r20', text: 'sic',           gloss: 'so' },
]);

// ── Matt 19:11 — CASCADE at Ὁ r1 ("est"); "datum est" bundle at δέδοται r13 ────────────
// GK: Ὁ δὲ εἶπεν αὐτοῖς· οὐ πάντες χωροῦσιν τὸν λόγον τοῦτον ἀλλ᾽ οἷς
//     δέδοται
// VL: Qui dixit eis Non omnes capiunt verbum istud sed quibus datum est
applyVulgate('matthew', '19', '11', [
  { r: 'r1',  text: 'Qui',       gloss: 'who' },
  { r: 'r2',  text: null },
  { r: 'r13', text: 'datum est', gloss: 'it has been given' },
]);

// ── Matt 19:12 — "nati sunt" bundle at ἐγεννήθησαν r8; CASCADE at τῶν r16 and τὴν r25
//    and τῶν r27; cascade r8-r32 ────────────────────────────────────────────────────────
// GK: εἰσὶν γὰρ εὐνοῦχοι οἵτινες ἐκ κοιλίας μητρὸς ἐγεννήθησαν οὕτως,
//     καὶ εἰσὶν εὐνοῦχοι οἵτινες εὐνουχίσθησαν ὑπὸ τῶν ἀνθρώπων, καὶ
//     εἰσὶν εὐνοῦχοι οἵτινες εὐνούχισαν ἑαυτοὺς διὰ τὴν βασιλείαν τῶν
//     οὐρανῶν. Ὁ δυνάμενος χωρεῖν χωρείτω
// VL: Sunt enim eunuchi qui de matris utero sic nati sunt et sunt eunuchi
//     qui facti sunt ab hominibus et sunt eunuchi qui seipsos castraverunt
//     propter regnum cælorum. Qui potest capere capiat
applyVulgate('matthew', '19', '12', [
  { r: 'r8',  text: 'nati sunt',   gloss: 'were born' },
  { r: 'r9',  text: 'sic',         gloss: 'so' },
  { r: 'r10', text: 'et',          gloss: 'and' },
  { r: 'r11', text: 'sunt',        gloss: 'there are' },
  { r: 'r12', text: 'eunuchi',     gloss: 'eunuchs' },
  { r: 'r13', text: 'qui',         gloss: 'who' },
  { r: 'r14', text: 'facti sunt',  gloss: 'were made' },
  { r: 'r15', text: 'ab',          gloss: 'by' },
  { r: 'r16', text: null },
  { r: 'r17', text: 'hominibus',   gloss: 'men' },
  { r: 'r18', text: 'et',          gloss: 'and' },
  { r: 'r19', text: 'sunt',        gloss: 'there are' },
  { r: 'r20', text: 'eunuchi',     gloss: 'eunuchs' },
  { r: 'r21', text: 'qui',         gloss: 'who' },
  { r: 'r22', text: 'castraverunt', gloss: 'have castrated' },
  { r: 'r23', text: 'seipsos',     gloss: 'themselves' },
  { r: 'r24', text: 'propter',     gloss: 'for the sake of' },
  { r: 'r25', text: null },
  { r: 'r26', text: 'regnum',      gloss: 'the kingdom' },
  { r: 'r27', text: null },
  { r: 'r28', text: 'cælorum',     gloss: 'of heaven' },
  { r: 'r30', text: 'Qui potest',  gloss: 'who is able' },
  { r: 'r31', text: 'capere',      gloss: 'to receive' },
  { r: 'r32', text: 'capiat',      gloss: 'let him receive' },
]);

// ── Matt 19:13 — "oblati sunt" bundle at προσηνέχθησαν r2; CASCADE at τὰς r6 ("eos"); cascade r2-r16 ─
// GK: Τότε προσηνέχθησαν αὐτῷ παιδία ἵνα τὰς χεῖρας ἐπιθῇ αὐτοῖς καὶ
//     προσεύξηται· οἱ δὲ μαθηταὶ ἐπετίμησαν αὐτοῖς
// VL: Tunc oblati sunt ei parvuli ut manus eis imponeret et oraret.
//     Discipuli autem increpabant eos
applyVulgate('matthew', '19', '13', [
  { r: 'r2',  text: 'oblati sunt', gloss: 'were brought' },
  { r: 'r3',  text: 'ei',          gloss: 'to him' },
  { r: 'r4',  text: 'parvuli',     gloss: 'little children' },
  { r: 'r5',  text: 'ut',          gloss: 'that' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'manus',       gloss: 'hands' },
  { r: 'r8',  text: 'imponeret',   gloss: 'he might lay' },
  { r: 'r10', text: 'et',          gloss: 'and' },
  { r: 'r11', text: 'oraret',      gloss: 'pray' },
  { r: 'r13', text: 'autem',       gloss: 'but' },
  { r: 'r15', text: 'increpabant', gloss: 'rebuked' },
  { r: 'r16', text: 'eos',         gloss: 'them' },
]);

// ── Matt 19:18 — CASCADE at ὁ r4 ("Jesus"); CASCADE at τὸ r8 ("homicidium");
//    bundles "homicidium facies", "facies furtum", "falsum testimonium dices" ─────────────
// GK: Λέγει αὐτῷ· ποίας; ὁ δὲ Ἰησοῦς εἶπεν· τὸ Οὐ φονεύσεις, οὐ
//     μοιχεύσεις, οὐ κλέψεις, οὐ ψευδομαρτυρήσεις
// VL: Dicit illi Quæ Jesus autem dixit Non homicidium facies non adulterabis
//     non facies furtum non falsum testimonium dices
applyVulgate('matthew', '19', '18', [
  { r: 'r4',  text: null },
  { r: 'r6',  text: 'Jesus',                  gloss: 'Jesus' },
  { r: 'r7',  text: 'dixit',                  gloss: 'said' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'Non',                    gloss: 'not' },
  { r: 'r10', text: 'homicidium facies',       gloss: 'you shall murder' },
  { r: 'r11', text: 'non',                    gloss: 'not' },
  { r: 'r12', text: 'adulterabis',            gloss: 'you shall commit adultery' },
  { r: 'r13', text: 'non',                    gloss: 'not' },
  { r: 'r14', text: 'facies furtum',          gloss: 'you shall steal' },
  { r: 'r16', text: 'falsum testimonium dices', gloss: 'you shall bear false witness' },
]);

// ── Matt 19:19 — CASCADE at τὸν r2 ("teipsum"); split at μητέρα r7 (needs bundle) ──────
// GK: τίμα τὸν πατέρα σου καὶ τὴν μητέρα, καὶ ἀγαπήσεις τὸν πλησίον σου
//     ὡς σεαυτόν
// VL: honora patrem tuum et matrem tuam et diliges proximum tuum sicut teipsum
applyVulgate('matthew', '19', '19', [
  { r: 'r2',  text: null },
  { r: 'r7',  text: 'matrem tuam', gloss: 'your mother' },
  { r: 'r8',  text: 'et',          gloss: 'and' },
  { r: 'r9',  text: 'diliges',     gloss: 'you will love' },
  { r: 'r11', text: 'proximum',    gloss: 'neighbor' },
  { r: 'r12', text: 'tuum',        gloss: 'your' },
  { r: 'r13', text: 'sicut',       gloss: 'as' },
  { r: 'r14', text: 'teipsum',     gloss: 'yourself' },
]);

// ── Matt 19:20 — CASCADE at ὁ r3 ("adolescens"); "mihi deest" bundle at ὑστερῶ r13 ─────
// GK: Λέγει αὐτῷ ὁ νεανίσκος· πάντα ταῦτα ἐφύλαξα· τί ἔτι ὑστερῶ
// VL: Dicit illi adolescens Omnia hæc custodivi a juventute mea quid adhuc
//     mihi deest
applyVulgate('matthew', '19', '20', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'adolescens', gloss: 'young man' },
  { r: 'r5',  text: 'Omnia',      gloss: 'all' },
  { r: 'r6',  text: 'hæc',        gloss: 'these' },
  { r: 'r7',  text: 'custodivi',  gloss: 'I have kept' },
  { r: 'r8',  text: 'a',          gloss: 'from' },
  { r: 'r9',  text: 'juventute',  gloss: 'youth' },
  { r: 'r10', text: 'mea',        gloss: 'my' },
  { r: 'r11', text: 'quid',       gloss: 'what' },
  { r: 'r12', text: 'adhuc',      gloss: 'yet' },
  { r: 'r13', text: 'mihi deest', gloss: 'do I lack' },
]);

// ── Matt 19:25 — CASCADE at οἱ r3 ("his"); "Auditis his" bundle at Ἀκούσαντες r1;
//    αὐτοῦ r5 has no VL equivalent; "salvus esse" bundle at σωθῆναι r12 ───────────────
// GK: Ἀκούσαντες δὲ οἱ μαθηταὶ αὐτοῦ ἐξεπλήσσοντο σφόδρα λέγοντες·
//     τίς ἄρα δύναται σωθῆναι
// VL: Auditis his discipuli mirabantur valde dicentes Quis ergo poterit
//     salvus esse
applyVulgate('matthew', '19', '25', [
  { r: 'r1',  text: 'Auditis his', gloss: 'having heard these things' },
  { r: 'r3',  text: null },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'mirabantur',  gloss: 'were astonished' },
  { r: 'r7',  text: 'valde',       gloss: 'greatly' },
  { r: 'r8',  text: 'dicentes',    gloss: 'saying' },
  { r: 'r9',  text: 'Quis',        gloss: 'who' },
  { r: 'r10', text: 'ergo',        gloss: 'then' },
  { r: 'r11', text: 'poterit',     gloss: 'can' },
  { r: 'r12', text: 'salvus esse', gloss: 'be saved' },
]);

// ── Matt 19:27 — CASCADE at ὁ r3 ("Petrus"); "secuti sumus" bundle at ἠκολουθήσαμεν r12 ─
// GK: Τότε ἀποκριθεὶς ὁ Πέτρος εἶπεν αὐτῷ· ἰδοὺ ἡμεῖς ἀφήκαμεν πάντα
//     καὶ ἠκολουθήσαμέν σοι· τί ἄρα ἔσται ἡμῖν
// VL: Tunc respondens Petrus dixit ei Ecce nos reliquimus omnia et secuti
//     sumus te quid ergo erit nobis
applyVulgate('matthew', '19', '27', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'Petrus',       gloss: 'Peter' },
  { r: 'r5',  text: 'dixit',        gloss: 'said' },
  { r: 'r6',  text: 'ei',           gloss: 'to him' },
  { r: 'r7',  text: 'Ecce',         gloss: 'behold' },
  { r: 'r8',  text: 'nos',          gloss: 'we' },
  { r: 'r9',  text: 'reliquimus',   gloss: 'have left' },
  { r: 'r10', text: 'omnia',        gloss: 'all things' },
  { r: 'r11', text: 'et',           gloss: 'and' },
  { r: 'r12', text: 'secuti sumus', gloss: 'we have followed' },
]);

// ── Matt 19:28 — CASCADE 1 at Ὁ r1 ("tribus"); CASCADE 2 at οἱ r11 ("Israël");
//    "qui secuti estis" bundle at articular participle r12 ──────────────────────────────
// GK: Ὁ δὲ Ἰησοῦς εἶπεν αὐτοῖς· ἀμὴν λέγω ὑμῖν ὅτι ὑμεῖς οἱ
//     ἀκολουθήσαντές μοι ἐν τῇ παλιγγενεσίᾳ ὅταν καθίσῃ ὁ υἱὸς τοῦ
//     ἀνθρώπου ἐπὶ θρόνου δόξης αὐτοῦ καθήσεσθε καὶ ὑμεῖς ἐπὶ δώδεκα
//     θρόνους κρίνοντες τὰς δώδεκα φυλὰς τοῦ Ἰσραήλ
// VL: Jesus autem dixit illis Amen dico vobis quod vos qui secuti estis me
//     in regeneratione cum sederit Filius hominis in sede majestatis suæ
//     sedebitis et vos super duodecim sedes judicantes duodecim tribus Israël
applyVulgate('matthew', '19', '28', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'autem',           gloss: 'but' },
  { r: 'r3',  text: 'Jesus',           gloss: 'Jesus' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'qui secuti estis', gloss: 'who have followed' },
  { r: 'r13', text: 'me',              gloss: 'me' },
  { r: 'r14', text: 'in',              gloss: 'in' },
  { r: 'r16', text: 'regeneratione',   gloss: 'the regeneration' },
  { r: 'r17', text: 'cum',             gloss: 'when' },
  { r: 'r18', text: 'sederit',         gloss: 'will sit' },
  { r: 'r20', text: 'Filius',          gloss: 'the Son' },
  { r: 'r22', text: 'hominis',         gloss: 'of man' },
  { r: 'r23', text: 'in',              gloss: 'on' },
  { r: 'r24', text: 'sede',            gloss: 'the throne' },
  { r: 'r25', text: 'majestatis',      gloss: 'of his glory' },
  { r: 'r26', text: 'suæ',             gloss: 'his' },
  { r: 'r27', text: 'sedebitis',       gloss: 'you will sit' },
  { r: 'r28', text: 'et',              gloss: 'also' },
  { r: 'r29', text: 'vos',             gloss: 'you' },
  { r: 'r30', text: 'super',           gloss: 'upon' },
  { r: 'r31', text: 'duodecim',        gloss: 'twelve' },
  { r: 'r32', text: 'sedes',           gloss: 'thrones' },
  { r: 'r33', text: 'judicantes',      gloss: 'judging' },
  { r: 'r36', text: 'tribus',          gloss: 'the tribes' },
  { r: 'r38', text: 'Israël',          gloss: 'of Israel' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '19', '1'],
  ['matthew', '19', '4'],
  ['matthew', '19', '6'],
  ['matthew', '19', '8'],
  ['matthew', '19', '11'],
  ['matthew', '19', '12'],
  ['matthew', '19', '13'],
  ['matthew', '19', '18'],
  ['matthew', '19', '19'],
  ['matthew', '19', '20'],
  ['matthew', '19', '25'],
  ['matthew', '19', '27'],
  ['matthew', '19', '28'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
