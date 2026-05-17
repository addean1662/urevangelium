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

// ── Luke 1:32 — "He will be called Son of the Most High" ─────────────────────
// GK: ... καὶ δώσει αὐτῷ κύριος ὁ θεὸς τὸν θρόνον Δαυὶδ τοῦ πατρὸς αὐτοῦ (19r)
// VL: ... et dabit illi Dominus Deus sedem David patris ejus
// Problem: "Deus" at article row r12 (ὁ); cascade r12-r19
applyVulgate('luke', '1', '32', [
  { r: 'r12', text: null },
  { r: 'r13', text: 'Deus',   gloss: 'God' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'sedem',  gloss: 'throne' },
  { r: 'r16', text: 'David',  gloss: 'David' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'patris', gloss: 'father' },
  { r: 'r19', text: 'ejus',   gloss: 'his' },
]);

// ── Luke 1:35 — "The Holy Spirit will come upon you" ─────────────────────────
// GK: Καὶ ἀποκριθεὶς ὁ ἄγγελος εἶπεν αὐτῇ· πνεῦμα ἅγιον ἐπελεύσεται ἐπὶ σὲ
//     καὶ δύναμις ὑψίστου ἐπισκιάσει σοι· διὸ καὶ τὸ γεννώμενον ἅγιον
//     κληθήσεται υἱὸς θεοῦ (24r)
// VL: Et respondens angelus dixit ei Spiritus Sanctus superveniet in te et virtus
//     Altissimi obumbrabit tibi Ideoque et quod nascetur ex te sanctum vocabitur Filius Dei
// Problem: "angelus" at article row r3 (ὁ); cascade through r24
applyVulgate('luke', '1', '35', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'angelus',        gloss: 'angel' },
  { r: 'r5',  text: 'dixit',          gloss: 'said' },
  { r: 'r6',  text: 'ei',             gloss: 'to her' },
  { r: 'r7',  text: 'Spiritus',       gloss: 'Spirit' },
  { r: 'r8',  text: 'Sanctus',        gloss: 'Holy' },
  { r: 'r9',  text: 'superveniet',    gloss: 'will come upon' },
  { r: 'r10', text: 'in',             gloss: 'upon' },
  { r: 'r11', text: 'te',             gloss: 'you' },
  { r: 'r12', text: 'et',             gloss: 'and' },
  { r: 'r13', text: 'virtus',         gloss: 'power' },
  { r: 'r14', text: 'Altissimi',      gloss: 'of the Most High' },
  { r: 'r15', text: 'obumbrabit',     gloss: 'will overshadow' },
  { r: 'r16', text: 'tibi',           gloss: 'you' },
  { r: 'r17', text: 'Ideoque',        gloss: 'therefore' },
  { r: 'r18', text: 'et',             gloss: 'also' },
  { r: 'r19', text: 'quod',           gloss: 'that which' },
  { r: 'r20', text: 'nascetur ex te', gloss: 'will be born from you' },
  { r: 'r21', text: 'sanctum',        gloss: 'holy' },
  { r: 'r22', text: 'vocabitur',      gloss: 'will be called' },
  { r: 'r23', text: 'Filius',         gloss: 'Son' },
  { r: 'r24', text: 'Dei',            gloss: 'of God' },
]);

// ── Luke 4:19 — "To proclaim the acceptable year of the Lord" ────────────────
// GK: κηρύξαι ἐνιαυτὸν κυρίου δεκτόν (4r)
// VL: prædicare annum Domini acceptum
// Problem: content from Luke 4:18 cascade into this verse
applyVulgate('luke', '4', '19', [
  { r: 'r2', text: 'annum',    gloss: 'year' },
  { r: 'r3', text: 'Domini',   gloss: 'of the Lord' },
  { r: 'r4', text: 'acceptum', gloss: 'acceptable' },
]);

