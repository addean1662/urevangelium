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

// ── Matt 4:4 — "Man does not live by bread alone" ─────────────────────────────
// GK: ὁ δέ ἀποκριθείς εἶπεν γέγραπται οὐκ ἐπ' ἄρτῳ μόνῳ ζήσεται ὁ ἄνθρωπος
//     ἀλλ' ἐπί παντί ῥήματι ἐκπορευομένῳ διά στόματος θεοῦ (20r)
// VL: Qui respondens dixit Scriptum est Non in solo pane vivit homo sed in omni
//     verbo quod procedit de ore Dei
// Problem: "homo" at article r11 (ὁ); also "respondens/dixit" shift at r2/r3;
//          "Scriptum est" split (r4/r5); "pane/solo" swapped (r8/r9)
applyVulgate('matthew', '4', '4', [
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'respondens',   gloss: 'answering' },
  { r: 'r4',  text: 'dixit',        gloss: 'said' },
  { r: 'r5',  text: 'Scriptum est', gloss: 'it is written' },
  { r: 'r8',  text: 'pane',         gloss: 'bread' },
  { r: 'r9',  text: 'solo',         gloss: 'alone' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'homo',         gloss: 'man' },
  { r: 'r13', text: 'sed',          gloss: 'but' },
  { r: 'r14', text: 'in',           gloss: 'by' },
  { r: 'r15', text: 'omni',         gloss: 'every' },
  { r: 'r16', text: 'verbo',        gloss: 'word' },
  { r: 'r17', text: 'quod procedit', gloss: 'that proceeds' },
]);

// ── Matt 4:6 — Devil tempts: "throw yourself down; angels will carry you" ────
// GK: εἰ υἱός εἶ τοῦ θεοῦ βάλε σεαυτόν κάτω γέγραπται γάρ ὅτι τοῖς ἀγγέλοις
//     αὐτοῦ ἐντελεῖται περί σοῦ καί ἐπί χειρῶν ἀροῦσίν σε μήποτε προσκόψῃς
//     πρός λίθον τόν πόδα σου (32r)
// VL: Si Filius Dei es mitte te deorsum Scriptum est enim Quia angelis suis
//     mandavit de te et in manibus tollent te ne forte offendas ad lapidem pedem tuum
// Problem: "pedem" at article r7 (τοῦ); "tuum" at dative article r15 (τοῖς);
//          double cascade plus "Scriptum est" split
applyVulgate('matthew', '4', '6', [
  { r: 'r6',  text: 'es',            gloss: 'you are' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'Dei',           gloss: 'of God' },
  { r: 'r12', text: 'Scriptum est',  gloss: 'it is written' },
  { r: 'r13', text: 'enim',          gloss: 'for' },
  { r: 'r14', text: 'Quia',          gloss: 'that' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'angelis',       gloss: 'angels' },
  { r: 'r17', text: 'suis',          gloss: 'his' },
  { r: 'r18', text: 'mandavit',      gloss: 'has commanded' },
  { r: 'r19', text: 'de',            gloss: 'concerning' },
  { r: 'r20', text: 'te',            gloss: 'you' },
  { r: 'r21', text: 'et',            gloss: 'and' },
  { r: 'r22', text: 'in',            gloss: 'in' },
  { r: 'r23', text: 'manibus',       gloss: 'their hands' },
  { r: 'r24', text: 'tollent',       gloss: 'will bear' },
  { r: 'r25', text: 'te',            gloss: 'you' },
  { r: 'r26', text: 'ne',            gloss: 'lest' },
  { r: 'r27', text: 'forte offendas', gloss: 'perhaps you strike' },
  { r: 'r28', text: 'ad',            gloss: 'against' },
  { r: 'r29', text: 'lapidem',       gloss: 'a stone' },
  { r: 'r31', text: 'pedem',         gloss: 'foot' },
  { r: 'r32', text: 'tuum',          gloss: 'your' },
]);

// ── Matt 4:7 — "Do not put the Lord your God to the test" ────────────────────
// GK: ἔφη αὐτῷ ὁ Ἰησοῦς πάλιν γέγραπται οὐκ ἐκπειράσεις κύριον τόν θεόν σου (12r)
// VL: Ait illi Jesus Rursum scriptum est Non tentabis Dominum Deum tuum
// Problem: "tuum" at article r3 (ὁ); "scriptum est" split; cascade r6-r12
applyVulgate('matthew', '4', '7', [
  { r: 'r3',  text: null },
  { r: 'r6',  text: 'scriptum est',  gloss: 'it is written' },
  { r: 'r7',  text: 'Non',           gloss: 'not' },
  { r: 'r8',  text: 'tentabis',      gloss: 'you will tempt' },
  { r: 'r9',  text: 'Dominum',       gloss: 'the Lord' },
  { r: 'r11', text: 'Deum',          gloss: 'God' },
  { r: 'r12', text: 'tuum',          gloss: 'your' },
]);

