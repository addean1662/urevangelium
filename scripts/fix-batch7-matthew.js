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

// ── Matt 13:22 — "Thorny-ground: cares of age choke the word" ─────────────────
// GK: ὁ δὲ εἰς τὰς ἀκάνθας σπαρείς, οὗτός ἐστιν ὁ τὸν λόγον ἀκούων, καὶ ἡ
//     μέριμνα τοῦ αἰῶνος τούτου καὶ ἡ ἀπάτη τοῦ πλούτου συμπνίγει τὸν λόγον,
//     καὶ ἄκαρπος γίνεται (29r)
// VL: Qui autem in spinis seminatus est, hic est qui verbum audit et sollicitudo
//     sæculi istius et fallacia divitiarum suffocat verbum et sine fructu efficitur
// Problem: "et" at article r1 (ὁ); "sine" at article r4 (τάς); "fructu" at article r9 (ὁ);
//          triple displacement cascade through r29
applyVulgate('matthew', '13', '22', [
  { r: 'r1',  text: 'Qui',           gloss: 'who' },
  { r: 'r2',  text: 'autem',         gloss: 'but' },
  { r: 'r3',  text: 'in',            gloss: 'among' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'spinis',        gloss: 'thorns' },
  { r: 'r6',  text: 'seminatus est', gloss: 'was sown' },
  { r: 'r7',  text: 'hic',           gloss: 'this one' },
  { r: 'r8',  text: 'est',           gloss: 'is' },
  { r: 'r9',  text: 'qui',           gloss: 'who' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'verbum',        gloss: 'word' },
  { r: 'r12', text: 'audit',         gloss: 'hears' },
  { r: 'r13', text: 'et',            gloss: 'and' },
  { r: 'r15', text: 'sollicitudo',   gloss: 'anxiety' },
  { r: 'r17', text: 'sæculi',        gloss: 'of the age' },
  { r: 'r18', text: 'istius',        gloss: 'of this' },
  { r: 'r19', text: 'et',            gloss: 'and' },
  { r: 'r21', text: 'fallacia',      gloss: 'deceitfulness' },
  { r: 'r23', text: 'divitiarum',    gloss: 'of riches' },
  { r: 'r24', text: 'suffocat',      gloss: 'chokes' },
  { r: 'r26', text: 'verbum',        gloss: 'word' },
  { r: 'r27', text: 'et',            gloss: 'and' },
  { r: 'r28', text: 'sine fructu',   gloss: 'without fruit' },
  { r: 'r29', text: 'efficitur',     gloss: 'becomes' },
]);

// ── Matt 13:24 — "Wheat and tares parable" ────────────────────────────────────
// GK: ὡμοιώθη ἡ βασιλεία τῶν οὐρανῶν ἀνθρώπῳ σπείραντι καλὸν σπέρμα ἐν τῷ
//     ἀγρῷ αὐτοῦ (18r)
// VL: Simile factum est regnum cælorum homini qui seminavit bonum semen in agro suo
// Problem: "factum est" split across article r7 and βασιλεία r8; "qui seminavit" split;
//          cascade r6-r15
applyVulgate('matthew', '13', '24', [
  { r: 'r6',  text: 'Simile factum est', gloss: 'was made like' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'regnum',            gloss: 'kingdom' },
  { r: 'r9',  text: null },
  { r: 'r12', text: 'qui seminavit',     gloss: 'who sowed' },
  { r: 'r13', text: 'bonum',             gloss: 'good' },
  { r: 'r14', text: 'semen',             gloss: 'seed' },
  { r: 'r15', text: 'in',               gloss: 'in' },
]);

// ── Matt 13:32 — "Mustard seed becomes greatest tree" ─────────────────────────
// GK: ὃ μικρότερον μέν ἐστιν πάντων τῶν σπερμάτων, ὅταν δὲ αὐξηθῇ, μεῖζον
//     τῶν λαχάνων ἐστὶν καὶ γίνεται δένδρον, ὥστε ἐλθεῖν τὰ πετεινὰ τοῦ
//     οὐρανοῦ καὶ κατασκηνοῦν ἐν τοῖς κλάδοις αὐτοῦ (29r)
// VL: quod minimum quidem est omnibus seminibus cum autem creverit majus est
//     omnibus oleribus et fit arbor ita ut volucres cæli veniant et habitent
//     in ramis ejus
// Problem: "ramis" at genitive article r6 (τῶν); "ejus" at genitive article r12 (τῶν);
//          double cascade through r29
applyVulgate('matthew', '13', '32', [
  { r: 'r6',  text: null },
  { r: 'r12', text: null },
  { r: 'r13', text: 'oleribus',  gloss: 'garden plants' },
  { r: 'r14', text: 'est',       gloss: 'is' },
  { r: 'r15', text: 'et',        gloss: 'and' },
  { r: 'r16', text: 'fit',       gloss: 'becomes' },
  { r: 'r17', text: 'arbor',     gloss: 'tree' },
  { r: 'r18', text: 'ita ut',    gloss: 'so that' },
  { r: 'r19', text: 'veniant',   gloss: 'may come' },
  { r: 'r21', text: 'volucres',  gloss: 'birds' },
  { r: 'r23', text: 'cæli',      gloss: 'of heaven' },
  { r: 'r24', text: 'et',        gloss: 'and' },
  { r: 'r25', text: 'habitent',  gloss: 'may dwell' },
  { r: 'r26', text: 'in',        gloss: 'in' },
  { r: 'r28', text: 'ramis',     gloss: 'branches' },
  { r: 'r29', text: 'ejus',      gloss: 'its' },
]);

