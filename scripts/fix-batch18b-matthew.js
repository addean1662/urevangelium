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

// ── Matt 15:17 — "emittitur" at τό r5; cascade r5-r17 ────────────────────────
// GK: οὐ νοεῖτε ὅτι πᾶν τὸ εἰσπορευόμενον εἰς τὸ στόμα εἰς τὴν κοιλίαν
//     χωρεῖ καὶ εἰς ἀφεδρῶνα ἐκβάλλεται (17r)
// VL: Non intelligitis quia omne quod intrat in os in ventrem vadit et in
//     secessum emittitur
applyVulgate('matthew', '15', '17', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'quod intrat', gloss: 'that which enters' },
  { r: 'r10', text: 'in',          gloss: 'into' },
  { r: 'r12', text: 'ventrem',     gloss: 'the stomach' },
  { r: 'r13', text: 'vadit',       gloss: 'goes' },
  { r: 'r14', text: 'et',          gloss: 'and' },
  { r: 'r15', text: 'in',          gloss: 'into' },
  { r: 'r16', text: 'secessum',    gloss: 'the sewer' },
  { r: 'r17', text: 'emittitur',   gloss: 'is expelled' },
]);

// ── Matt 15:18 — "coinquinant" at τά r1; cascade r1-r14 ──────────────────────
// GK: τὰ δὲ ἐκπορευόμενα ἐκ τοῦ στόματος ἐκ τῆς καρδίας ἐξέρχεται,
//     κἀκεῖνα κοινοῖ τὸν ἄνθρωπον (14r)
// VL: Quæ autem procedunt de ore de corde exeunt et ea coinquinant hominem
applyVulgate('matthew', '15', '18', [
  { r: 'r1',  text: 'Quæ',         gloss: 'those things which' },
  { r: 'r2',  text: 'autem',       gloss: 'but' },
  { r: 'r3',  text: 'procedunt',   gloss: 'come forth' },
  { r: 'r4',  text: 'de',          gloss: 'from' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'ore',         gloss: 'the mouth' },
  { r: 'r7',  text: 'de',          gloss: 'from' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'corde',       gloss: 'the heart' },
  { r: 'r10', text: 'exeunt',      gloss: 'come out' },
  { r: 'r11', text: 'et ea',       gloss: 'and those things' },
  { r: 'r12', text: 'coinquinant', gloss: 'defile' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'hominem',     gloss: 'a man' },
]);

// ── Matt 15:19 — "corde" at τῆς r3; cascade r2-r13 ──────────────────────────
// GK: ἐκ γὰρ τῆς καρδίας ἐξέρχονται διαλογισμοὶ πονηροί, φόνοι, μοιχεῖαι,
//     πορνεῖαι, κλοπαί, ψευδομαρτυρίαι, βλασφημίαι (13r)
// VL: de corde enim exeunt cogitationes malæ homicidia adulteria fornicationes
//     furta falsa testimonia blasphemiæ
applyVulgate('matthew', '15', '19', [
  { r: 'r2',  text: 'enim',              gloss: 'for' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'corde',             gloss: 'the heart' },
  { r: 'r5',  text: 'exeunt',            gloss: 'come out' },
  { r: 'r6',  text: 'cogitationes',      gloss: 'thoughts' },
  { r: 'r7',  text: 'malæ',              gloss: 'evil' },
  { r: 'r8',  text: 'homicidia',         gloss: 'murders' },
  { r: 'r9',  text: 'adulteria',         gloss: 'adulteries' },
  { r: 'r10', text: 'fornicationes',     gloss: 'fornications' },
  { r: 'r11', text: 'furta',             gloss: 'thefts' },
  { r: 'r12', text: 'falsa testimonia',  gloss: 'false testimonies' },
  { r: 'r13', text: 'blasphemiæ',        gloss: 'blasphemies' },
]);

// ── Matt 15:20 — "coinquinat" at τά r3; cascade r3-r15 ───────────────────────
// GK: ταῦτά ἐστιν τὰ κοινοῦντα τὸν ἄνθρωπον· τὸ δὲ ἀνίπτοις χερσὶν
//     φαγεῖν οὐ κοινοῖ τὸν ἄνθρωπον (15r)
// VL: hæc sunt quæ coinquinant hominem Non autem lotis manibus manducare
//     non coinquinat hominem
applyVulgate('matthew', '15', '20', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'quæ coinquinant', gloss: 'that defile' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'hominem',         gloss: 'a man' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'Non autem',       gloss: 'but not' },
  { r: 'r9',  text: 'lotis',           gloss: 'washed' },
  { r: 'r10', text: 'manibus',         gloss: 'hands' },
  { r: 'r11', text: 'manducare',       gloss: 'to eat' },
  { r: 'r12', text: 'non',             gloss: 'not' },
  { r: 'r13', text: 'coinquinat',      gloss: 'defiles' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'hominem',         gloss: 'a man' },
]);

