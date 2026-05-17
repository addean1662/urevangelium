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

// ── Matt 5:39 — "Turn the other cheek" ────────────────────────────────────────
// GK: ἐγὼ δὲ λέγω ὑμῖν μὴ ἀντιστῆναι τῷ πονηρῷ· ἀλλ᾽ ὅστις σε ῥαπίζει
//     εἰς τὴν δεξιὰν σιαγόνα σου, στρέψον αὐτῷ καὶ τὴν ἄλλην (22r)
// VL: Ego autem dico vobis non resistere malo sed si quis te percusserit in
//     dexteram maxillam tuam praebe illi et alteram
// Problem: "alteram" at article row r7 (τῷ); cascade r10-r22
applyVulgate('matthew', '5', '39', [
  { r: 'r7',  text: null },
  { r: 'r10', text: 'si quis',    gloss: 'if anyone' },
  { r: 'r11', text: 'te',         gloss: 'you' },
  { r: 'r12', text: 'percusserit', gloss: 'shall strike' },
  { r: 'r13', text: 'in',         gloss: 'on' },
  { r: 'r15', text: 'dexteram',   gloss: 'right' },
  { r: 'r16', text: 'maxillam',   gloss: 'cheek' },
  { r: 'r17', text: 'tuam',       gloss: 'your' },
  { r: 'r18', text: 'praebe',     gloss: 'offer' },
  { r: 'r19', text: 'illi',       gloss: 'to him' },
  { r: 'r20', text: 'et',         gloss: 'also' },
  { r: 'r22', text: 'alteram',    gloss: 'the other' },
]);

// ── Matt 7:13 — "Wide gate, broad way leads to destruction" ───────────────────
// GK: εἰσέλθατε διὰ τῆς στενῆς πύλης· ὅτι πλατεῖα ἡ πύλη καὶ εὐρύχωρος
//     ἡ ὁδὸς ἡ ἀπάγουσα εἰς τὴν ἀπώλειαν καὶ πολλοί εἰσιν οἱ εἰσερχόμενοι
//     δι᾽ αὐτῆς (25r)
// VL: Intrate per angustam portam quia lata porta et spatiosa via est quae
//     ducit ad perditionem et multi sunt qui intrant per eam
// Problem: "intrant/per/eam" at article rows r3/r8/r12; cascade
applyVulgate('matthew', '7', '13', [
  { r: 'r3',  text: null },
  { r: 'r8',  text: null },
  { r: 'r12', text: null },
  { r: 'r14', text: 'est',             gloss: 'is' },
  { r: 'r15', text: 'quæ ducit',       gloss: 'that leads' },
  { r: 'r16', text: 'ad',              gloss: 'to' },
  { r: 'r18', text: 'perditionem',     gloss: 'destruction' },
  { r: 'r19', text: 'et',              gloss: 'and' },
  { r: 'r20', text: 'multi',           gloss: 'many' },
  { r: 'r21', text: 'sunt',            gloss: 'are' },
  { r: 'r23', text: 'qui intrant',     gloss: 'who enter' },
  { r: 'r24', text: 'per',             gloss: 'through' },
  { r: 'r25', text: 'eam',             gloss: 'it' },
]);

// ── Matt 7:14 — "Narrow gate leads to life" ───────────────────────────────────
// GK: τί στενὴ ἡ πύλη καὶ τεθλιμμένη ἡ ὁδὸς ἡ ἀπάγουσα εἰς τὴν ζωήν,
//     καὶ ὀλίγοι εἰσὶν οἱ εὑρίσκοντες αὐτήν (19r)
// VL: quam angusta porta et arta via est quae ducit ad vitam et pauci
//     sunt qui inveniunt eam
// Problem: "qui/inveniunt/eam" at article rows r3/r7/r9; cascade
applyVulgate('matthew', '7', '14', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r9',  text: 'est',         gloss: 'is' },
  { r: 'r10', text: 'quæ ducit',   gloss: 'that leads' },
  { r: 'r11', text: 'ad',          gloss: 'to' },
  { r: 'r13', text: 'vitam',       gloss: 'life' },
  { r: 'r14', text: 'et',          gloss: 'and' },
  { r: 'r15', text: 'pauci',       gloss: 'few' },
  { r: 'r16', text: 'sunt',        gloss: 'are' },
  { r: 'r17', text: 'qui',         gloss: 'who' },
  { r: 'r18', text: 'inveniunt',   gloss: 'find' },
  { r: 'r19', text: 'eam',         gloss: 'it' },
]);

// ── Matt 10:28 — "Fear him who can destroy both soul and body in hell" ─────────
// GK: καὶ μὴ φοβεῖσθε ἀπὸ τῶν ἀποκτεννόντων τὸ σῶμα, τὴν δὲ ψυχὴν μὴ
//     δυναμένων ἀποκτεῖναι· φοβεῖσθε δὲ μᾶλλον τὸν δυνάμενον καὶ τὴν
//     ψυχὴν καὶ τὸ σῶμα ἀπολέσαι ἐν γεέννῃ (28r)
// VL: et nolite timere eos qui occidunt corpus animam autem non possunt
//     occidere sed potius timete eum qui potest et animam et corpus perdere
//     in gehenna
// Problem: "perdere/in/gehennam" at article rows r5/r7/r9; cascade
applyVulgate('matthew', '10', '28', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'qui occidunt',   gloss: 'who kill' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'corpus',         gloss: 'body' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'autem',          gloss: 'but' },
  { r: 'r11', text: 'animam',         gloss: 'soul' },
  { r: 'r12', text: 'non',            gloss: 'not' },
  { r: 'r13', text: 'possunt',        gloss: 'are able' },
  { r: 'r14', text: 'occidere',       gloss: 'to kill' },
  { r: 'r15', text: 'sed',            gloss: 'but' },
  { r: 'r16', text: 'potius',         gloss: 'rather' },
  { r: 'r17', text: 'timete',         gloss: 'fear' },
  { r: 'r19', text: 'eum qui potest', gloss: 'him who is able' },
  { r: 'r20', text: 'et',             gloss: 'both' },
  { r: 'r22', text: 'animam',         gloss: 'soul' },
  { r: 'r23', text: 'et',             gloss: 'and' },
  { r: 'r25', text: 'corpus',         gloss: 'body' },
  { r: 'r26', text: 'perdere',        gloss: 'to destroy' },
  { r: 'r27', text: 'in',             gloss: 'in' },
  { r: 'r28', text: 'gehenna',        gloss: 'hell' },
]);

// ── Matt 13:43 — "The righteous will shine like the sun" ──────────────────────
// GK: τότε οἱ δίκαιοι ἐκλάμψουσιν ὡς ὁ ἥλιος ἐν τῇ βασιλείᾳ τοῦ πατρὸς
//     αὐτῶν. ὁ ἔχων ὦτα ἀκουέτω (18r)
// VL: tunc iusti fulgebunt sicut sol in regno Patris eorum qui habet aures
//     audiat
// Problem: "audiat" at article row r2 (οἱ); r18 missing "audiat"
applyVulgate('matthew', '13', '43', [
  { r: 'r2',  text: null },
  { r: 'r18', text: 'audiat', gloss: 'let him hear' },
]);

// Verify
const verses = [
  ['matthew', '5', '39'],
  ['matthew', '7', '13'],
  ['matthew', '7', '14'],
  ['matthew', '10', '28'],
  ['matthew', '13', '43'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
