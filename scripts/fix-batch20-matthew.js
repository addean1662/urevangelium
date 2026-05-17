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

// ── Matt 17:2 — "sicut" at τό r7; "nix" at ὁ r11; cascade r2-r21 ─────────────
// GK: καὶ μετεμορφώθη ἔμπροσθεν αὐτῶν καὶ ἔλαμψεν τὸ πρόσωπον αὐτοῦ
//     ὡς ὁ ἥλιος τὰ δὲ ἱμάτια αὐτοῦ ἐγένετο λευκὰ ὡς τὸ φῶς (21r)
// VL: et transfiguratus est ante eos Et resplenduit facies ejus sicut sol
//     vestimenta autem ejus facta sunt alba sicut nix
applyVulgate('matthew', '17', '2', [
  { r: 'r2',  text: 'transfiguratus est', gloss: 'was transfigured' },
  { r: 'r3',  text: 'ante',              gloss: 'before' },
  { r: 'r4',  text: 'eos',              gloss: 'them' },
  { r: 'r5',  text: 'Et',               gloss: 'and' },
  { r: 'r6',  text: 'resplenduit',      gloss: 'shone' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'facies',           gloss: 'face' },
  { r: 'r9',  text: 'ejus',             gloss: 'his' },
  { r: 'r10', text: 'sicut',            gloss: 'as' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'sol',              gloss: 'the sun' },
  { r: 'r14', text: 'autem',            gloss: 'and' },
  { r: 'r16', text: 'ejus',             gloss: 'his' },
  { r: 'r17', text: 'facta sunt',       gloss: 'became' },
  { r: 'r18', text: 'alba',             gloss: 'white' },
  { r: 'r19', text: 'sicut',            gloss: 'as' },
  { r: 'r21', text: 'nix',              gloss: 'snow' },
]);

// ── Matt 17:5 — "ipsum" at τῆς r13; "audite" at ὁ r18; cascade r13-r27 ───────
// GK: Ἔτι αὐτοῦ λαλοῦντος ἰδοὺ νεφέλη φωτεινὴ ἐπεσκίασεν αὐτούς, καὶ
//     ἰδοὺ φωνὴ ἐκ τῆς νεφέλης λέγουσα· οὗτός ἐστιν ὁ υἱός μου ὁ
//     ἀγαπητὸς ἐν ᾧ εὐδόκησα· ἀκούετε αὐτοῦ (27r)
// VL: Adhuc eo loquente ecce nubes lucida obumbravit eos Et ecce vox de nube
//     dicens Hic est Filius meus dilectus in quo mihi bene complacui ipsum audite
applyVulgate('matthew', '17', '5', [
  { r: 'r13', text: null },
  { r: 'r18', text: null },
  { r: 'r25', text: 'mihi bene complacui', gloss: 'I am well pleased' },
  { r: 'r26', text: 'audite',              gloss: 'hear' },
  { r: 'r27', text: 'ipsum',              gloss: 'him' },
]);

// ── Matt 17:7 — "Jesus" at ὁ r3; cascade r3-r8 ───────────────────────────────
// GK: καὶ προσῆλθεν ὁ Ἰησοῦς καὶ ἁψάμενος αὐτῶν εἶπεν· ἐγέρθητε καὶ
//     μὴ φοβεῖσθε (12r)
// VL: Et accessit Jesus et tetigit eos dixitque eis Surgite et nolite timere
applyVulgate('matthew', '17', '7', [
  { r: 'r3', text: null },
  { r: 'r4', text: 'Jesus',        gloss: 'Jesus' },
  { r: 'r5', text: 'et',           gloss: 'and' },
  { r: 'r6', text: 'tetigit',      gloss: 'touched' },
  { r: 'r7', text: 'eos',          gloss: 'them' },
  { r: 'r8', text: 'dixitque eis', gloss: 'and said to them' },
]);

// ── Matt 17:14 — "turbam" at τόν r5; cascade r5-r11 ─────────────────────────
// GK: Καὶ ἐλθόντων αὐτῶν πρὸς τὸν ὄχλον προσῆλθεν αὐτῷ ἄνθρωπος
//     γονυπετῶν αὐτόν (11r)
// VL: Et cum venissent ad turbam accessit ad eum homo genibus provolutus
applyVulgate('matthew', '17', '14', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'turbam',           gloss: 'the crowd' },
  { r: 'r7',  text: 'accessit',         gloss: 'came to' },
  { r: 'r8',  text: 'ad eum',           gloss: 'to him' },
  { r: 'r10', text: 'genibus provolutus', gloss: 'kneeling before him' },
  { r: 'r11', text: null },
]);