// ── Matt 15:22 — "finibus" at τῶν r6; "mea" at ἡ r18; double cascade ─────────
// GK: καὶ ἰδοὺ γυνὴ Χαναναία ἀπὸ τῶν ὁρίων ἐκείνων ἐξελθοῦσα ἔκραζεν
//     αὐτῷ λέγουσα· ἐλέησόν με, κύριε υἱὸς Δαυίδ· ἡ θυγάτηρ μου κακῶς
//     δαιμονίζεται (22r)
// VL: Et ecce mulier Chananæa a finibus illis egressa clamavit ei dicens
//     Miserere mei Domine fili David filia mea male a dæmonio vexatur
applyVulgate('matthew', '15', '22', [
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'finibus',            gloss: 'borders' },
  { r: 'r8',  text: 'illis',              gloss: 'those' },
  { r: 'r9',  text: 'egressa',            gloss: 'having come out' },
  { r: 'r10', text: 'clamavit',           gloss: 'cried out' },
  { r: 'r12', text: 'dicens',             gloss: 'saying' },
  { r: 'r13', text: 'Miserere',           gloss: 'have mercy' },
  { r: 'r14', text: 'mei',               gloss: 'on me' },
  { r: 'r15', text: 'Domine',             gloss: 'Lord' },
  { r: 'r16', text: 'fili',               gloss: 'son' },
  { r: 'r17', text: 'David',              gloss: 'of David' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'filia',              gloss: 'daughter' },
  { r: 'r20', text: 'mea',               gloss: 'my' },
  { r: 'r21', text: 'male',              gloss: 'severely' },
  { r: 'r22', text: 'a dæmonio vexatur', gloss: 'is tormented by a demon' },
]);

// ── Matt 15:24 — "domus" at Ὁ r1; cascade r1-r15 ────────────────────────────
// GK: Ὁ δὲ ἀποκριθεὶς εἶπεν· οὐκ ἀπεστάλην εἰ μὴ εἰς τὰ πρόβατα τὰ
//     ἀπολωλότα οἴκου Ἰσραήλ (15r)
// VL: Ipse autem respondens ait Non sum missus nisi ad oves quæ perierunt
//     domus Israël
applyVulgate('matthew', '15', '24', [
  { r: 'r1',  text: 'Ipse',           gloss: 'he himself' },
  { r: 'r2',  text: 'autem',          gloss: 'but' },
  { r: 'r3',  text: 'respondens',     gloss: 'answering' },
  { r: 'r4',  text: 'ait',            gloss: 'said' },
  { r: 'r5',  text: 'Non',            gloss: 'not' },
  { r: 'r6',  text: 'sum missus',     gloss: 'was I sent' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'nisi',           gloss: 'except' },
  { r: 'r9',  text: 'ad',             gloss: 'to' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'oves',           gloss: 'sheep' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'quæ perierunt',  gloss: 'that were lost' },
  { r: 'r14', text: 'domus',          gloss: 'house' },
  { r: 'r15', text: 'Israël',         gloss: 'of Israel' },
]);

// ── Matt 15:27 — "dominorum" at Ἡ r1; "suorum" at τά r8; double cascade ──────
// GK: Ἡ δὲ εἶπεν· ναὶ κύριε· καὶ γὰρ τὰ κυνάρια ἐσθίει ἀπὸ τῶν ψιχίων
//     τῶν πιπτόντων ἀπὸ τῆς τραπέζης τῶν κυρίων αὐτῶν (21r)
// VL: At illa dixit Etiam Domine et nam catelli edunt de micis quæ cadunt
//     de mensa dominorum suorum
applyVulgate('matthew', '15', '27', [
  { r: 'r1',  text: 'At',          gloss: 'but' },
  { r: 'r2',  text: 'illa',        gloss: 'she' },
  { r: 'r3',  text: 'dixit',       gloss: 'said' },
  { r: 'r4',  text: 'Etiam',       gloss: 'yes indeed' },
  { r: 'r5',  text: 'Domine',      gloss: 'Lord' },
  { r: 'r6',  text: 'et',          gloss: 'also' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'catelli',     gloss: 'little dogs' },
  { r: 'r10', text: 'edunt',       gloss: 'eat' },
  { r: 'r11', text: 'de',          gloss: 'from' },
  { r: 'r13', text: 'micis',       gloss: 'crumbs' },
  { r: 'r15', text: 'quæ cadunt',  gloss: 'that fall' },
  { r: 'r16', text: 'de',          gloss: 'from' },
  { r: 'r18', text: 'mensa',       gloss: 'the table' },
  { r: 'r20', text: 'dominorum',   gloss: 'masters' },
  { r: 'r21', text: 'suorum',      gloss: 'their' },
]);

