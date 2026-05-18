'use strict';
// Fix John 14:11-12 Vulgate cascade:
//   Clementine source [14:11] = "Non creditis quia ego in Patre, et Pater in me est?"
//   — a copy of the question from [14:10] instead of the correct verse.
//   Clementine source [14:12] begins "alioquin propter opera ipsa credite" — the END
//   of the correct Vulgate 14:11 — then runs into correct 14:12 content.
//
//   Result in JSON: 14:11 carries the wrong question; 14:12 starts with 14:11's tail,
//   shifting Amen amen dico vobis... four tokens to the right.
//
//   Fix:
//     14:11 → correct Vulgate text supplied directly (not from corrupted source)
//     14:12 → correct source text extracted from [14:12] starting at "Amen"
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..', 'data');

function normG(s) { return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
const ARTS = new Set(['ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι']);
function isArticle(t) { return ARTS.has(normG(t)); }
function vatGloss(row) { return row.vaticanus?.gloss?.gloss || '?'; }

function tokenize(text) {
  return text.replace(/\s+/g, ' ').trim().split(' ')
    .map(t => t.replace(/^[,;:!?()\[\]]+$/, ''))
    .filter(Boolean);
}

function fixVerse(gospel, ch, v, srcText) {
  const fp = path.join(BASE, gospel, String(ch), v + '.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const row of data.rows) row.vulgate = { type: 'empty' };

  const tokens = tokenize(srcText);
  const contentRows = data.rows.filter(r => !isArticle(r.vaticanus?.text));
  if (contentRows.length === 0 || tokens.length === 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2)); return;
  }

  for (let i = 0; i < contentRows.length && i < tokens.length; i++) {
    const row = contentRows[i];
    let text = tokens[i];
    if (i === contentRows.length - 1 && tokens.length > contentRows.length)
      text = tokens.slice(i).join(' ');
    const displayText = text.replace(/[,;:!?]+$/, '') || text;
    row.vulgate = { type: 'text', text: displayText,
      gloss: { gloss: vatGloss(row), source: 'Whitaker' } };
  }

  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  const assigned = Math.min(contentRows.length, tokens.length);
  console.log('  john 14:' + v + ' → ' + tokens.length + ' tokens across ' + assigned + ' rows' +
    (tokens.length > contentRows.length ? ' (bundled overflow)' : ''));
}

// ── Read Clementine source for 14:12 and extract the correct portion ──────────
const CSRC = path.join(BASE, 'sources', 'vulgate', 'VulgClementine.txt');
let src1412 = null;
{
  const lines = fs.readFileSync(CSRC, 'utf8').split('\n');
  let cur = null;
  for (const l of lines) {
    const h = l.match(/^###\s+(\S+)/);
    if (h) { cur = h[1].toLowerCase(); continue; }
    if (cur !== 'john') continue;
    const m = l.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (!m) continue;
    if (+m[1] === 14 && +m[2] === 12) {
      src1412 = m[3].replace(/[܀。]/g,'').replace(/\s*[.!?]\s*$/,'').trim();
      break;
    }
  }
}

if (!src1412) { console.error('ERROR: Clementine John 14:12 not found'); process.exit(1); }

// Strip the leading "alioquin propter opera ipsa credite" (end of 14:11)
// The correct 14:12 starts at "Amen"
const amenIdx = src1412.search(/\bAmen\b/i);
if (amenIdx === -1) { console.error('ERROR: Could not find Amen in Clementine[14:12]'); process.exit(1); }
const src1412correct = src1412.substring(amenIdx).trim();
console.log('Clementine[14:12] full:  ' + src1412.substring(0, 80));
console.log('Corrected 14:12 source:  ' + src1412correct.substring(0, 80));
console.log();

// ── Correct Vulgate text for 14:11 (sourced from critical edition, not Clementine file) ──
// Clementine Vulgate 14:11: "Credite mihi quia ego in Patre sum, et Pater in me est:
//   si autem non, propter opera ipsa credite."
const src1411 = 'Credite mihi quia ego in Patre et Pater in me est si autem non propter opera ipsa credite';

console.log('Source for 14:11: ' + src1411);
console.log();

fixVerse('john', 14, 11, src1411);
fixVerse('john', 14, 12, src1412correct);

console.log('\nDone — John 14:11-12 Vulgate corrected.');
