'use strict';
// Scans every verse JSON against the Vulgate source text.
// Reports where the sequence of non-article Vulgate cells does NOT match
// the source token sequence, flagging real misalignment vs. legitimate bundles.
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const SRC  = path.join(BASE, 'sources', 'vulgate', 'VulgClementine.txt');

// ── Parse Vulgate source ───────────────────────────────────────────────────
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
  return text.replace(/[.,;:!?()\[\]{}«»—–æÆ]/g,' ').split(/\s+/).filter(Boolean);
}

// Normalize a Vulgate cell text for comparison: lowercase, collapse spaces
function norm(t) { return t.toLowerCase().replace(/\s+/g,' ').trim(); }

// ── Greek article detection (same as align-all.js) ────────────────────────
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

      const srcTokens = tokenize(srcText);

      // Collect non-article Vulgate cells (text only)
      const vgCells = data.rows
        .filter(r => !isArticle(r.vaticanus?.text) && r.vulgate?.type === 'text')
        .map(r => r.vulgate.text);

      if (vgCells.length === 0) continue;

      // Expand bundles into individual tokens for comparison
      const cellTokens = vgCells.flatMap(c => tokenize(c));

      if (srcTokens.length !== cellTokens.length) {
        issues.push({
          ref: `${gospel} ${ch}:${v}`,
          srcLen: srcTokens.length,
          cellLen: cellTokens.length,
          delta: cellTokens.length - srcTokens.length,
          src: srcText.substring(0,80),
          cells: vgCells.join(' | '),
        });
      } else {
        // Same count — check for order mismatch
        const mismatches = srcTokens.filter((t,i) => norm(t) !== norm(cellTokens[i]));
        if (mismatches.length > 0) {
          issues.push({
            ref: `${gospel} ${ch}:${v}`,
            srcLen: srcTokens.length,
            cellLen: cellTokens.length,
            delta: 0,
            mismatch: mismatches.length,
            src: srcText.substring(0,80),
            cells: vgCells.join(' | '),
          });
        }
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'vulgate-scan.json');
fs.writeFileSync(outPath, JSON.stringify(issues, null, 2));

// Summary to console
const byGospel = {};
for (const i of issues) {
  const g = i.ref.split(' ')[0];
  if (!byGospel[g]) byGospel[g] = 0;
  byGospel[g]++;
}
console.log(`Total verses with Vulgate mismatch: ${issues.length}`);
for (const [g,n] of Object.entries(byGospel)) console.log(`  ${g}: ${n}`);
console.log(`Report → scripts/vulgate-scan.json`);

// Show first 30 issues
console.log('\nFirst 30 issues:');
for (const i of issues.slice(0,30)) {
  const detail = i.mismatch ? `order(${i.mismatch})` : `delta(${i.delta>0?'+':''}${i.delta})`;
  console.log(`  ${i.ref}  [${detail}]`);
  console.log(`    src:   ${i.src}`);
  console.log(`    cells: ${i.cells.substring(0,80)}`);
}
