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

// ── Matt 14:27 — "Take courage, it is I; do not be afraid" ──────────────────
// GK: εὐθὺς δὲ ἐλάλησεν ὁ Ἰησοῦς αὐτοῖς λέγων· θαρσεῖτε· ἐγώ εἰμι, μὴ
//     φοβεῖσθε (12r)
// VL: Statimque Jesus locutus est eis dicens Habete fiduciam ego sum nolite timere
// Problem: "locutus est" split — "est" at article r4 (ὁ); cascade r2-r8
applyVulgate('matthew', '14', '27', [
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'locutus est',      gloss: 'spoke' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Jesus',            gloss: 'Jesus' },
  { r: 'r6',  text: 'eis',              gloss: 'to them' },
  { r: 'r7',  text: 'dicens',           gloss: 'saying' },
  { r: 'r8',  text: 'Habete fiduciam', gloss: 'take courage' },
]);

// ── Matt 14:29 — Peter walks on water ────────────────────────────────────────
// GK: ὁ δὲ εἶπεν· ἐλθέ. καὶ καταβὰς ἀπὸ τοῦ πλοίου ὁ Πέτρος περιεπάτησεν
//     ἐπὶ τὰ ὕδατα καὶ ἦλθεν πρὸς τὸν Ἰησοῦν (20r)
// VL: At ipse ait Veni Et descendens Petrus de navicula ambulabat super aquam
//     ut veniret ad Jesum
// Problem: "Jesum" at article r1 (ὁ); cascade r3-r20
applyVulgate('matthew', '14', '29', [
  { r: 'r1',  text: 'ipse',      gloss: 'he himself' },
  { r: 'r3',  text: 'ait',       gloss: 'said' },
  { r: 'r4',  text: 'Veni',      gloss: 'come' },
  { r: 'r5',  text: 'Et',        gloss: 'and' },
  { r: 'r6',  text: 'descendens', gloss: 'descending' },
  { r: 'r7',  text: 'de',        gloss: 'from' },
  { r: 'r9',  text: 'navicula',  gloss: 'the boat' },
  { r: 'r11', text: 'Petrus',    gloss: 'Peter' },
  { r: 'r12', text: 'ambulabat', gloss: 'walked' },
  { r: 'r13', text: 'super',     gloss: 'upon' },
  { r: 'r15', text: 'aquam',     gloss: 'water' },
  { r: 'r16', text: 'ut',        gloss: 'so that' },
  { r: 'r17', text: 'veniret',   gloss: 'he might come' },
  { r: 'r18', text: 'ad',        gloss: 'to' },
  { r: 'r20', text: 'Jesum',     gloss: 'Jesus' },
]);

// ── Matt 14:33 — "Truly you are the Son of God" ───────────────────────────────
// GK: οἱ δὲ ἐν τῷ πλοίῳ ἐλθόντες προσεκύνησαν αὐτῷ λέγοντες· ἀληθῶς θεοῦ
//     υἱὸς εἶ (13r)
// VL: Qui autem in navicula erant venerunt et adoraverunt eum dicentes Vere
//     Filius Dei es
// Problem: "navicula" at dative article r4 (τῷ); cascade r5-r13
applyVulgate('matthew', '14', '33', [
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'navicula erant', gloss: 'were in the boat' },
  { r: 'r6',  text: 'venerunt',       gloss: 'came' },
  { r: 'r7',  text: 'et adoraverunt', gloss: 'and worshipped' },
  { r: 'r8',  text: 'eum',            gloss: 'him' },
  { r: 'r9',  text: 'dicentes',       gloss: 'saying' },
  { r: 'r10', text: 'Vere',           gloss: 'truly' },
  { r: 'r11', text: 'Dei',            gloss: 'of God' },
  { r: 'r12', text: 'Filius',         gloss: 'Son' },
  { r: 'r13', text: 'es',             gloss: 'you are' },
]);

