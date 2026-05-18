'use strict';
// Detects cascade-shift verses: where >40% of Vulgate cell tokens are NOT in the Clementine
// source for that verse. High pct = strong evidence of cascade misalignment.
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const SRC  = path.join(BASE, 'sources', 'vulgate', 'VulgClementine.txt');

const GOSPEL_MAP = { Matthew:'matthew', Mark:'mark', Luke:'luke', John:'john' };
const src = {};
const srcLines = fs.readFileSync(SRC, 'utf8').split('\n');
let cur = null;
for (const line of srcLines) {
  const h = line.match(/^###\s+(\S+)/);
  if (h) { cur = GOSPEL_MAP[h[1]] || null; if (cur) src[cur] = {}; continue; }
  if (!cur) continue;
  const m = line.match(/^\[(\d+):(\d+)\]\s+(.*)/);
  if (!m) continue;
  const ch = +m[1], v = +m[2];
  const text = m[3].replace(/[܀。]/g,'').replace(/\s*[.!?]\s*$/,'').trim();
  if (!src[cur][ch]) src[cur][ch] = {};
  src[cur][ch][v] = text;
}

function tokenize(text) {
  return text.replace(/[.,;:!?()\[\]{}«»—–æÆ]/g,' ').split(/\s+/).filter(Boolean)
    .map(t => t.toLowerCase().replace(/^j/,'i').replace(/j/g,'i'));
}

function normG(s) {
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
}
const ARTS = new Set([
  'ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι',
]);
function isArticle(t) { return ARTS.has(normG(t)); }

// Function words that align-all inserts — not wrong even if not in source
const FUNC_WORDS = new Set(['et','autem','enim','sed','quia','ut','in','de','ad','per',
  'cum','non','est','sunt','erat','erant','se','sibi','eos','eum','eam','ei','eo']);

const suspects = [];
const GOSPELS = ['matthew','mark','luke','john'];

for (const gospel of GOSPELS) {
  const gDir = path.join(BASE, gospel);
  if (!fs.existsSync(gDir)) continue;
  const chapters = fs.readdirSync(gDir).map(Number).filter(Boolean).sort((a,b)=>a-b);
  for (const ch of chapters) {
    const cDir = path.join(gDir, String(ch));
    const verses = fs.readdirSync(cDir).filter(f=>f.endsWith('.json'))
      .map(f=>parseInt(f)).sort((a,b)=>a-b);
    for (const v of verses) {
      const fp = path.join(cDir, `${v}.json`);
      let data;
      try { data = JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) { continue; }

      const srcText = src[gospel]?.[ch]?.[v];
      if (!srcText) continue;
      const srcSet = new Set(tokenize(srcText));
      if (srcSet.size === 0) continue;

      const vgCells = data.rows
        .filter(r => !isArticle(r.vaticanus?.text) && r.vulgate?.type === 'text')
        .map(r => r.vulgate.text);

      if (vgCells.length < 3) continue;

      const cellTokens = vgCells.flatMap(c => tokenize(c));
      const wrong = cellTokens.filter(t => !srcSet.has(t) && !FUNC_WORDS.has(t));
      const pct = wrong.length / cellTokens.length;

      if (pct >= 0.40) {
        suspects.push({
          ref: gospel + ' ' + ch + ':' + v,
          pct: Math.round(pct * 100),
          wrongCount: wrong.length,
          total: cellTokens.length,
          wrong: wrong.slice(0, 6),
          cells: vgCells.slice(0, 8).join(' | '),
          src: srcText.substring(0, 80),
        });
      }
    }
  }
}

suspects.sort((a,b) => b.pct - a.pct);

const outPath = path.join(__dirname, 'cascade-scan.json');
fs.writeFileSync(outPath, JSON.stringify(suspects, null, 2));

const byGospel = {};
for (const s of suspects) {
  const g = s.ref.split(' ')[0];
  byGospel[g] = (byGospel[g]||0)+1;
}

console.log('Cascade suspects (>= 40% wrong tokens): ' + suspects.length);
for (const [g,n] of Object.entries(byGospel)) console.log('  ' + g + ': ' + n);
console.log('\nTop 40 suspects:');
for (const s of suspects.slice(0,40)) {
  console.log('  ' + s.ref + '  ' + s.pct + '% (' + s.wrongCount + '/' + s.total + ')  wrong: [' + s.wrong.join(', ') + ']');
  console.log('    src:   ' + s.src);
  console.log('    cells: ' + s.cells.substring(0,90));
}