// ── Matt 13:33 — "Leaven hidden in flour" ─────────────────────────────────────
// GK: ὁμοία ἐστὶν ἡ βασιλεία τῶν οὐρανῶν ζύμῃ, ἣν λαβοῦσα γυνὴ ἐνέκρυψεν
//     εἰς ἀλεύρου σάτα τρία ἕως οὗ ἐζυμώθη ὅλον (23r)
// VL: Simile est regnum cælorum fermento quod acceptum mulier abscondit in
//     farinæ satis tribus donec fermentatum est totum
// Problem: "locutus est" split (r3/r4) and "totum" at article r7 (ἡ); double cascade
applyVulgate('matthew', '13', '33', [
  { r: 'r3',  text: 'locutus est', gloss: 'spoke' },
  { r: 'r4',  text: 'eis',         gloss: 'to them' },
  { r: 'r5',  text: 'Simile',      gloss: 'like' },
  { r: 'r6',  text: 'est',         gloss: 'is' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'regnum',      gloss: 'kingdom' },
  { r: 'r10', text: 'cælorum',     gloss: 'of heavens' },
  { r: 'r11', text: 'fermento',    gloss: 'leaven' },
  { r: 'r12', text: 'quod',        gloss: 'which' },
  { r: 'r13', text: 'acceptum',    gloss: 'having taken' },
  { r: 'r14', text: 'mulier',      gloss: 'woman' },
  { r: 'r15', text: 'abscondit',   gloss: 'hid' },
  { r: 'r16', text: 'in',          gloss: 'in' },
  { r: 'r17', text: 'farinæ',      gloss: 'of flour' },
  { r: 'r18', text: 'satis',       gloss: 'measures' },
  { r: 'r19', text: 'tribus',      gloss: 'three' },
  { r: 'r20', text: 'donec',       gloss: 'until' },
  { r: 'r21', text: null },
  { r: 'r22', text: 'fermentatum est', gloss: 'was leavened' },
  { r: 'r23', text: 'totum',       gloss: 'all' },
]);

// ── Matt 14:8 — Salome asks for John's head ───────────────────────────────────
// GK: ἡ δὲ προβιβασθεῖσα ὑπὸ τῆς μητρὸς αὐτῆς· δός μοι φησὶν ὧδε ἐπὶ πίνακι
//     τὴν κεφαλὴν Ἰωάννου τοῦ βαπτιστοῦ (18r)
// VL: At illa præmonita a matre sua Da mihi inquit hic in disco caput Joannis Baptistæ
// Problem: "Baptistæ" at article r1 (ἡ); cascade r7-r18
applyVulgate('matthew', '14', '8', [
  { r: 'r1',  text: null },
  { r: 'r7',  text: 'sua',       gloss: 'her' },
  { r: 'r8',  text: 'Da',        gloss: 'give' },
  { r: 'r9',  text: 'mihi',      gloss: 'me' },
  { r: 'r10', text: 'inquit',    gloss: 'she said' },
  { r: 'r11', text: 'hic',       gloss: 'here' },
  { r: 'r12', text: 'in',        gloss: 'on' },
  { r: 'r13', text: 'disco',     gloss: 'a platter' },
  { r: 'r15', text: 'caput',     gloss: 'head' },
  { r: 'r16', text: 'Joannis',   gloss: 'of John' },
  { r: 'r18', text: 'Baptistæ', gloss: 'the Baptist' },
]);

// ── Matt 14:11 — John's head brought on a platter ────────────────────────────
// GK: καὶ ἠνέχθη ἡ κεφαλὴ αὐτοῦ ἐπὶ πίνακι καὶ ἐδόθη τῷ κορασίῳ, καὶ ἤνεγκεν
//     τῇ μητρὶ αὐτῆς (16r)
// VL: Et allatum est caput ejus in disco et datum est puellæ et attulit matri suæ
// Problem: "matri" at article r3 (ἡ); "suæ" at dative article r10 (τῷ); cascade r2-r16
applyVulgate('matthew', '14', '11', [
  { r: 'r2',  text: 'allatum est', gloss: 'was brought' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'caput',       gloss: 'head' },
  { r: 'r5',  text: 'ejus',        gloss: 'his' },
  { r: 'r6',  text: 'in',          gloss: 'on' },
  { r: 'r7',  text: 'disco',       gloss: 'a platter' },
  { r: 'r8',  text: 'et',          gloss: 'and' },
  { r: 'r9',  text: 'datum est',   gloss: 'was given' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'puellæ',      gloss: 'to the girl' },
  { r: 'r12', text: 'et',          gloss: 'and' },
  { r: 'r13', text: 'attulit',     gloss: 'she brought it' },
  { r: 'r15', text: 'matri',       gloss: 'to her mother' },
  { r: 'r16', text: 'suæ',         gloss: 'her' },
]);

// Verify
const verses = [
  ['matthew', '13', '22'],
  ['matthew', '13', '24'],
  ['matthew', '13', '32'],
  ['matthew', '13', '33'],
  ['matthew', '14', '8'],
  ['matthew', '14', '11'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
