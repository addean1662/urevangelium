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

// ── Matt 14:9 — king sorrowful for his oath ──────────────────────────────────
// GK: καὶ λυπηθεὶς ὁ βασιλεὺς διὰ δὲ τοὺς ὅρκους καὶ τοὺς συνανακειμένους
//     ἐκέλευσεν δοθῆναι (13r)
// VL: Et contristatus est rex propter juramentum et eos qui pariter recumbebant
//     jussit dari
// Problem: "est" split to article ὁ r3; cascade r2-r13
applyVulgate('matthew', '14', '9', [
  { r: 'r2',  text: 'contristatus est', gloss: 'was grieved' },
  { r: 'r3',  text: null },
  { r: 'r6',  text: null },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'juramentum',        gloss: 'oath' },
  { r: 'r9',  text: 'et',                gloss: 'and' },
  { r: 'r10', text: 'eos',               gloss: 'those' },
  { r: 'r11', text: 'qui pariter recumbebant', gloss: 'who reclined with him' },
  { r: 'r12', text: 'jussit',            gloss: 'ordered' },
  { r: 'r13', text: 'dari',              gloss: 'to be given' },
]);

// ── Matt 14:12 — disciples bury John ────────────────────────────────────────
// GK: Καὶ προσελθόντες οἱ μαθηταὶ αὐτοῦ ἦραν τὸ πτῶμα καὶ ἔθαψαν αὐτόν,
//     καὶ ἐλθόντες ἀπήγγειλαν τῷ Ἰησοῦ (16r)
// VL: Et accedentes discipuli ejus tulerunt corpus ejus et sepelierunt illud
//     et venientes nuntiaverunt Jesu
// Problem: "Jesu" at article οἱ r3; cascade r3-r16
applyVulgate('matthew', '14', '12', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'discipuli',    gloss: 'disciples' },
  { r: 'r5',  text: 'ejus',         gloss: 'his' },
  { r: 'r6',  text: 'tulerunt',     gloss: 'took' },
  { r: 'r8',  text: 'corpus ejus',  gloss: 'his body' },
  { r: 'r9',  text: 'et',           gloss: 'and' },
  { r: 'r10', text: 'sepelierunt',  gloss: 'buried' },
  { r: 'r11', text: 'illud',        gloss: 'it' },
  { r: 'r12', text: 'et',           gloss: 'and' },
  { r: 'r13', text: 'venientes',    gloss: 'coming' },
  { r: 'r14', text: 'nuntiaverunt', gloss: 'reported' },
  { r: 'r16', text: 'Jesu',         gloss: 'to Jesus' },
]);

// ── Matt 14:13 — Jesus withdraws to a desert place ─────────────────────────
// GK: Καὶ Ἀκούσας δὲ ὁ Ἰησοῦς ἀνεχώρησεν ἐκεῖθεν ἐν πλοίῳ εἰς ἔρημον
//     τόπον κατ᾽ ἰδίαν. καὶ ἀκούσαντες οἱ ὄχλοι ἠκολούθησαν αὐτῷ πεζῇ
//     ἀπὸ τῶν πόλεων (24r)
// VL: Quod cum audisset Jesus secessit inde in navicula in locum desertum
//     seorsum et cum audissent turbæ secutæ sunt eum pedestres de civitatibus
// Problem: "civitatibus" at article ὁ r4; ἔρημον/τόπον swapped; cascade r2-r24
applyVulgate('matthew', '14', '13', [
  { r: 'r2',  text: 'cum audisset', gloss: 'when he heard' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: null },
  { r: 'r11', text: 'desertum',     gloss: 'desert' },
  { r: 'r12', text: 'locum',        gloss: 'place' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'et',           gloss: 'and' },
  { r: 'r16', text: 'cum audissent', gloss: 'when they heard' },
  { r: 'r19', text: 'secutæ sunt',  gloss: 'followed' },
  { r: 'r20', text: 'eum',          gloss: 'him' },
  { r: 'r21', text: 'pedestres',    gloss: 'on foot' },
  { r: 'r22', text: 'de',           gloss: 'from' },
  { r: 'r24', text: 'civitatibus',  gloss: 'towns' },
]);