// ── Luke 8:15 — "Those who hear and bear fruit with patience" ─────────────────
// GK: τὸ δὲ ἐν τῇ καλῇ γῇ, οὗτοί εἰσιν οἵτινες ἐν καρδίᾳ καλῇ καὶ ἀγαθῇ
//     ἀκούσαντες τὸν λόγον κατέχουσιν καὶ καρποφοροῦσιν ἐν ὑπομονῇ (22r)
// VL: Quod autem in bonam terram hi sunt qui in corde bono et optimo audientes
//     verbum retinent et fructum afferunt in patientia
// Problem: "patientia" at article row r4 (τῇ), "in" at neuter article r1 (τὸ); cascade
applyVulgate('luke', '8', '15', [
  { r: 'r1',  text: 'Quod',            gloss: 'that' },
  { r: 'r2',  text: 'autem',           gloss: 'but' },
  { r: 'r3',  text: 'in',              gloss: 'in' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'bonam',           gloss: 'good' },
  { r: 'r6',  text: 'terram',          gloss: 'soil' },
  { r: 'r7',  text: 'hi',              gloss: 'these' },
  { r: 'r8',  text: 'sunt',            gloss: 'are' },
  { r: 'r9',  text: 'qui',             gloss: 'who' },
  { r: 'r10', text: 'in',              gloss: 'in' },
  { r: 'r11', text: 'corde',           gloss: 'heart' },
  { r: 'r12', text: 'bono',            gloss: 'good' },
  { r: 'r13', text: 'et',              gloss: 'and' },
  { r: 'r14', text: 'optimo',          gloss: 'excellent' },
  { r: 'r15', text: 'audientes',       gloss: 'hearing' },
  { r: 'r17', text: 'verbum',          gloss: 'word' },
  { r: 'r18', text: 'retinent',        gloss: 'hold fast' },
  { r: 'r19', text: 'et',              gloss: 'and' },
  { r: 'r20', text: 'fructum afferunt', gloss: 'bear fruit' },
  { r: 'r21', text: 'in',              gloss: 'in' },
  { r: 'r22', text: 'patientia',       gloss: 'patience' },
]);

// ── Luke 18:14 — "This man went home justified" ──────────────────────────────
// GK: λέγω ὑμῖν· κατέβη οὗτος δεδικαιωμένος εἰς τὸν οἶκον αὐτοῦ ἢ παρ᾽
//     ἐκεῖνον. ὅτι πᾶς ὁ ὑψῶν ἑαυτὸν ταπεινωθήσεται, ὁ δὲ ταπεινῶν
//     ἑαυτὸν ὑψωθήσεται (23r)
// VL: Dico vobis descendit hic iustificatus in domum suam ab illo quia omnis
//     qui se exaltat humiliabitur et qui se humiliat exaltabitur
// Problem: "exaltabitur" at article row r7 (τὸν); cascade r12-r23
applyVulgate('luke', '18', '14', [
  { r: 'r7',  text: null },
  { r: 'r12', text: null },
  { r: 'r13', text: 'quia',         gloss: 'for' },
  { r: 'r14', text: 'omnis',        gloss: 'everyone' },
  { r: 'r15', text: 'qui',          gloss: 'who' },
  { r: 'r16', text: 'exaltat',      gloss: 'exalts' },
  { r: 'r17', text: 'se',           gloss: 'himself' },
  { r: 'r19', text: 'et',           gloss: 'and' },
  { r: 'r20', text: 'qui',          gloss: 'who' },
  { r: 'r21', text: 'humiliat',     gloss: 'humbles' },
  { r: 'r23', text: 'exaltabitur',  gloss: 'will be exalted' },
]);

// ── Luke 24:46 — "The Christ must suffer and rise on the third day" ─────────
// GK: ... ὅτι οὕτως γέγραπται καὶ οὕτως ἔδει παθεῖν τὸν χριστὸν καὶ ἀναστῆναι
//     ἐκ νεκρῶν τῇ τρίτῃ ἡμέρᾳ (19r)
// VL: ... Quoniam sic scriptum est et sic oportebat Christum pati et resurgere
//     a mortuis tertia die
// Problem: "die" at article row r11 (τὸν); "est" split from "scriptum"; cascade
applyVulgate('luke', '24', '46', [
  { r: 'r6',  text: 'scriptum est', gloss: 'it is written' },
  { r: 'r7',  text: 'et',           gloss: 'and' },
  { r: 'r8',  text: 'sic',          gloss: 'thus' },
  { r: 'r9',  text: 'oportebat',    gloss: 'it was necessary' },
  { r: 'r10', text: 'pati',         gloss: 'to suffer' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'Christum',     gloss: 'Christ' },
  { r: 'r13', text: 'et',           gloss: 'and' },
  { r: 'r14', text: 'resurgere',    gloss: 'to rise' },
  { r: 'r15', text: 'a',            gloss: 'from' },
  { r: 'r16', text: 'mortuis',      gloss: 'the dead' },
  { r: 'r18', text: 'tertia',       gloss: 'third' },
  { r: 'r19', text: 'die',          gloss: 'day' },
]);

// Verify
const verses = [
  ['luke', '1', '32'],
  ['luke', '1', '35'],
  ['luke', '4', '19'],
  ['luke', '8', '15'],
  ['luke', '18', '14'],
  ['luke', '24', '46'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
