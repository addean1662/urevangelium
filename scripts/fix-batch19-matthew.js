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

// ── Matt 16:1 — "ad" at οἱ r3; "ut" at τοῦ r12; cascade r3-r15 ──────────────
// GK: καὶ προσελθόντες οἱ Φαρισαῖοι καὶ Σαδδουκαῖοι πειράζοντες ἐπηρώτησαν
//     αὐτὸν σημεῖον ἐκ τοῦ οὐρανοῦ ἐπιδεῖξαι αὐτοῖς (15r)
// VL: Et accesserunt ad eum pharisæi et sadducæi tentantes et rogaverunt eum
//     signum de cælo ostenderet eis
applyVulgate('matthew', '16', '1', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'pharisæi',      gloss: 'Pharisees' },
  { r: 'r5',  text: 'et',            gloss: 'and' },
  { r: 'r6',  text: 'sadducæi',      gloss: 'Sadducees' },
  { r: 'r7',  text: 'tentantes',     gloss: 'testing' },
  { r: 'r8',  text: 'et rogaverunt', gloss: 'and asked' },
  { r: 'r9',  text: 'eum',           gloss: 'him' },
  { r: 'r10', text: 'signum',        gloss: 'a sign' },
  { r: 'r11', text: 'de',            gloss: 'from' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'cælo',          gloss: 'heaven' },
  { r: 'r14', text: 'ostenderet',    gloss: 'to show' },
  { r: 'r15', text: 'eis',           gloss: 'to them' },
]);

// ── Matt 16:2 — r6/r7 swapped; "est" at ὁ r12; cascade r9-r13 ───────────────
// GK: Ὁ δὲ ἀποκριθεὶς εἶπεν αὐτοῖς· ὀψίας γενομένης λέγετε· εὐδία,
//     πυρράζει γὰρ ὁ οὐρανός (13r)
// VL: At ille respondens ait illis Facto vespere dicitis Serenum erit
//     rubicundum est enim caelum
applyVulgate('matthew', '16', '2', [
  { r: 'r6',  text: 'vespere',        gloss: 'evening' },
  { r: 'r7',  text: 'facto',          gloss: 'having come' },
  { r: 'r9',  text: 'Serenum erit',   gloss: 'fair weather it will be' },
  { r: 'r10', text: 'rubicundum est', gloss: 'is red' },
  { r: 'r11', text: 'enim',           gloss: 'for' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'caelum',         gloss: 'sky' },
]);

// ── Matt 16:4 — v3 content bled into v4 rows r1-r11; full rebuild ─────────────
// GK: γενεὰ πονηρὰ καὶ μοιχαλὶς σημεῖον ἐπιζητεῖ· καὶ σημεῖον οὐ
//     δοθήσεται αὐτῇ εἰ μὴ τὸ σημεῖον Ἰωνᾶ τοῦ προφήτου. καὶ καταλιπὼν
//     αὐτοὺς ἀπῆλθεν (22r)
// VL: Generatio mala et adultera signum quærit et signum non dabitur ei nisi
//     signum Jonæ prophetæ Et relictis illis abiit
applyVulgate('matthew', '16', '4', [
  { r: 'r1',  text: 'Generatio',  gloss: 'generation' },
  { r: 'r2',  text: 'mala',       gloss: 'evil' },
  { r: 'r3',  text: 'et',         gloss: 'and' },
  { r: 'r4',  text: 'adultera',   gloss: 'adulterous' },
  { r: 'r5',  text: 'signum',     gloss: 'sign' },
  { r: 'r6',  text: 'quærit',     gloss: 'seeks' },
  { r: 'r7',  text: 'et',         gloss: 'and' },
  { r: 'r8',  text: 'signum',     gloss: 'sign' },
  { r: 'r9',  text: 'non',        gloss: 'not' },
  { r: 'r10', text: 'dabitur',    gloss: 'will be given' },
  { r: 'r11', text: 'ei',         gloss: 'to it' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'nisi',       gloss: 'except' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'signum',     gloss: 'sign' },
  { r: 'r16', text: 'Jonæ',       gloss: 'of Jonah' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'prophetæ',   gloss: 'the prophet' },
  { r: 'r19', text: 'Et',         gloss: 'and' },
  { r: 'r20', text: 'relictis',   gloss: 'having left' },
  { r: 'r21', text: 'illis',      gloss: 'them' },
  { r: 'r22', text: 'abiit',      gloss: 'went away' },
]);

