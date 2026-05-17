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

// ── Matt 15:1 — "ad" at τῷ r3; "ad eum" bundled at Ἰησοῦ r4 ────────────────
applyVulgate('matthew', '15', '1', [
  { r: 'r3', text: null },
  { r: 'r4', text: 'ad eum', gloss: 'to him' },
]);

// ── Matt 15:3 — "Nam Deus dixit" from v.4 bled into v.3 article rows ─────────
// GK: Ὁ δὲ ἀποκριθεὶς εἶπεν αὐτοῖς· διὰ τί καὶ ὑμεῖς παραβαίνετε τὴν
//     ἐντολὴν τοῦ θεοῦ διὰ τὴν παράδοσιν ὑμῶν (18r)
// VL: Ipse autem respondens ait eis Quare et vos transgredimini mandatum Dei
//     propter traditionem vestram
// Problem: "Nam" at Ὁ r1 (pronominal→"Ipse"); "Deus" at τήν r11; "dixit" at τοῦ r13
applyVulgate('matthew', '15', '3', [
  { r: 'r1',  text: 'Ipse',       gloss: 'he himself' },
  { r: 'r2',  text: 'autem',      gloss: 'then' },
  { r: 'r3',  text: 'respondens', gloss: 'answering' },
  { r: 'r4',  text: 'ait',        gloss: 'said' },
  { r: 'r5',  text: 'eis',        gloss: 'to them' },
  { r: 'r6',  text: null },
  { r: 'r11', text: null },
  { r: 'r13', text: null },
]);

// ── Matt 15:4 — "Nam Deus dixit" missing from r2-r4; full cascade r2-r18 ──────
// GK: ὁ γὰρ θεὸς εἶπεν λέγων· τίμα τὸν πατέρα σοῦ καὶ τὴν μητέρα, καὶ
//     ὁ κακολογῶν πατέρα ἢ μητέρα θανάτῳ τελευτάτω (20r)
// VL: Nam Deus dixit Honora patrem tuum et matrem tuam et qui maledixerit
//     patri vel matri morte moriatur
applyVulgate('matthew', '15', '4', [
  { r: 'r2',  text: 'Nam',              gloss: 'for' },
  { r: 'r3',  text: 'Deus',             gloss: 'God' },
  { r: 'r4',  text: 'dixit',            gloss: 'said' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Honora',           gloss: 'honor' },
  { r: 'r8',  text: 'patrem',           gloss: 'father' },
  { r: 'r9',  text: 'tuum',             gloss: 'your' },
  { r: 'r10', text: 'et',               gloss: 'and' },
  { r: 'r12', text: 'matrem tuam',      gloss: 'your mother' },
  { r: 'r13', text: 'et',               gloss: 'and' },
  { r: 'r15', text: 'qui maledixerit',  gloss: 'whoever curses' },
  { r: 'r16', text: 'patri',            gloss: 'father' },
  { r: 'r17', text: 'vel',              gloss: 'or' },
  { r: 'r18', text: 'matri',            gloss: 'mother' },
]);

// ── Matt 15:5 — "dixerit" at ἄν r5; cascade r5-r17 ──────────────────────────
// GK: ὑμεῖς δὲ λέγετε· ὃς ἂν εἴπῃ τῷ πατρὶ ἢ τῇ μητρί· δῶρον ὃ ἐὰν
//     ἐξ ἐμοῦ ὠφεληθῇς (17r)
// VL: Vos autem dicitis Quicumque dixerit patri vel matri Munus quodcumque
//     ex me tibi proderit
applyVulgate('matthew', '15', '5', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'dixerit',      gloss: 'shall have said' },
  { r: 'r8',  text: 'patri',        gloss: 'to father' },
  { r: 'r9',  text: 'vel',          gloss: 'or' },
  { r: 'r11', text: 'matri',        gloss: 'to mother' },
  { r: 'r12', text: 'Munus',        gloss: 'gift' },
  { r: 'r13', text: 'quodcumque',   gloss: 'whatever' },
  { r: 'r14', text: 'ex',           gloss: 'from' },
  { r: 'r15', text: 'me',           gloss: 'me' },
  { r: 'r16', text: 'tibi',         gloss: 'to you' },
  { r: 'r17', text: 'proderit',     gloss: 'will profit' },
]);

