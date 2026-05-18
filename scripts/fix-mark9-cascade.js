'use strict';
// Fix the Mark 9 Vulgate cascade:
//   The Clementine source file has Mark 9:1 at 8:39, causing every JSON verse 9:N
//   to carry Clementine[9:N] when it should carry Clementine[9:N-1] (with verse 9:1
//   needing Clementine[8:39]).  Verses 9:44 onward self-correct via the extra refrain
//   slots, so only 9:1–9:43 need repair.
//
//   Strategy: for each verse, clear the wrong Vulgate cells, then distribute the
//   correct Clementine tokens sequentially across non-article rows (left to right),
//   bundling overflow tokens into the last content row.  This is approximate but
//   correct at the verse level; word-level refinement can follow separately.
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const CSRC = path.join(BASE, 'sources', 'vulgate', 'VulgClementine.txt');

// ── Parse full Clementine source ──────────────────────────────────────────────
const clementine = {};   // clementine[ch][v] = text
{
  const lines = fs.readFileSync(CSRC, 'utf8').split('\n');
  let cur = null;
  for (const l of lines) {
    const h = l.match(/^###\s+(\S+)/);
    if (h) { cur = h[1].toLowerCase(); clementine[cur] = clementine[cur] || {}; continue; }
    if (!cur) continue;
    const m = l.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (!m) continue;
    const ch = +m[1], v = +m[2];
    const text = m[3].replace(/[܀。]/g, '').replace(/\s*[.!?]\s*$/, '').trim();
    if (!clementine[cur][ch]) clementine[cur][ch] = {};
    clementine[cur][ch][v] = text;
  }
}

// ── Greek article detection ────────────────────────────────────────────────────
function normG(s) { return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
const ARTS = new Set(['ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι']);
function isArticle(t) { return ARTS.has(normG(t)); }

// ── Tokenize Latin text ────────────────────────────────────────────────────────
function tokenize(text) {
  // Split on whitespace; strip punctuation-only tokens (colons, semicolons etc.)
  return text.replace(/\s+/g, ' ').trim().split(' ')
    .map(t => t.replace(/^[,;:!?()\[\]]+$/, ''))   // drop pure-punctuation tokens
    .filter(Boolean);
}

// ── Gloss lookup: return the Vaticanus gloss for a row ────────────────────────
function vatGloss(row) { return row.vaticanus?.gloss?.gloss || '?'; }

// ── Fix one verse ──────────────────────────────────────────────────────────────
function fixVerse(gospel, ch, v, srcText) {
  const fp = path.join(BASE, gospel, String(ch), v + '.json');
  if (!fs.existsSync(fp)) { console.warn('  MISSING ' + fp); return; }
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

  // Clear all current Vulgate cells
  for (const row of data.rows) {
    row.vulgate = { type: 'empty' };
  }

  if (!srcText) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log('  ' + gospel + ' ' + ch + ':' + v + ' → cleared (no source text)');
    return;
  }

  const tokens = tokenize(srcText);

  // Collect rows that should receive Vulgate text (non-article, has Vaticanus text OR has no Vaticanus but still meaningful)
  const contentRows = data.rows.filter(r => {
    // Skip rows where Greek is an article
    if (isArticle(r.vaticanus?.text)) return false;
    // Include rows that have Vaticanus text or are empty-vaticanus (like ubi vermis refrain slots)
    return true;
  });

  if (contentRows.length === 0 || tokens.length === 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    return;
  }

  // Distribute tokens across content rows, one per row;
  // when tokens run out, the remaining rows stay empty.
  // When more tokens than rows, bundle excess into last row.
  for (let i = 0; i < contentRows.length && i < tokens.length; i++) {
    const row = contentRows[i];
    const gl = vatGloss(row);
    let text = tokens[i];
    // If this is the last content row and there are remaining tokens, bundle them
    if (i === contentRows.length - 1 && tokens.length > contentRows.length) {
      text = tokens.slice(i).join(' ');
    }
    // Strip trailing punctuation from displayed token for cleanliness
    const displayText = text.replace(/[,;:!?]+$/,'') || text;
    row.vulgate = { type: 'text', text: displayText, gloss: { gloss: gl, source: 'Whitaker' } };
  }

  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  const assigned = Math.min(contentRows.length, tokens.length);
  console.log('  mark 9:' + v + ' → ' + tokens.length + ' tokens across ' + assigned + ' rows' +
    (tokens.length > contentRows.length ? ' (bundled overflow)' : ''));
}

// ── Mark 9:1 uses Clementine 8:39 ─────────────────────────────────────────────
const src839 = clementine['mark']?.[8]?.[39];
if (!src839) {
  console.error('ERROR: Clementine mark 8:39 not found — check source file');
  process.exit(1);
}
fixVerse('mark', 9, 1, src839);

// ── Mark 9:2–9:43 each use Clementine 9:[N-1] ─────────────────────────────────
for (let v = 2; v <= 43; v++) {
  const srcText = clementine['mark']?.[9]?.[v - 1];
  fixVerse('mark', 9, v, srcText || null);
}

console.log('\nDone — mark 9:1-43 Vulgate realigned to correct Clementine verse.');
console.log('Note: this is a sequential token distribution; word-level bundles may need');
console.log('      manual refinement, especially for clause-restructured verses.');
