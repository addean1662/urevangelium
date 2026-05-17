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

// ── Matt 13:5 — seed on rocky ground ────────────────────────────────────────
// GK: ἄλλα δὲ ἔπεσεν ἐπὶ τὰ πετρώδη ὅπου οὐκ εἶχεν γῆν πολλήν, καὶ
//     εὐθέως ἐξανέτειλεν διὰ τὸ μὴ ἔχειν βάθος γῆς (20r)
// VL: Alia autem ceciderunt in petrosa ubi non habebant terram multam et
//     continuo exorta sunt quia non habebant altitudinem terræ
// Problem: "terræ" at article τά r5; r14-r20 cascade
applyVulgate('matthew', '13', '5', [
  { r: 'r5',  text: null },
  { r: 'r14', text: 'exorta sunt',   gloss: 'sprang up' },
  { r: 'r15', text: 'quia',          gloss: 'because' },
  { r: 'r17', text: 'non',           gloss: 'not' },
  { r: 'r18', text: 'habebant',      gloss: 'they had' },
  { r: 'r19', text: 'altitudinem',   gloss: 'depth' },
  { r: 'r20', text: 'terræ',         gloss: 'of earth' },
]);

// ── Matt 13:15 — heart of this people has grown dull ────────────────────────
// GK: ἐπαχύνθη γὰρ ἡ καρδία τοῦ λαοῦ τούτου, καὶ τοῖς ὠσὶν βαρέως ἤκουσαν,
//     καὶ τοὺς ὀφθαλμοὺς αὐτῶν ἐκάμμυσαν· μήποτε ἴδωσιν τοῖς ὀφθαλμοῖς
//     καὶ τοῖς ὠσὶν ἀκούσωσιν καὶ τῇ καρδίᾳ συνῶσιν καὶ ἐπιστρέψωσιν
//     καὶ ἰάσομαι αὐτούς (34r)
// VL: Incrassatum est enim cor populi hujus et auribus graviter audierunt et
//     oculos suos clauserunt nequando videant oculis et auribus audiant et
//     corde intelligant et convertantur et sanem eos
// Problem: "eos" at article ἡ r3; full cascade r1-r34
applyVulgate('matthew', '13', '15', [
  { r: 'r1',  text: 'Incrassatum est', gloss: 'has grown dull' },
  { r: 'r2',  text: 'enim',            gloss: 'for' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'cor',             gloss: 'heart' },
  { r: 'r6',  text: 'populi',          gloss: 'people' },
  { r: 'r7',  text: 'hujus',           gloss: 'this' },
  { r: 'r8',  text: 'et',              gloss: 'and' },
  { r: 'r10', text: 'auribus',         gloss: 'with ears' },
  { r: 'r11', text: 'graviter',        gloss: 'with difficulty' },
  { r: 'r12', text: 'audierunt',       gloss: 'they heard' },
  { r: 'r13', text: 'et',              gloss: 'and' },
  { r: 'r15', text: 'oculos',          gloss: 'eyes' },
  { r: 'r16', text: 'suos',            gloss: 'their' },
  { r: 'r17', text: 'clauserunt',      gloss: 'closed' },
  { r: 'r18', text: 'nequando',        gloss: 'lest' },
  { r: 'r19', text: 'videant',         gloss: 'they see' },
  { r: 'r21', text: 'oculis',          gloss: 'with eyes' },
  { r: 'r22', text: 'et',              gloss: 'and' },
  { r: 'r24', text: 'auribus',         gloss: 'with ears' },
  { r: 'r25', text: 'audiant',         gloss: 'hear' },
  { r: 'r26', text: 'et',              gloss: 'and' },
  { r: 'r28', text: 'corde',           gloss: 'with heart' },
  { r: 'r29', text: 'intelligant',     gloss: 'understand' },
  { r: 'r30', text: 'et',              gloss: 'and' },
  { r: 'r31', text: 'convertantur',    gloss: 'be converted' },
  { r: 'r32', text: 'et',              gloss: 'and' },
  { r: 'r33', text: 'sanem',           gloss: 'I heal' },
  { r: 'r34', text: 'eos',             gloss: 'them' },
]);

