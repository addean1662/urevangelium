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

// Matt 17:21 — Hoc autem genus non ejicitur nisi per orationem et jejunium
applyVulgate('matthew', '17', '21', [
  { r: 'r1',  text: 'Hoc',        gloss: 'this' },
  { r: 'r2',  text: 'autem',      gloss: 'but' },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'genus',      gloss: 'kind' },
  { r: 'r5',  text: 'non',        gloss: 'not' },
  { r: 'r6',  text: 'ejicitur',   gloss: 'is cast out' },
  { r: 'r7',  text: 'nisi',       gloss: 'except' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'per',        gloss: 'by' },
  { r: 'r10', text: 'orationem',  gloss: 'prayer' },
  { r: 'r11', text: 'et',         gloss: 'and' },
  { r: 'r12', text: 'jejunium',   gloss: 'fasting' },
]);

// Matt 17:22 — Conversantibus autem eis in Galilaea dixit illis Jesus Filius hominis tradendus est in manus hominum
applyVulgate('matthew', '17', '22', [
  { r: 'r1',  text: 'Conversantibus', gloss: 'while living' },
  { r: 'r2',  text: 'autem',          gloss: 'but' },
  { r: 'r3',  text: 'eis',            gloss: 'them' },
  { r: 'r4',  text: 'in',             gloss: 'in' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Galilaea',       gloss: 'Galilee' },
  { r: 'r7',  text: 'dixit',          gloss: 'said' },
  { r: 'r8',  text: 'illis',          gloss: 'to them' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'Jesus',          gloss: 'Jesus' },
  { r: 'r11', text: null },
  { r: 'r12', text: null },
  { r: 'r13', text: 'Filius',         gloss: 'Son' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'hominis',        gloss: 'of man' },
  { r: 'r16', text: 'tradendus est',  gloss: 'is to be delivered' },
  { r: 'r17', text: 'in',             gloss: 'into' },
  { r: 'r18', text: 'manus',          gloss: 'hands' },
  { r: 'r19', text: 'hominum',        gloss: 'of men' },
]);

// Matt 17:23 — et occident eum et tertia die resurget Et contristati sunt vehementer
applyVulgate('matthew', '17', '23', [
  { r: 'r1',  text: 'et',               gloss: 'and' },
  { r: 'r2',  text: 'occident',         gloss: 'they will kill' },
  { r: 'r3',  text: 'eum',              gloss: 'him' },
  { r: 'r4',  text: 'et',               gloss: 'and' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'tertia',           gloss: 'third' },
  { r: 'r7',  text: 'die',              gloss: 'day' },
  { r: 'r8',  text: 'resurget',         gloss: 'will rise' },
  { r: 'r9',  text: 'Et',               gloss: 'and' },
  { r: 'r10', text: 'contristati sunt', gloss: 'were grieved' },
  { r: 'r11', text: 'vehementer',       gloss: 'greatly' },
]);

// Matt 17:24 — Et cum venissent Capharnaum accesserunt qui didrachma accipiebant ad Petrum et dixerunt ei Magister vester non solvit didrachma
applyVulgate('matthew', '17', '24', [
  { r: 'r1',  text: 'Et',          gloss: 'and' },
  { r: 'r2',  text: 'cum',         gloss: 'when' },
  { r: 'r3',  text: 'venissent',   gloss: 'they came' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Capharnaum',  gloss: 'Capernaum' },
  { r: 'r6',  text: 'accesserunt', gloss: 'came to' },
  { r: 'r7',  text: 'qui',         gloss: 'who' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'didrachma',   gloss: 'double-drachma' },
  { r: 'r10', text: 'accipiebant', gloss: 'were receiving' },
  { r: 'r11', text: 'ad',          gloss: 'to' },
  { r: 'r12', text: 'Petrum',      gloss: 'Peter' },
  { r: 'r13', text: 'et',          gloss: 'and' },
  { r: 'r14', text: 'dixerunt',    gloss: 'said' },
  { r: 'r15', text: 'ei',          gloss: 'to him' },
  { r: 'r16', text: 'Magister',    gloss: 'Teacher' },
  { r: 'r17', text: 'vester',      gloss: 'your' },
  { r: 'r18', text: 'non',         gloss: 'not' },
  { r: 'r19', text: 'solvit',      gloss: 'pay' },
  { r: 'r20', text: null },
  { r: 'r21', text: 'didrachma',   gloss: 'double-drachma' },
]);

// Matt 17:25 — Ait Etiam Et cum intrasset domum praevenit eum Jesus dicens Quid tibi videtur Simon Reges terrae a quibus accipiunt tributum vel censum a filiis suis an ab alienis
applyVulgate('matthew', '17', '25', [
  { r: 'r1',  text: 'Ait',        gloss: 'said' },
  { r: 'r2',  text: 'Etiam',      gloss: 'yes' },
  { r: 'r3',  text: 'Et',         gloss: 'and' },
  { r: 'r4',  text: 'cum',        gloss: 'when' },
  { r: 'r5',  text: 'intrasset',  gloss: 'he entered' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'domum',      gloss: 'house' },
  { r: 'r9',  text: 'praevenit',  gloss: 'anticipated' },
  { r: 'r10', text: 'eum',        gloss: 'him' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r13', text: 'dicens',     gloss: 'saying' },
  { r: 'r14', text: 'Quid',       gloss: 'what' },
  { r: 'r15', text: 'tibi',       gloss: 'to you' },
  { r: 'r16', text: 'videtur',    gloss: 'seems' },
  { r: 'r17', text: 'Simon',      gloss: 'Simon' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'Reges',      gloss: 'kings' },
  { r: 'r20', text: null },
  { r: 'r21', text: 'terrae',     gloss: 'of the earth' },
  { r: 'r22', text: 'a',          gloss: 'from' },
  { r: 'r23', text: 'quibus',     gloss: 'whom' },
  { r: 'r24', text: 'accipiunt',  gloss: 'receive' },
  { r: 'r25', text: 'tributum',   gloss: 'tribute' },
  { r: 'r26', text: 'vel',        gloss: 'or' },
  { r: 'r27', text: 'censum',     gloss: 'census tax' },
  { r: 'r28', text: 'a',          gloss: 'from' },
  { r: 'r29', text: null },
  { r: 'r30', text: 'filiis',     gloss: 'sons' },
  { r: 'r31', text: 'suis',       gloss: 'their own' },
  { r: 'r32', text: 'an',         gloss: 'or' },
  { r: 'r33', text: 'ab',         gloss: 'from' },
  { r: 'r34', text: null },
  { r: 'r35', text: 'alienis',    gloss: 'strangers' },
]);

// Matt 17:26 — Et ille dixit Ab alienis Dixit illi Jesus Ergo liberi sunt filii
applyVulgate('matthew', '17', '26', [
  { r: 'r1',  text: 'Et',       gloss: 'and' },
  { r: 'r2',  text: null },
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'ille',     gloss: 'he' },
  { r: 'r5',  text: 'Ab',       gloss: 'from' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'alienis',  gloss: 'strangers' },
  { r: 'r8',  text: 'Dixit',    gloss: 'said' },
  { r: 'r9',  text: 'illi',     gloss: 'to him' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'Jesus',    gloss: 'Jesus' },
  { r: 'r12', text: 'Ergo',     gloss: 'therefore' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'liberi',   gloss: 'free' },
  { r: 'r15', text: 'sunt',     gloss: 'are' },
  { r: 'r16', text: null },
  { r: 'r17', text: 'filii',    gloss: 'sons' },
  { r: 'r18', text: null },
]);

// Matt 17:27 — Ut autem non scandalizemus eos vade ad mare et mitte hamum et eum piscem qui primus ascenderit tolle et aperto ore ejus invenies staterem illum sumens da eis pro me et te
applyVulgate('matthew', '17', '27', [
  { r: 'r1',  text: 'Ut',            gloss: 'so that' },
  { r: 'r2',  text: 'autem',         gloss: 'but' },
  { r: 'r3',  text: 'non',           gloss: 'not' },
  { r: 'r4',  text: 'scandalizemus', gloss: 'we offend' },
  { r: 'r5',  text: 'eos',           gloss: 'them' },
  { r: 'r6',  text: 'vade',          gloss: 'go' },
  { r: 'r7',  text: 'ad',            gloss: 'to' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'mare',          gloss: 'sea' },
  { r: 'r10', text: 'mitte',         gloss: 'cast' },
  { r: 'r11', text: 'hamum',         gloss: 'hook' },
  { r: 'r12', text: 'et',            gloss: 'and' },
  { r: 'r13', text: 'eum',           gloss: 'that' },
  { r: 'r14', text: 'ascenderit',    gloss: 'comes up' },
  { r: 'r15', text: 'primus',        gloss: 'first' },
  { r: 'r16', text: 'piscem',        gloss: 'fish' },
  { r: 'r17', text: 'tolle',         gloss: 'take' },
  { r: 'r18', text: 'et',            gloss: 'and' },
  { r: 'r19', text: 'aperto',        gloss: 'opened' },
  { r: 'r20', text: null },
  { r: 'r21', text: 'ore',           gloss: 'mouth' },
  { r: 'r22', text: 'ejus',          gloss: 'its' },
  { r: 'r23', text: 'invenies',      gloss: 'you will find' },
  { r: 'r24', text: 'staterem',      gloss: 'stater' },
  { r: 'r25', text: 'illum',         gloss: 'that' },
  { r: 'r26', text: 'sumens',        gloss: 'taking' },
  { r: 'r27', text: 'da',            gloss: 'give' },
  { r: 'r28', text: 'eis',           gloss: 'them' },
  { r: 'r29', text: 'pro',           gloss: 'for' },
  { r: 'r30', text: 'me',            gloss: 'me' },
  { r: 'r31', text: 'et',            gloss: 'and' },
  { r: 'r32', text: 'te',            gloss: 'you' },
]);

console.log('All done.');
