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

// 20:8 — cascades at ὁ r5, τοῦ r7, τῷ r9 (hidden)
applyVulgate('matthew', 20, 8, [
  { r: 1,  text: 'Cum sero',      gloss: 'When evening' },
  { r: 2,  text: 'autem',         gloss: 'but' },
  { r: 3,  text: 'factum esset',  gloss: 'had come' },
  { r: 4,  text: 'dixit',         gloss: 'said' },
  { r: 5,  text: null },
  { r: 6,  text: 'dominus',       gloss: 'lord' },
  { r: 7,  text: null },
  { r: 8,  text: 'vineæ',         gloss: 'of the vineyard' },
  { r: 9,  text: null },
  { r: 10, text: 'procuratori',   gloss: 'to the steward' },
  { r: 11, text: 'suo',           gloss: 'his' },
  { r: 12, text: 'Voca',          gloss: 'Call' },
  { r: 14, text: 'operarios',     gloss: 'the workers' },
  { r: 15, text: 'et',            gloss: 'and' },
  { r: 16, text: 'redde',         gloss: 'pay' },
  { r: 17, text: 'illis',         gloss: 'them' },
  { r: 19, text: 'mercedem',      gloss: 'the wages' },
  { r: 20, text: 'incipiens',     gloss: 'beginning' },
  { r: 21, text: 'a',             gloss: 'from' },
  { r: 23, text: 'novissimis',    gloss: 'the last' },
  { r: 24, text: 'usque',         gloss: 'even' },
  { r: 26, text: 'ad primos',     gloss: 'to the first' },
]);

// 20:9 — cascade at τὴν r6; οἱ r4="qui" is legitimate articular
applyVulgate('matthew', 20, 9, [
  { r: 6, text: null },
  { r: 7, text: 'undecimam',      gloss: 'eleventh' },
  { r: 8, text: 'horam venerant', gloss: 'hour had come' },
]);

// 20:10 — cascades at οἱ r4, τὸ r12
applyVulgate('matthew', 20, 10, [
  { r: 4,  text: null },
  { r: 5,  text: 'primi',               gloss: 'the first' },
  { r: 6,  text: 'arbitrati sunt',      gloss: 'supposed' },
  { r: 9,  text: 'essent accepturi',    gloss: 'would receive' },
  { r: 10, text: 'acceperunt',          gloss: 'they received' },
  { r: 11, text: 'autem',              gloss: 'but' },
  { r: 12, text: null },
]);

// 20:13 — ὁ r1="At" legitimate; fix bundles at end
applyVulgate('matthew', 20, 13, [
  { r: 13, text: 'ex denario',         gloss: 'for a denarius' },
  { r: 14, text: 'convenisti mecum',   gloss: 'did you not agree with me' },
]);

// 20:14 — cascades at τὸ r2, τῷ r9 (hidden)
applyVulgate('matthew', 20, 14, [
  { r: 2,  text: null },
  { r: 3,  text: 'quod tuum est',      gloss: 'what is yours' },
  { r: 4,  text: 'et',                 gloss: 'and' },
  { r: 5,  text: 'vade',               gloss: 'go' },
  { r: 6,  text: 'volo',               gloss: 'I wish' },
  { r: 7,  text: 'autem',              gloss: 'but' },
  { r: 8,  text: 'et huic',            gloss: 'also to this one' },
  { r: 9,  text: null },
  { r: 10, text: 'novissimo',          gloss: 'last' },
  { r: 11, text: 'dare',               gloss: 'to give' },
  { r: 12, text: 'sicut',              gloss: 'as' },
  { r: 13, text: 'et',                 gloss: 'also' },
  { r: 14, text: 'tibi',               gloss: 'to you' },
]);

// 20:20 — cascade at ἡ r4
applyVulgate('matthew', 20, 20, [
  { r: 3,  text: 'ad eum',             gloss: 'to him' },
  { r: 4,  text: null },
  { r: 5,  text: 'mater',              gloss: 'the mother' },
  { r: 7,  text: 'filiorum',           gloss: 'of the sons' },
  { r: 8,  text: 'Zebedæi',            gloss: 'of Zebedee' },
  { r: 9,  text: 'cum',                gloss: 'with' },
  { r: 11, text: 'filiis',             gloss: 'sons' },
  { r: 12, text: 'suis',               gloss: 'her' },
  { r: 13, text: 'adorans',            gloss: 'worshipping' },
  { r: 14, text: 'et',                 gloss: 'and' },
  { r: 15, text: 'petens',             gloss: 'asking' },
  { r: 16, text: 'aliquid',            gloss: 'something' },
  { r: 17, text: 'ab',                 gloss: 'from' },
  { r: 18, text: 'eo',                 gloss: 'him' },
]);

// 20:24 — cascade at οἱ r3; "fratribus" bundle at r9
applyVulgate('matthew', 20, 24, [
  { r: 3, text: null },
  { r: 9, text: 'duobus fratribus',    gloss: 'two brothers' },
]);

// 20:25 — Ὁ r1="Jesus" legitimate; cascades at οἱ r9, τῶν r11, οἱ r16
applyVulgate('matthew', 20, 25, [
  { r: 5,  text: 'ad se',                         gloss: 'to himself' },
  { r: 6,  text: 'et ait',                         gloss: 'and said' },
  { r: 7,  text: 'Scitis',                         gloss: 'You know' },
  { r: 8,  text: 'quia',                           gloss: 'that' },
  { r: 9,  text: null },
  { r: 10, text: 'principes',                      gloss: 'the rulers' },
  { r: 11, text: null },
  { r: 16, text: null },
  { r: 18, text: 'potestatem exercent in eos',     gloss: 'exercise authority over them' },
  { r: 19, text: null },
]);

// 20:32 — cascade at ὁ r3; bundle at r12
applyVulgate('matthew', 20, 32, [
  { r: 3,  text: null },
  { r: 4,  text: 'Jesus',              gloss: 'Jesus' },
  { r: 12, text: 'faciam vobis',       gloss: 'I do for you' },
]);

console.log('Batch 23 complete.');
