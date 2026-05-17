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

// ── Matt 10:3 — apostle list bleeding from verse 2 ──────────────────────────
// GK: Φίλιππος καὶ Βαρθολομαῖος· Θωμᾶς καὶ Μαθθαῖος ὁ τελώνης· Ἰάκωβος
//     ὁ τοῦ Ἁλφαίου, καὶ Λεββαῖος ὁ ἐπικληθεὶς Θαδδαῖος (17r)
// VL: Philippus et Bartholomæus Thomas et Matthæus publicanus Jacobus Alphæi
//     et Thaddæus
// Problem: VL text from v.2 ("Jacobus Zebedæi et Joannes frater ejus") bled
//          into r1-r6; "Philippus" displaced to article r7; cascade r1-r17
applyVulgate('matthew', '10', '3', [
  { r: 'r1',  text: 'Philippus',    gloss: 'Philip' },
  { r: 'r2',  text: 'et',           gloss: 'and' },
  { r: 'r3',  text: 'Bartholomæus', gloss: 'Bartholomew' },
  { r: 'r4',  text: 'Thomas',       gloss: 'Thomas' },
  { r: 'r5',  text: 'et',           gloss: 'and' },
  { r: 'r6',  text: 'Matthæus',     gloss: 'Matthew' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'publicanus',   gloss: 'tax collector' },
  { r: 'r9',  text: 'Jacobus',      gloss: 'James' },
  { r: 'r10', text: null },
  { r: 'r11', text: null },
  { r: 'r12', text: 'Alphæi',       gloss: 'of Alphaeus' },
  { r: 'r13', text: 'et',           gloss: 'and' },
  { r: 'r14', text: null },
  { r: 'r15', text: null },
  { r: 'r16', text: null },
  { r: 'r17', text: 'Thaddæus',     gloss: 'Thaddaeus' },
]);

// ── Matt 10:20 — not you who speak but the Spirit ───────────────────────────
// GK: οὐ γὰρ ὑμεῖς ἐστε οἱ λαλοῦντες ἀλλὰ τὸ πνεῦμα τοῦ πατρὸς ὑμῶν
//     τὸ λαλοῦν ἐν ὑμῖν (16r)
// VL: non enim vos estis qui loquimini sed Spiritus Patris vestri qui loquitur
//     in vobis
// Problem: "in" placed at article οἱ r5; cascade r5-r16
applyVulgate('matthew', '10', '20', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'qui loquimini', gloss: 'who speak' },
  { r: 'r7',  text: 'sed',           gloss: 'but' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'Spiritus',      gloss: 'Spirit' },
  { r: 'r11', text: 'Patris',        gloss: 'Father' },
  { r: 'r12', text: 'vestri',        gloss: 'your' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'qui loquitur',  gloss: 'who speaks' },
  { r: 'r15', text: 'in',            gloss: 'in' },
  { r: 'r16', text: 'vobis',         gloss: 'you' },
]);

// ── Matt 10:23 — flee to another city ──────────────────────────────────────
// GK: Ὅταν δὲ διώκωσιν ὑμᾶς ἐν τῇ πόλει ταύτῃ, φεύγετε εἰς τὴν ἑτέραν·
//     ἀμὴν γὰρ λέγω ὑμῖν· οὐ μὴ τελέσητε τὰς πόλεις τοῦ Ἰσραὴλ ἕως ἂν
//     ἔλθῃ ὁ υἱὸς τοῦ ἀνθρώπου (30r)
// VL: Cum autem persequentur vos in civitate ista fugite in aliam Amen dico
//     vobis non consummabitis civitates Israël donec veniat Filius hominis
// Problem: ἐν r5 left empty; VL words slid 1 row late from r7; cascade r5-r18
applyVulgate('matthew', '10', '23', [
  { r: 'r5',  text: 'in',            gloss: 'in' },
  { r: 'r7',  text: 'civitate',      gloss: 'city' },
  { r: 'r8',  text: 'ista',          gloss: 'this' },
  { r: 'r9',  text: 'fugite',        gloss: 'flee' },
  { r: 'r10', text: 'in',            gloss: 'into' },
  { r: 'r12', text: 'aliam',         gloss: 'another' },
  { r: 'r13', text: 'Amen',          gloss: 'amen' },
  { r: 'r15', text: 'dico',          gloss: 'I say' },
  { r: 'r16', text: 'vobis',         gloss: 'to you' },
  { r: 'r17', text: 'non',           gloss: 'not' },
  { r: 'r18', text: null },
]);