// ── Matt 15:28 — "illa" at ὁ r3; "hora" at ἡ r11; double cascade ─────────────
// GK: Τότε ἀποκριθεὶς ὁ Ἰησοῦς εἶπεν αὐτῇ· ὦ γύναι, μεγάλη σου ἡ πίστις·
//     γενηθήτω σοι ὡς θέλεις· καὶ ἰάθη ἡ θυγάτηρ αὐτῆς ἀπὸ τῆς ὥρας
//     ἐκείνης (25r)
// VL: Tunc respondens Jesus ait illi O mulier magna est fides tua fiat tibi
//     sicut vis Et sanata est filia ejus ex illa hora
applyVulgate('matthew', '15', '28', [
  { r: 'r3',  text: null },
  { r: 'r10', text: 'tua',         gloss: 'your' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'est fides',   gloss: 'is the faith' },
  { r: 'r13', text: 'fiat',        gloss: 'let it be done' },
  { r: 'r14', text: 'tibi',        gloss: 'for you' },
  { r: 'r15', text: 'sicut',       gloss: 'as' },
  { r: 'r16', text: 'vis',         gloss: 'you wish' },
  { r: 'r17', text: 'Et',          gloss: 'and' },
  { r: 'r18', text: 'sanata est',  gloss: 'was healed' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'filia',       gloss: 'daughter' },
  { r: 'r21', text: 'ejus',        gloss: 'her' },
  { r: 'r22', text: 'ex',          gloss: 'from' },
  { r: 'r23', text: null },
  { r: 'r24', text: 'hora',        gloss: 'hour' },
  { r: 'r25', text: 'illa',        gloss: 'that' },
]);

// ── Matt 15:29 — "ibi" at ὁ r4; cascade r2-r18 ───────────────────────────────
// GK: Καὶ μεταβὰς ἐκεῖθεν ὁ Ἰησοῦς ἦλθεν παρὰ τὴν θάλασσαν τῆς
//     Γαλιλαίας, καὶ ἀναβὰς εἰς τὸ ὄρος ἐκάθητο ἐκεῖ (18r)
// VL: Et cum transisset inde Jesus venit secus mare Galilææ et ascendens
//     in montem sedebat ibi
applyVulgate('matthew', '15', '29', [
  { r: 'r2',  text: 'cum transisset', gloss: 'when he had crossed over' },
  { r: 'r3',  text: 'inde',           gloss: 'from there' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Jesus',          gloss: 'Jesus' },
  { r: 'r6',  text: 'venit',          gloss: 'came' },
  { r: 'r7',  text: 'secus',          gloss: 'beside' },
  { r: 'r9',  text: 'mare',           gloss: 'the sea' },
  { r: 'r11', text: 'Galilææ',        gloss: 'of Galilee' },
  { r: 'r12', text: 'et',             gloss: 'and' },
  { r: 'r13', text: 'ascendens',      gloss: 'going up' },
  { r: 'r14', text: 'in',             gloss: 'into' },
  { r: 'r16', text: 'montem',         gloss: 'the mountain' },
  { r: 'r17', text: 'sedebat',        gloss: 'sat' },
  { r: 'r18', text: 'ibi',            gloss: 'there' },
]);

// ── Matt 15:34 — "pisciculos" at ὁ r4; r7/r8 swapped; r15 incomplete ─────────
// GK: Καὶ λέγει αὐτοῖς ὁ Ἰησοῦς· πόσους ἄρτους ἔχετε; οἱ δὲ εἶπαν·
//     ἑπτὰ καὶ ὀλίγα ἰχθύδια (15r)
// VL: Et ait illis Jesus Quot panes habetis At illi dixerunt Septem et
//     paucos pisciculos
applyVulgate('matthew', '15', '34', [
  { r: 'r4',  text: null },
  { r: 'r7',  text: 'panes',             gloss: 'loaves' },
  { r: 'r8',  text: 'habetis',           gloss: 'do you have' },
  { r: 'r15', text: 'paucos pisciculos', gloss: 'a few small fish' },
]);

// ── Matt 15:35 — "terram" at τῷ r3; cascade r3-r8 ────────────────────────────
// GK: καὶ παραγγείλας τῷ ὄχλῳ ἀναπεσεῖν ἐπὶ τὴν γῆν (8r)
// VL: Et præcepit turbæ ut discumberent super terram
applyVulgate('matthew', '15', '35', [
  { r: 'r3',  text: null },
  { r: 'r5',  text: 'ut discumberent', gloss: 'to recline' },
  { r: 'r6',  text: 'super',           gloss: 'upon' },
  { r: 'r8',  text: 'terram',          gloss: 'the ground' },
]);

// ── Matt 15:36 — "dederunt" at τοὺς r3; "populo" at τοὺς r7; cascade ─────────
// GK: καὶ ἔλαβεν τοὺς ἑπτὰ ἄρτους καὶ τοὺς ἰχθύας, καὶ εὐχαριστήσας
//     ἔκλασεν καὶ ἐδίδου τοῖς μαθηταῖς αὐτοῦ, οἱ δὲ μαθηταὶ τοῖς ὄχλοις (21r)
// VL: Et accipiens septem panes et pisces gratias agens fregit et dedit
//     discipulis suis et discipuli turbis
applyVulgate('matthew', '15', '36', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r10', text: 'gratias agens', gloss: 'giving thanks' },
  { r: 'r11', text: 'fregit',        gloss: 'broke' },
  { r: 'r12', text: 'et',            gloss: 'and' },
  { r: 'r13', text: 'dedit',         gloss: 'gave' },
  { r: 'r15', text: 'discipulis',    gloss: 'disciples' },
  { r: 'r16', text: 'suis',          gloss: 'his' },
  { r: 'r18', text: 'et',            gloss: 'and' },
  { r: 'r19', text: 'discipuli',     gloss: 'the disciples' },
  { r: 'r21', text: 'turbis',        gloss: 'the crowds' },
]);