// ── Matt 14:15 — disciples urge Jesus to send crowd away ────────────────────
// GK: Ὀψίας δὲ γενομένης προσῆλθον αὐτῷ οἱ μαθηταὶ αὐτοῦ λέγοντες· ἔρημός
//     ἐστιν ὁ τόπος, καὶ ἡ ὥρα ἤδη παρῆλθεν· ἀπόλυσον τοὺς ὄχλους ἵνα
//     ἀπελθόντες εἰς τὰς κώμας ἀγοράσωσιν ἑαυτοῖς βρώματα (29r)
// VL: Vespere autem facto accesserunt ad eum discipuli ejus dicentes Desertus
//     est locus et hora jam præteriit dimitte turbas ut euntes in castella
//     emant sibi escas
// Problem: "escas" at article οἱ r6; full cascade r5-r29
applyVulgate('matthew', '14', '15', [
  { r: 'r5',  text: 'ad eum',      gloss: 'to him' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'discipuli',   gloss: 'disciples' },
  { r: 'r8',  text: 'ejus',        gloss: 'his' },
  { r: 'r9',  text: 'dicentes',    gloss: 'saying' },
  { r: 'r10', text: 'Desertus',    gloss: 'deserted' },
  { r: 'r11', text: 'est',         gloss: 'is' },
  { r: 'r13', text: 'locus',       gloss: 'the place' },
  { r: 'r14', text: 'et',          gloss: 'and' },
  { r: 'r16', text: 'hora',        gloss: 'the hour' },
  { r: 'r17', text: 'jam',         gloss: 'already' },
  { r: 'r18', text: 'præteriit',   gloss: 'has passed' },
  { r: 'r19', text: 'dimitte',     gloss: 'send away' },
  { r: 'r21', text: 'turbas',      gloss: 'the crowds' },
  { r: 'r22', text: 'ut',          gloss: 'so that' },
  { r: 'r23', text: 'euntes',      gloss: 'going' },
  { r: 'r24', text: 'in',          gloss: 'into' },
  { r: 'r26', text: 'castella',    gloss: 'villages' },
  { r: 'r27', text: 'emant',       gloss: 'they may buy' },
  { r: 'r28', text: 'sibi',        gloss: 'for themselves' },
  { r: 'r29', text: 'escas',       gloss: 'food' },
]);

// ── Matt 14:20 — twelve baskets of fragments ────────────────────────────────
// GK: καὶ ἔφαγον πάντες καὶ ἐχορτάσθησαν· καὶ ἦραν τὸ περισσεῦον τῶν
//     κλασμάτων δώδεκα κοφίνους πλήρεις (14r)
// VL: Et manducaverunt omnes et saturati sunt Et tulerunt reliquias duodecim
//     cophinos plenos fragmentorum
// Problem: "plenos" at article τό r8; r5-r14 cascade
applyVulgate('matthew', '14', '20', [
  { r: 'r5',  text: 'saturati sunt', gloss: 'were satisfied' },
  { r: 'r6',  text: 'Et',            gloss: 'and' },
  { r: 'r7',  text: 'tulerunt',      gloss: 'they took up' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'reliquias',     gloss: 'the remnants' },
  { r: 'r11', text: 'fragmentorum',  gloss: 'of fragments' },
  { r: 'r14', text: 'plenos',        gloss: 'full' },
]);

// ── Matt 14:21 — five thousand men besides women and children ─────────────────
// GK: οἱ δὲ ἐσθίοντες ἦσαν ἄνδρες ὡσεὶ πεντακισχίλιοι χωρὶς γυναικῶν καὶ
//     παιδίων (11r)
// VL: Manducantium autem fuit numerus quinque millia virorum exceptis mulieribus
//     et parvulis
// Problem: "Manducantium" at r1 is legitimate articular; but r3-r7 cascade
//          from absent "numerus" slot
applyVulgate('matthew', '14', '21', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'fuit',          gloss: 'was' },
  { r: 'r5',  text: 'virorum',       gloss: 'of men' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'quinque millia', gloss: 'five thousand' },
]);

// ── Matt 14:30 — Peter fears the wind ───────────────────────────────────────
// GK: βλέπων δὲ τὸν ἄνεμον ἰσχυρὸν ἐφοβήθη, καὶ ἀρξάμενος καταποντίζεσθαι
//     ἔκραξεν λέγων· κύριε, σῶσόν με (14r)
// VL: Videns vero ventum validum timuit et cum cœpisset mergi clamavit dicens
//     Domine salvum me fac
// Problem: "ventum" at article τόν r3; cascade r3-r8
applyVulgate('matthew', '14', '30', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'ventum',        gloss: 'wind' },
  { r: 'r5',  text: 'validum',       gloss: 'strong' },
  { r: 'r6',  text: 'timuit',        gloss: 'feared' },
  { r: 'r7',  text: 'et',            gloss: 'and' },
  { r: 'r8',  text: 'cum cœpisset',  gloss: 'when he began' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '14', '9'],
  ['matthew', '14', '12'],
  ['matthew', '14', '13'],
  ['matthew', '14', '15'],
  ['matthew', '14', '20'],
  ['matthew', '14', '21'],
  ['matthew', '14', '30'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
