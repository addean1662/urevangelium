'use strict';
// Scans every verse JSON against the Peshitta source text.
// Compares the SET of Peshitta source tokens against the SET of cell tokens.
// Reports verses where cell tokens contain words NOT in the source (wrong-word errors).
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const SRC  = path.join(BASE, 'sources', 'peshitta', 'Peshitta.txt');

// ── Parse Peshitta source ──────────────────────────────────────────────────
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

function peshTokens(text) {
  // Syriac words are separated by spaces; strip punctuation
  return text.replace(/[,;:!?\.܀-܍܏]/g,' ').split(/\s+/).filter(Boolean);
}

// Greek article detection
function normG(s) {
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
}
const ARTS = new Set([
  'ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι',
]);
function isArticle(t) { return ARTS.has(normG(t)); }

const issues = [];

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

      const srcSet = new Set(peshTokens(srcText));
      if (srcSet.size === 0) continue;

      // Peshitta cells (non-article, text only)
      const peCells = data.rows
        .filter(r => !isArticle(r.vaticanus?.text) && r.peshitta?.type === 'text')
        .map(r => r.peshitta.text);

      const cellTokens = peCells.flatMap(c => peshTokens(c));

      // Find cell tokens that are NOT in the source set (wrong words)
      // Also check prefix absorption: ܘ+word, ܠ+word, ܒ+word, ܡܢ+word, ܕ+word
      const wrong = cellTokens.filter(tok => {
        if (srcSet.has(tok)) return false;
        // Check if stripping common prefixes produces a match
        for (const pfx of ['ܘ','ܠ','ܒ','ܡܢ','ܕ','ܟ','ܗ']) {
          if (tok.startsWith(pfx) && srcSet.has(tok.slice(pfx.length))) return false;
          if (tok.startsWith(pfx) && tok.length > pfx.length) {
            // also try ܘ+ܕ, ܘ+ܠ combinations
            const rest = tok.slice(pfx.length);
            for (const pfx2 of ['ܕ','ܠ','ܒ']) {
              if (rest.startsWith(pfx2) && srcSet.has(rest.slice(pfx2.length))) return false;
            }
          }
        }
        // Check if it's a function word placed by align-all
        const FUNC = new Set(['ܕܝܢ','ܓܝܪ','ܐܠܐ','ܗܐ','ܐܡܝܢ','ܐܘܠܕ']);
        if (FUNC.has(tok)) return false;
        return true;
      });

      if (wrong.length > 0) {
        issues.push({
          ref: `${gospel} ${ch}:${v}`,
          wrong,
          srcSample: srcText.substring(0,80),
          cells: peCells.join(' | ').substring(0,100),
        });
      }
    }
  }
}

// Write report
const outPath = path.join(__dirname, 'peshitta-scan.json');
fs.writeFileSync(outPath, JSON.stringify(issues, null, 2));

const byGospel = {};
for (const i of issues) {
  const g = i.ref.split(' ')[0];
  byGospel[g] = (byGospel[g]||0)+1;
}
console.log(`Total verses with potential Peshitta wrong-word: ${issues.length}`);
for (const [g,n] of Object.entries(byGospel)) console.log(`  ${g}: ${n}`);
console.log('\nFirst 20 issues:');
for (const i of issues.slice(0,20)) {
  console.log(`  ${i.ref}  wrong: [${i.wrong.join(', ')}]`);
  console.log(`    src:   ${i.srcSample}`);
  console.log(`    cells: ${i.cells}`);
}