// ── Matt 4:12 — Jesus withdraws to Galilee after John's arrest ───────────────
// GK: Ἀκούσας δέ ὁ Ἰησοῦς ὅτι Ἰωάννης παρεδόθη ἀνεχώρησεν εἰς τήν Γαλιλαίαν (11r)
// VL: Cum autem audisset Jesus quod Joannes traditus esset secessit in Galilæam
// Problem: "audisset" at article r3 (ὁ); "traditus esset" split; cascade r7-r10
applyVulgate('matthew', '4', '12', [
  { r: 'r1',  text: 'Cum audisset',  gloss: 'when he had heard' },
  { r: 'r3',  text: null },
  { r: 'r7',  text: 'traditus esset', gloss: 'had been delivered' },
  { r: 'r8',  text: 'secessit',      gloss: 'he withdrew' },
  { r: 'r9',  text: 'in',            gloss: 'into' },
  { r: 'r10', text: null },
]);

// ── Matt 4:16 — "The people sitting in darkness saw a great light" ────────────
// GK: ὁ λαός ὁ καθήμενος ἐν σκότει φῶς εἶδεν μέγα καί τοῖς καθημένοις ἐν
//     χώρᾳ καί σκιᾷ θανάτου φῶς ἀνέτειλεν αὐτοῖς (20r)
// VL: populus qui sedebat in tenebris vidit lucem magnam et sedentibus in regione
//     umbræ mortis lux orta est eis
// Problem: "eis" at article r1 (ὁ); full 20-row cascade
applyVulgate('matthew', '4', '16', [
  { r: 'r1',  text: null },
  { r: 'r3',  text: 'qui',           gloss: 'who' },
  { r: 'r4',  text: 'sedebat',       gloss: 'was sitting' },
  { r: 'r5',  text: 'in',            gloss: 'in' },
  { r: 'r6',  text: 'tenebris',      gloss: 'darkness' },
  { r: 'r7',  text: 'lucem',         gloss: 'light' },
  { r: 'r8',  text: 'vidit',         gloss: 'saw' },
  { r: 'r9',  text: 'magnam',        gloss: 'great' },
  { r: 'r10', text: 'et',            gloss: 'and' },
  { r: 'r12', text: 'sedentibus',    gloss: 'to those sitting' },
  { r: 'r13', text: 'in',            gloss: 'in' },
  { r: 'r14', text: 'regione',       gloss: 'the region' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'umbræ',         gloss: 'of shadow' },
  { r: 'r17', text: 'mortis',        gloss: 'of death' },
  { r: 'r18', text: 'lux',           gloss: 'light' },
  { r: 'r19', text: 'orta est',      gloss: 'has risen' },
  { r: 'r20', text: 'eis',           gloss: 'on them' },
]);

// ── Matt 4:18 — Jesus calls Simon and Andrew ──────────────────────────────────
// GK: Περιπατῶν δέ ὁ Ἰησοῦς παρά τήν θάλασσαν τῆς Γαλιλαίας εἶδεν δύο ἀδελφούς
//     Σίμωνα τόν λεγόμενον Πέτρον καί Ἀνδρέαν τόν ἀδελφόν αὐτοῦ βάλλοντας
//     ἀμφίβληστρον εἰς τήν θάλασσαν ἦσαν γάρ ἁλιεῖς (29r)
// VL: Ambulans autem Jesus juxta mare Galilæ æ vidit duos fratres Simonem qui
//     vocatur Petrus et Andream fratrem ejus mittentes rete in mare erant enim piscatores
// Problem: "piscatores" at article r3 (ὁ); cascade r15-r29
applyVulgate('matthew', '4', '18', [
  { r: 'r3',  text: null },
  { r: 'r15', text: 'qui vocatur',  gloss: 'who is called' },
  { r: 'r16', text: 'Petrus',       gloss: 'Peter' },
  { r: 'r17', text: 'et',           gloss: 'and' },
  { r: 'r18', text: 'Andream',      gloss: 'Andrew' },
  { r: 'r20', text: 'fratrem',      gloss: 'brother' },
  { r: 'r21', text: 'ejus',         gloss: 'his' },
  { r: 'r22', text: 'mittentes',    gloss: 'casting' },
  { r: 'r23', text: 'rete',         gloss: 'a net' },
  { r: 'r24', text: 'in',           gloss: 'into' },
  { r: 'r26', text: 'mare',         gloss: 'the sea' },
  { r: 'r27', text: 'erant',        gloss: 'they were' },
  { r: 'r28', text: 'enim',         gloss: 'for' },
  { r: 'r29', text: 'piscatores',   gloss: 'fishermen' },
]);