// ── Matt 17:16 — v17 content bled into v16; full rebuild ─────────────────────
// GK: καὶ προσήνεγκα αὐτὸν τοῖς μαθηταῖς σου καὶ οὐκ ἠδυνήθησαν αὐτὸν
//     θεραπεῦσαι (11r)
// VL: et obtuli eum discipulis tuis et non potuerunt curare eum
applyVulgate('matthew', '17', '16', [
  { r: 'r1',  text: 'et',          gloss: 'and' },
  { r: 'r2',  text: 'obtuli',      gloss: 'I brought' },
  { r: 'r3',  text: 'eum',         gloss: 'him' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'discipulis',  gloss: 'to the disciples' },
  { r: 'r6',  text: 'tuis',        gloss: 'your' },
  { r: 'r7',  text: 'et',          gloss: 'and' },
  { r: 'r8',  text: 'non',         gloss: 'not' },
  { r: 'r9',  text: 'potuerunt',   gloss: 'were able' },
  { r: 'r10', text: 'eum',         gloss: 'him' },
  { r: 'r11', text: 'curare',      gloss: 'to heal' },
]);

// ── Matt 17:19 — v20 content bled into v19; "Jesus" at οἱ r3; full rebuild ────
// GK: Τότε προσελθόντες οἱ μαθηταὶ τῷ Ἰησοῦ κατ᾽ ἰδίαν εἶπον· διὰ τί
//     ἡμεῖς οὐκ ἠδυνήθημεν ἐκβαλεῖν αὐτό (16r)
// VL: Tunc accedentes discipuli ad Jesum secreto dixerunt Quare nos non
//     potuimus ejicere eum
applyVulgate('matthew', '17', '19', [
  { r: 'r1',  text: 'Tunc',       gloss: 'then' },
  { r: 'r2',  text: 'accedentes', gloss: 'having come' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'discipuli',  gloss: 'the disciples' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'ad Jesum',  gloss: 'to Jesus' },
  { r: 'r7',  text: 'secreto',   gloss: 'privately' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'dixerunt',  gloss: 'said' },
  { r: 'r10', text: 'Quare',     gloss: 'why' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'nos',       gloss: 'we' },
  { r: 'r13', text: 'non',       gloss: 'not' },
  { r: 'r14', text: 'potuimus',  gloss: 'were able' },
  { r: 'r15', text: 'ejicere',   gloss: 'to cast out' },
  { r: 'r16', text: 'eum',       gloss: 'it' },
]);

// ── Matt 17:24 — "ad" at τῷ r11; "ei" at ὁ r15; cascade r11-r16 ─────────────
// GK: προσῆλθον οἱ τὰ δίδραχμα λαμβάνοντες τῷ Πέτρῳ καὶ εἶπαν· ὁ
//     διδάσκαλος ὑμῶν οὐ τελεῖ τὰ δίδραχμα (21r)
// VL: accesserunt qui didrachma accipiebant ad Petrum et dixerunt ei Magister
//     vester non solvit didrachma
// Note: r7 οἱ="qui" is LEGITIMATE (articular participle → qui accipiebant)
applyVulgate('matthew', '17', '24', [
  { r: 'r11', text: null },
  { r: 'r12', text: 'ad Petrum',  gloss: 'to Peter' },
  { r: 'r14', text: 'dixerunt ei', gloss: 'said to him' },
  { r: 'r15', text: null },
]);

// ── Matt 17:26 — "ille" at ὁ r4; "alienis" at τῶν r7; "Jesus" at ὁ r11;
//    "filii" at οἱ r17; cascade r1-r18 ────────────────────────────────────────
// GK: εἰπόντος δὲ αὐτῷ ὁ Πέτρος· ἀπὸ τῶν ἀλλοτρίων, ἔφη αὐτῷ ὁ Ἰησοῦς·
//     ἄρα γε ἐλεύθεροί εἰσιν οἱ υἱοί (18r)
// VL: At illo dicente Ab alienis dixit illi Jesus Ergo liberi sunt filii
applyVulgate('matthew', '17', '26', [
  { r: 'r1',  text: 'At illo dicente', gloss: 'but when he said' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Ab',             gloss: 'from' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'alienis',        gloss: 'strangers' },
  { r: 'r9',  text: 'dixit',          gloss: 'said' },
  { r: 'r10', text: 'illi',           gloss: 'to him' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'Jesus',          gloss: 'Jesus' },
  { r: 'r13', text: 'Ergo',           gloss: 'therefore' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'liberi',         gloss: 'free' },
  { r: 'r16', text: 'sunt',           gloss: 'are' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'filii',          gloss: 'the sons' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '17', '2'],
  ['matthew', '17', '5'],
  ['matthew', '17', '7'],
  ['matthew', '17', '14'],
  ['matthew', '17', '16'],
  ['matthew', '17', '19'],
  ['matthew', '17', '24'],
  ['matthew', '17', '26'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