// ── Matt 10:33 — whoever denies me before men ───────────────────────────────
// GK: ὅστις δ᾽ ἂν ἀρνήσηταί με ἔμπροσθεν τῶν ἀνθρώπων, ἀρνήσομαι κἀγὼ
//     αὐτὸν ἔμπροσθεν τοῦ πατρός μου τοῦ ἐν τοῖς οὐρανοῖς (19r)
// VL: Qui autem negaverit me coram hominibus negabo et ego eum coram Patre
//     meo qui est in caelis
// Problem: "negaverit" at ἄν r3 (modal particle); "cælis" at τῶν r7;
//          "est" at τοῦ r13; cascade r3-r19
applyVulgate('matthew', '10', '33', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'negaverit',   gloss: 'has denied' },
  { r: 'r5',  text: 'me',          gloss: 'me' },
  { r: 'r6',  text: 'coram',       gloss: 'before' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'hominibus',   gloss: 'men' },
  { r: 'r9',  text: 'negabo',      gloss: 'I will deny' },
  { r: 'r10', text: 'et ego',      gloss: 'and I' },
  { r: 'r12', text: 'coram',       gloss: 'before' },
  { r: 'r13', text: null },
  { r: 'r16', text: 'qui est',     gloss: 'who is' },
  { r: 'r17', text: 'in',          gloss: 'in' },
  { r: 'r19', text: 'cælis',       gloss: 'the heavens' },
]);

// ── Matt 10:42 — cup of cold water ─────────────────────────────────────────
// GK: καὶ ὃς ἂν ποτίσῃ ἕνα τῶν μικρῶν τούτων ποτήριον ψυχροῦ μόνον εἰς
//     ὄνομα μαθητοῦ, ἀμὴν λέγω ὑμῖν· οὐ μὴ ἀπολέσῃ τὸν μισθὸν αὐτοῦ (23r)
// VL: Et quicumque potum dederit uni ex minimis istis calicem aquæ frigidæ
//     tantum in nomine discipuli amen dico vobis non perdet mercedem suam
// Problem: "suam" at τῶν r6 (genitive article); ἄν r3 picked up "potum";
//          cascade r3-r23
applyVulgate('matthew', '10', '42', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'potum dederit', gloss: 'has given to drink' },
  { r: 'r5',  text: 'uni',           gloss: 'one' },
  { r: 'r6',  text: 'ex',            gloss: 'of' },
  { r: 'r7',  text: 'minimis',       gloss: 'the least' },
  { r: 'r8',  text: 'istis',         gloss: 'these' },
  { r: 'r9',  text: 'calicem',       gloss: 'cup' },
  { r: 'r10', text: 'aquæ frigidæ',  gloss: 'of cold water' },
  { r: 'r11', text: 'tantum',        gloss: 'only' },
  { r: 'r12', text: 'in',            gloss: 'in' },
  { r: 'r13', text: 'nomine',        gloss: 'name' },
  { r: 'r14', text: 'discipuli',     gloss: 'disciple' },
  { r: 'r15', text: 'amen',          gloss: 'amen' },
  { r: 'r16', text: 'dico',          gloss: 'I say' },
  { r: 'r17', text: 'vobis',         gloss: 'to you' },
  { r: 'r18', text: 'non',           gloss: 'not' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'perdet',        gloss: 'will lose' },
  { r: 'r21', text: null },
  { r: 'r22', text: 'mercedem',      gloss: 'reward' },
  { r: 'r23', text: 'suam',          gloss: 'his' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '10', '3'],
  ['matthew', '10', '20'],
  ['matthew', '10', '23'],
  ['matthew', '10', '33'],
  ['matthew', '10', '42'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