// ── Matt 4:22 — James and John immediately follow Jesus ──────────────────────
// GK: οἱ δέ εὐθέως ἀφέντες τό πλοῖον καί τόν πατέρα αὐτῶν ἠκολούθησαν αὐτῷ (12r)
// VL: Illi autem statim relictis retibus et patre secuti sunt eum
// Problem: "eum" at article r1 (οἱ); full 12-row cascade
applyVulgate('matthew', '4', '22', [
  { r: 'r1',  text: 'Illi',          gloss: 'they' },
  { r: 'r2',  text: 'autem',         gloss: 'but' },
  { r: 'r3',  text: 'statim',        gloss: 'immediately' },
  { r: 'r4',  text: 'relictis',      gloss: 'having left' },
  { r: 'r6',  text: 'retibus',       gloss: 'nets' },
  { r: 'r7',  text: 'et',            gloss: 'and' },
  { r: 'r9',  text: 'patre',         gloss: 'father' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'secuti sunt',   gloss: 'followed' },
  { r: 'r12', text: 'eum',           gloss: 'him' },
]);

// ── Matt 4:24 — Jesus heals all the sick brought to him ──────────────────────
// GK: Καί ἀπῆλθεν ἡ ἀκοή αὐτοῦ εἰς ὅλην τήν Συρίαν καί προσήνεγκαν αὐτῷ
//     πάντας τούς κακῶς ἔχοντας ποικίλαις νόσοις καί βασάνοις συνεχομένους καί
//     δαιμονιζομένους καί σεληνιαζομένους καί παραλυτικούς καί ἐθεράπευσεν αὐτούς (30r)
// VL: Et abiit opinio ejus in totam Syriam et obtulerunt ei omnes male habentes
//     variis languoribus et tormentis comprehensos et qui dæmonia habebant et
//     lunaticos et paralyticos et curavit eos
// Problem: "curavit" at article r3 (ἡ); "eos" at article r8 (τήν); cascade r23-r30
applyVulgate('matthew', '4', '24', [
  { r: 'r3',  text: null },
  { r: 'r8',  text: null },
  { r: 'r23', text: 'qui dæmonia habebant', gloss: 'who were possessed' },
  { r: 'r24', text: 'et',            gloss: 'and' },
  { r: 'r25', text: 'lunaticos',     gloss: 'lunatics' },
  { r: 'r27', text: 'paralyticos',   gloss: 'paralytics' },
  { r: 'r29', text: 'curavit',       gloss: 'he healed' },
  { r: 'r30', text: 'eos',           gloss: 'them' },
]);

// ── Matt 4:25 — Great crowds follow from Galilee and beyond ──────────────────
// GK: καί ἠκολούθησαν αὐτῷ ὄχλοι πολλοί ἀπό τῆς Γαλιλαίας καί Δεκαπόλεως καί
//     Ἱεροσολύμων καί Ἰουδαίας καί πέραν τοῦ Ἰορδάνου (18r)
// VL: et secutæ sunt eum turbæ multæ de Galilæa et Decapoli et Jerosolymis et
//     Judæa et de trans Jordanem
// Problem: "et" at genitive article r17 (τοῦ); cascade r2-r18
applyVulgate('matthew', '4', '25', [
  { r: 'r2',  text: 'secutæ sunt',  gloss: 'followed' },
  { r: 'r3',  text: 'eum',          gloss: 'him' },
  { r: 'r4',  text: 'turbæ',        gloss: 'crowds' },
  { r: 'r5',  text: 'multæ',        gloss: 'many' },
  { r: 'r6',  text: 'de',           gloss: 'from' },
  { r: 'r7',  text: null },
  { r: 'r12', text: 'Jerosolymis',  gloss: 'Jerusalem' },
  { r: 'r13', text: 'et',           gloss: 'and' },
  { r: 'r14', text: 'Judæa',        gloss: 'Judea' },
  { r: 'r15', text: 'et',           gloss: 'and' },
  { r: 'r16', text: 'de trans',     gloss: 'from beyond' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'Jordanem',     gloss: 'Jordan' },
]);

// Verify
const verses = [
  ['matthew', '4', '4'],  ['matthew', '4', '6'],  ['matthew', '4', '7'],
  ['matthew', '4', '12'], ['matthew', '4', '16'], ['matthew', '4', '18'],
  ['matthew', '4', '22'], ['matthew', '4', '24'], ['matthew', '4', '25'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