// ── Matt 15:37 — "Et" at τό r7; "superfuit" at τῶν r9; cascade r5-r14 ─────────
// GK: καὶ ἔφαγον πάντες καὶ ἐχορτάσθησαν, καὶ τὸ περισσεῦον τῶν
//     κλασμάτων ἦραν, ἑπτὰ σπυρίδας πλήρεις (14r)
// VL: Et comederunt omnes et saturati sunt Et quod superfuit de fragmentis
//     tulerunt septem sportas plenas
applyVulgate('matthew', '15', '37', [
  { r: 'r5',  text: 'saturati sunt',  gloss: 'were satisfied' },
  { r: 'r6',  text: 'Et',             gloss: 'and' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'quod superfuit', gloss: 'that which remained' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'de fragmentis',  gloss: 'of fragments' },
  { r: 'r11', text: 'tulerunt',       gloss: 'they took up' },
  { r: 'r12', text: 'septem',         gloss: 'seven' },
  { r: 'r13', text: 'sportas',        gloss: 'baskets' },
  { r: 'r14', text: 'plenas',         gloss: 'full' },
]);

// ── Matt 15:38 — "Erant" at οἱ r1; cascade r1-r10 ────────────────────────────
// GK: οἱ δὲ ἐσθίοντες ἦσαν τετρακισχίλιοι ἄνδρες χωρὶς γυναικῶν καὶ
//     παιδίων (10r)
// VL: Erant autem qui manducaverunt quatuor millia hominum extra mulieres
//     et parvulos
applyVulgate('matthew', '15', '38', [
  { r: 'r1',  text: null },
  { r: 'r3',  text: 'qui manducaverunt', gloss: 'who ate' },
  { r: 'r4',  text: 'Erant',            gloss: 'were' },
  { r: 'r5',  text: 'quatuor millia',   gloss: 'four thousand' },
  { r: 'r6',  text: 'hominum',          gloss: 'men' },
  { r: 'r7',  text: 'extra',            gloss: 'besides' },
  { r: 'r8',  text: 'mulieres',         gloss: 'women' },
  { r: 'r9',  text: 'et',               gloss: 'and' },
  { r: 'r10', text: 'parvulos',         gloss: 'children' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '15', '17'],
  ['matthew', '15', '18'],
  ['matthew', '15', '19'],
  ['matthew', '15', '20'],
  ['matthew', '15', '22'],
  ['matthew', '15', '24'],
  ['matthew', '15', '27'],
  ['matthew', '15', '28'],
  ['matthew', '15', '29'],
  ['matthew', '15', '34'],
  ['matthew', '15', '35'],
  ['matthew', '15', '36'],
  ['matthew', '15', '37'],
  ['matthew', '15', '38'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