// ── Matt 13:37 — the sower of good seed is the Son of Man ───────────────────
// GK: Ὁ δὲ ἀποκριθεὶς εἶπεν αὐτοῖς· ὁ σπείρων τὸ καλὸν σπέρμα ἐστὶν
//     ὁ υἱὸς τοῦ ἀνθρώπου (15r)
// VL: Qui autem respondens ait illis Qui seminat bonum semen est Filius hominis
// Problem: "hominis" at article Ὁ r1; r2-r15 cascade
applyVulgate('matthew', '13', '37', [
  { r: 'r1',  text: 'Qui',            gloss: 'he who' },
  { r: 'r2',  text: 'autem',          gloss: 'then' },
  { r: 'r7',  text: 'seminat',        gloss: 'sows' },
  { r: 'r9',  text: 'bonum',          gloss: 'good' },
  { r: 'r10', text: 'semen',          gloss: 'seed' },
  { r: 'r11', text: 'est',            gloss: 'is' },
  { r: 'r13', text: 'Filius',         gloss: 'Son' },
  { r: 'r15', text: 'hominis',        gloss: 'of man' },
]);

// ── Matt 13:39 — harvest is the consummation of the age ─────────────────────
// GK: ὁ δὲ ἐχθρὸς ὁ σπείρας αὐτά ἐστιν ὁ διάβολος· ὁ δὲ θερισμὸς
//     συντέλεια τοῦ αἰῶνός ἐστιν· οἱ δὲ θερισταὶ ἄγγελοί εἰσιν (21r)
// VL: Inimicus autem qui seminavit ea est diabolus Messis vero consummatio
//     sæculi est Messores autem angeli sunt
// Problem: "sæculi" at article οἱ r17; r13-r21 cascade
applyVulgate('matthew', '13', '39', [
  { r: 'r13', text: 'consummatio',    gloss: 'completion' },
  { r: 'r15', text: 'sæculi',        gloss: 'of the age' },
  { r: 'r16', text: 'est',            gloss: 'is' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'autem',          gloss: 'but' },
  { r: 'r19', text: 'Messores',       gloss: 'reapers' },
  { r: 'r20', text: 'angeli',         gloss: 'angels' },
  { r: 'r21', text: 'sunt',           gloss: 'are' },
]);

// ── Matt 13:48 — fishermen sort the catch on shore ──────────────────────────
// GK: ἣν ὅτε ἐπληρώθη ἀναβιβάσαντες ἐπὶ τὸν αἰγιαλόν, καὶ καθίσαντες
//     συνέλεξαν τὰ καλὰ εἰς ἄγγη, τὰ δὲ σαπρὰ ἔξω ἔβαλον (19r)
// VL: Quam cum impleta esset educentes secus littus sedentes elegerunt bonos
//     in vasa malos autem foras miserunt
// Problem: "miserunt" at article τόν r6; cascade r3-r19
applyVulgate('matthew', '13', '48', [
  { r: 'r3',  text: 'impleta esset',  gloss: 'was filled' },
  { r: 'r4',  text: 'educentes',      gloss: 'drawing up' },
  { r: 'r5',  text: 'secus',          gloss: 'along' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'littus',         gloss: 'shore' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'sedentes',       gloss: 'sitting down' },
  { r: 'r10', text: 'elegerunt',      gloss: 'gathered' },
  { r: 'r12', text: 'bonos',          gloss: 'good ones' },
  { r: 'r13', text: 'in',             gloss: 'into' },
  { r: 'r14', text: 'vasa',           gloss: 'containers' },
  { r: 'r16', text: 'autem',          gloss: 'but' },
  { r: 'r17', text: 'malos',          gloss: 'bad ones' },
  { r: 'r18', text: 'foras',          gloss: 'outside' },
  { r: 'r19', text: 'miserunt',       gloss: 'threw' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '13', '5'],
  ['matthew', '13', '15'],
  ['matthew', '13', '37'],
  ['matthew', '13', '39'],
  ['matthew', '13', '48'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