// ── Matt 16:5 — "venissent" at οἱ r3; "fretum" at τό r7; cascade r2-r9 ──────
// GK: Καὶ ἐλθόντες οἱ μαθηταὶ αὐτοῦ εἰς τὸ πέραν ἐπελάθοντο ἄρτους
//     λαβεῖν (11r)
// VL: Et cum venissent discipuli ejus trans fretum obliti sunt panes accipere
applyVulgate('matthew', '16', '5', [
  { r: 'r2', text: 'cum venissent', gloss: 'when they had come' },
  { r: 'r3', text: null },
  { r: 'r7', text: null },
  { r: 'r8', text: 'fretum',        gloss: 'the strait' },
  { r: 'r9', text: 'obliti sunt',   gloss: 'forgot' },
]);

// ── Matt 16:9 — "quinque" at τοὺς r5; "quinque" at τῶν r8; cascade r5-r13 ───
// GK: οὔπω νοεῖτε οὐδὲ μνημονεύετε τοὺς πέντε ἄρτους τῶν πεντακισχιλίων
//     καὶ πόσους κοφίνους ἐλάβετε (13r)
// VL: Nondum intelligitis neque recordamini quinque panum quinque millia
//     hominum et quot cophinos sumpsistis
applyVulgate('matthew', '16', '9', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'quinque',             gloss: 'five' },
  { r: 'r7',  text: 'panum',               gloss: 'of loaves' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'quinque millia hominum', gloss: 'five thousand men' },
  { r: 'r10', text: 'et',                  gloss: 'and' },
  { r: 'r11', text: 'quot',               gloss: 'how many' },
  { r: 'r12', text: 'cophinos',           gloss: 'baskets' },
  { r: 'r13', text: 'sumpsistis',         gloss: 'you took up' },
]);

// ── Matt 16:10 — "septem" at τοὺς r2; "quatuor" at τῶν r5; cascade r2-r10 ───
// GK: οὐδὲ τοὺς ἑπτὰ ἄρτους τῶν τετρακισχιλίων καὶ πόσας σπυρίδας
//     ἐλάβετε (10r)
// VL: neque septem panum quatuor millia hominum et quot sportas sumpsistis
applyVulgate('matthew', '16', '10', [
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'septem',              gloss: 'seven' },
  { r: 'r4',  text: 'panum',               gloss: 'of loaves' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'quatuor millia hominum', gloss: 'four thousand men' },
  { r: 'r7',  text: 'et',                  gloss: 'and' },
  { r: 'r8',  text: 'quot',               gloss: 'how many' },
  { r: 'r9',  text: 'sportas',            gloss: 'baskets' },
  { r: 'r10', text: 'sumpsistis',         gloss: 'you took up' },
]);

// ── Matt 16:14 — "ex" at οἱ r1; "prophetis" at οἱ r4; full cascade ───────────
// GK: οἱ δὲ εἶπαν· οἱ μέν· Ἰωάννην τὸν βαπτιστήν, ἄλλοι δέ· Ἠλίαν,
//     ἕτεροι δέ· Ἰερεμίαν ἢ ἕνα τῶν προφητῶν (18r)
// VL: At illi dixerunt Alii Joannem Baptistam alii autem Eliam alii vero
//     Jeremiam aut unum ex prophetis
applyVulgate('matthew', '16', '14', [
  { r: 'r1',  text: 'At',           gloss: 'but' },
  { r: 'r2',  text: 'illi',         gloss: 'they' },
  { r: 'r3',  text: 'dixerunt',     gloss: 'said' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Alii',         gloss: 'some' },
  { r: 'r6',  text: 'Joannem',      gloss: 'John' },
  { r: 'r8',  text: 'Baptistam',    gloss: 'the Baptist' },
  { r: 'r9',  text: 'alii',         gloss: 'others' },
  { r: 'r10', text: 'autem',        gloss: 'however' },
  { r: 'r11', text: 'Eliam',        gloss: 'Elijah' },
  { r: 'r12', text: 'alii',         gloss: 'others' },
  { r: 'r13', text: 'vero',         gloss: 'indeed' },
  { r: 'r14', text: 'Jeremiam',     gloss: 'Jeremiah' },
  { r: 'r15', text: 'aut',          gloss: 'or' },
  { r: 'r16', text: 'unum',         gloss: 'one' },
  { r: 'r18', text: 'ex prophetis', gloss: 'of the prophets' },
]);

// ── Matt 16:17 — "cælis" at ὁ r4; "est" at ὁ r20; full cascade ──────────────
// GK: Καὶ Ἀποκριθεὶς δὲ ὁ Ἰησοῦς εἶπεν αὐτῷ· μακάριος εἶ Σίμων Βαριωνᾶ
//     ὅτι σὰρξ καὶ αἷμα οὐκ ἀπεκάλυψέν σοι ἀλλ᾽ ὁ πατήρ μου ὁ ἐν τοῖς
//     οὐρανοῖς (26r)
// VL: Respondens autem Jesus dixit ei Beatus es Simon Bar Jona quia caro et
//     sanguis non revelavit tibi sed Pater meus qui est in cælis
applyVulgate('matthew', '16', '17', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'Respondens', gloss: 'answering' },
  { r: 'r3',  text: 'autem',     gloss: 'now' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Jesus',     gloss: 'Jesus' },
  { r: 'r6',  text: 'dixit',     gloss: 'said' },
  { r: 'r7',  text: 'ei',        gloss: 'to him' },
  { r: 'r8',  text: 'Beatus',    gloss: 'blessed' },
  { r: 'r9',  text: 'es',        gloss: 'you are' },
  { r: 'r10', text: 'Simon',     gloss: 'Simon' },
  { r: 'r11', text: 'Bar Jona',  gloss: 'son of Jona' },
  { r: 'r20', text: null },
  { r: 'r23', text: 'qui',       gloss: 'who' },
  { r: 'r24', text: 'est in',    gloss: 'is in' },
  { r: 'r26', text: 'cælis',     gloss: 'the heavens' },
]);