// ── Matt 15:6 — v.5 content ("non honorificabit") bled into v.6 rows ─────────
// GK: καὶ ἠκυρώσατε τὸν λόγον τοῦ θεοῦ διὰ τὴν παράδοσιν ὑμῶν (10r)
// VL: et irritum fecistis mandatum Dei propter traditionem vestram
applyVulgate('matthew', '15', '6', [
  { r: 'r2',  text: 'irritum fecistis', gloss: 'made void' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'mandatum',         gloss: 'commandment' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Dei',              gloss: 'of God' },
  { r: 'r7',  text: 'propter',          gloss: 'on account of' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'traditionem',      gloss: 'tradition' },
  { r: 'r10', text: 'vestram',          gloss: 'your' },
]);

// ── Matt 15:10 — "ad" at τόν r3; cascade r3-r9 ───────────────────────────────
// GK: Καὶ προσκαλεσάμενος τὸν ὄχλον εἶπεν αὐτοῖς· ἀκούετε καὶ συνίετε (9r)
// VL: Et convocatis ad se turbis dixit eis Audite et intelligite
applyVulgate('matthew', '15', '10', [
  { r: 'r2',  text: 'convocatis ad se', gloss: 'having called to himself' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'turbis',           gloss: 'the crowds' },
  { r: 'r5',  text: 'dixit',            gloss: 'said' },
  { r: 'r6',  text: 'eis',              gloss: 'to them' },
  { r: 'r7',  text: 'Audite',           gloss: 'hear' },
  { r: 'r8',  text: 'et',               gloss: 'and' },
  { r: 'r9',  text: 'intelligite',      gloss: 'understand' },
]);

// ── Matt 15:11 — "coinquinat" at τό r2; cascade r2-r19 ───────────────────────
// GK: οὐ τὸ εἰσερχόμενον εἰς τὸ στόμα κοινοῖ τὸν ἄνθρωπον, ἀλλὰ τὸ
//     ἐκπορευόμενον ἐκ τοῦ στόματος, τοῦτο κοινοῖ τὸν ἄνθρωπον (19r)
// VL: Non quod intrat in os coinquinat hominem sed quod procedit ex ore hoc
//     coinquinat hominem
applyVulgate('matthew', '15', '11', [
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'quod intrat',   gloss: 'that which enters' },
  { r: 'r4',  text: 'in',            gloss: 'into' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'os',            gloss: 'the mouth' },
  { r: 'r7',  text: 'coinquinat',    gloss: 'defiles' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'hominem',       gloss: 'a man' },
  { r: 'r10', text: 'sed',           gloss: 'but' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'quod procedit', gloss: 'that which comes out' },
  { r: 'r13', text: 'ex',            gloss: 'out of' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'ore',           gloss: 'the mouth' },
  { r: 'r16', text: 'hoc',           gloss: 'this' },
  { r: 'r17', text: 'coinquinat',    gloss: 'defiles' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'hominem',       gloss: 'a man' },
]);

// ── Matt 15:13 — "eradicabitur" at Ὁ r1; cascade r1-r15 ─────────────────────
// GK: Ὁ δὲ ἀποκριθεὶς εἶπεν· πᾶσα φυτεία ἣν οὐκ ἐφύτευσεν ὁ πατήρ μου
//     ὁ οὐράνιος ἐκριζωθήσεται (15r)
// VL: At ille respondens ait Omnis plantatio quam non plantavit Pater meus
//     cælestis eradicabitur
applyVulgate('matthew', '15', '13', [
  { r: 'r1',  text: 'At',           gloss: 'but' },
  { r: 'r2',  text: 'ille',         gloss: 'he' },
  { r: 'r3',  text: 'respondens',   gloss: 'answering' },
  { r: 'r4',  text: 'ait',          gloss: 'said' },
  { r: 'r5',  text: 'Omnis',        gloss: 'every' },
  { r: 'r6',  text: 'plantatio',    gloss: 'plant' },
  { r: 'r7',  text: 'quam',         gloss: 'which' },
  { r: 'r8',  text: 'non',          gloss: 'not' },
  { r: 'r9',  text: 'plantavit',    gloss: 'has planted' },
  { r: 'r11', text: 'Pater',        gloss: 'Father' },
  { r: 'r12', text: 'meus',         gloss: 'my' },
  { r: 'r14', text: 'cælestis',     gloss: 'heavenly' },
  { r: 'r15', text: 'eradicabitur', gloss: 'will be uprooted' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '15', '1'],
  ['matthew', '15', '3'],
  ['matthew', '15', '4'],
  ['matthew', '15', '5'],
  ['matthew', '15', '6'],
  ['matthew', '15', '10'],
  ['matthew', '15', '11'],
  ['matthew', '15', '13'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