// ── Matt 14:35 — All brought to him who were sick ────────────────────────────
// GK: καὶ ἐπιγνόντες αὐτὸν οἱ ἄνδρες τοῦ τόπου ἐκείνου ἀπέστειλαν εἰς ὅλην
//     τὴν περίχωρον ἐκείνην καὶ προσήνεγκαν αὐτῷ πάντας τοὺς κακῶς ἔχοντας (21r)
// VL: Et cum cognovissent eum viri loci illius miserunt in universam regionem
//     illam et obtulerunt ei omnes male habentes
// Problem: "habentes" at article r4 (οἱ); cascade r2-r21
applyVulgate('matthew', '14', '35', [
  { r: 'r2',  text: 'cum cognovissent', gloss: 'when they recognized' },
  { r: 'r3',  text: 'eum',              gloss: 'him' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'viri',             gloss: 'men' },
  { r: 'r7',  text: 'loci',             gloss: 'of the place' },
  { r: 'r8',  text: 'illius',           gloss: 'of that' },
  { r: 'r9',  text: 'miserunt',         gloss: 'sent' },
  { r: 'r10', text: 'in',               gloss: 'into' },
  { r: 'r11', text: 'universam',        gloss: 'all' },
  { r: 'r13', text: 'regionem',         gloss: 'region' },
  { r: 'r14', text: 'illam',            gloss: 'that' },
  { r: 'r15', text: 'et',               gloss: 'and' },
  { r: 'r16', text: 'obtulerunt',       gloss: 'brought' },
  { r: 'r17', text: 'ei',               gloss: 'to him' },
  { r: 'r18', text: 'omnes',            gloss: 'all' },
  { r: 'r20', text: 'male',             gloss: 'badly' },
  { r: 'r21', text: 'habentes',         gloss: 'afflicted' },
]);

// ── Matt 14:36 — Touch the fringe of his garment ─────────────────────────────
// GK: καὶ παρεκάλουν αὐτὸν ἵνα μόνον ἅψωνται τοῦ κρασπέδου τοῦ ἱματίου αὐτοῦ·
//     καὶ ὅσοι ἥψαντο διεσώθησαν (15r)
// VL: et rogabant eum ut vel tangerent fimbriam vestimenti ejus Et quicumque
//     tetigerunt salvi facti sunt
// Problem: "vestimenti" at genitive article r7 (τοῦ); "tangerent" at genitive article
//          r9 (τοῦ); double cascade r6-r15
applyVulgate('matthew', '14', '36', [
  { r: 'r6',  text: 'tangerent',       gloss: 'might touch' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'fimbriam',        gloss: 'fringe' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'vestimenti',      gloss: 'of garment' },
  { r: 'r11', text: 'ejus',            gloss: 'his' },
  { r: 'r12', text: 'Et',              gloss: 'and' },
  { r: 'r13', text: 'quicumque',       gloss: 'as many as' },
  { r: 'r14', text: 'tetigerunt',      gloss: 'touched' },
  { r: 'r15', text: 'salvi facti sunt', gloss: 'were made well' },
]);

// ── Matt 15:1 — Pharisees and scribes challenge Jesus ────────────────────────
// GK: Τότε προσέρχονται τῷ Ἰησοῦ οἱ ἀπὸ Ἱεροσολύμων Φαρισαῖοι καὶ γραμματεῖς
//     λέγοντες (11r)
// VL: Tunc accesserunt ad eum ab Jerosolymis scribæ et pharisæi dicentes
// Problem: "dicentes" at dative article r3 (τῷ); cascade r4-r11
applyVulgate('matthew', '15', '1', [
  { r: 'r3',  text: 'ad',          gloss: 'to' },
  { r: 'r4',  text: 'eum',         gloss: 'him' },
  { r: 'r6',  text: 'ab',          gloss: 'from' },
  { r: 'r7',  text: 'Jerosolymis', gloss: 'Jerusalem' },
  { r: 'r8',  text: 'pharisæi',   gloss: 'Pharisees' },
  { r: 'r9',  text: 'et',          gloss: 'and' },
  { r: 'r10', text: 'scribæ',      gloss: 'scribes' },
  { r: 'r11', text: 'dicentes',    gloss: 'saying' },
]);

// ── Matt 15:12 — Disciples warn Jesus about Pharisees ────────────────────────
// GK: οἱ μαθηταὶ αὐτοῦ λέγουσιν αὐτῷ· οἶδας ὅτι οἱ Φαρισαῖοι ἀκούσαντες
//     τὸν λόγον ἐσκανδαλίσθησαν (15r)
// VL: discipuli ejus dixerunt ei Scis quia pharisæi audito verbo hoc scandalizati sunt
// Problem: "scandalizati" at article r3 (οἱ); "sunt" at article r10 (οἱ); cascade r14-r15
applyVulgate('matthew', '15', '12', [
  { r: 'r3',  text: null },
  { r: 'r10', text: null },
  { r: 'r14', text: 'verbo hoc',       gloss: 'this word' },
  { r: 'r15', text: 'scandalizati sunt', gloss: 'were offended' },
]);

// Verify
const verses = [
  ['matthew', '14', '27'],
  ['matthew', '14', '29'],
  ['matthew', '14', '33'],
  ['matthew', '14', '35'],
  ['matthew', '14', '36'],
  ['matthew', '15', '1'],
  ['matthew', '15', '12'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