// ── Matt 16:23 — "sunt" at Ὁ r1; "sed" at τῷ r5; cascade r1-r23 ─────────────
// GK: Ὁ δὲ στραφεὶς εἶπεν τῷ Πέτρῳ· ὕπαγε ὀπίσω μου σατανᾶ· σκάνδαλον
//     εἶ ἐμοῦ· ὅτι οὐ φρονεῖς τὰ τοῦ θεοῦ ἀλλὰ τὰ τῶν ἀνθρώπων (23r)
// VL: Qui conversus dixit Petro Vade post me Satana scandalum es mihi quia
//     non sapis ea quæ Dei sunt sed ea quæ hominum
applyVulgate('matthew', '16', '23', [
  { r: 'r1',  text: 'Qui',      gloss: 'who' },
  { r: 'r2',  text: null },
  { r: 'r5',  text: null },
  { r: 'r17', text: 'ea quæ',   gloss: 'the things which' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'Dei sunt', gloss: 'are of God' },
  { r: 'r20', text: 'sed',      gloss: 'but' },
  { r: 'r21', text: 'ea quæ',   gloss: 'the things which' },
  { r: 'r23', text: 'hominum',  gloss: 'of men' },
]);

// ── Matt 16:26 — "anima" at τόν r6; "sua" at τήν r10; cascade r6-r22 ─────────
// GK: Τί γὰρ ὠφεληθήσεται ἄνθρωπος ἐὰν τὸν κόσμον ὅλον κερδήσῃ τὴν δὲ
//     ψυχὴν αὐτοῦ ζημιωθῇ; ἢ τί δώσει ἄνθρωπος ἀντάλλαγμα τῆς ψυχῆς
//     αὐτοῦ (22r)
// VL: Quid enim prodest homini si mundum universum lucretur animæ vero suæ
//     detrimentum patiatur aut quam dabit homo commutationem anima sua
applyVulgate('matthew', '16', '26', [
  { r: 'r6',  text: null },
  { r: 'r10', text: null },
  { r: 'r11', text: 'vero',               gloss: 'but' },
  { r: 'r12', text: 'animæ',              gloss: 'of soul' },
  { r: 'r13', text: 'suæ',               gloss: 'his' },
  { r: 'r14', text: 'detrimentum patiatur', gloss: 'suffer loss' },
  { r: 'r15', text: 'aut',               gloss: 'or' },
  { r: 'r16', text: 'quam',              gloss: 'what' },
  { r: 'r17', text: 'dabit',             gloss: 'will give' },
  { r: 'r18', text: 'homo',              gloss: 'a man' },
  { r: 'r19', text: 'commutationem',     gloss: 'exchange' },
  { r: 'r21', text: 'anima',             gloss: 'soul' },
  { r: 'r22', text: 'sua',               gloss: 'his' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '16', '1'],
  ['matthew', '16', '2'],
  ['matthew', '16', '4'],
  ['matthew', '16', '5'],
  ['matthew', '16', '9'],
  ['matthew', '16', '10'],
  ['matthew', '16', '14'],
  ['matthew', '16', '17'],
  ['matthew', '16', '23'],
  ['matthew', '16', '26'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
