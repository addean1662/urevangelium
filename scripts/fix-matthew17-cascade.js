'use strict';
// Fix the Matthew 17 Vulgate cascade:
//   The Clementine source combines NA28 17:14 and 17:15 into one verse [17:14],
//   causing every JSON verse 17:N (N=15..21) to carry Clementine[17:N] when it
//   should carry Clementine[17:N-1].  Verses 17:22-27 already have correct content.
//
//   Specific repairs:
//     17:14 → Clementine[17:14] first half (up to and including "dicens")
//     17:15 → Clementine[17:14] second half ("Domine, miserere filio meo…")
//     17:16 → Clementine[17:15]  (Et obtuli eum discipulis tuis…)
//     17:17 → Clementine[17:16]  (Respondens autem Jesus, ait: O generatio…)
//     17:18 → Clementine[17:17]  (Et increpavit illum Jesus…)
//     17:19 → Clementine[17:18]  (Tunc accesserunt discipuli ad Jesum secreto…)
//     17:20 → Clementine[17:19]  (Dixit illis Jesus: Propter incredulitatem…)
//     17:21 → Clementine[17:20]  (Hoc autem genus non ejicitur…)
const fs   = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const CSRC = path.join(BASE, 'sources', 'vulgate', 'VulgClementine.txt');

// ── Parse Clementine Matthew ch17 ────────────────────────────────────────────
const mat17 = {};
{
  const lines = fs.readFileSync(CSRC, 'utf8').split('\n');
  let cur = null;
  for (const l of lines) {
    const h = l.match(/^###\s+(\S+)/);
    if (h) { cur = h[1].toLowerCase(); continue; }
    if (cur !== 'matthew') continue;
    const m = l.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (!m) continue;
    if (+m[1] !== 17) continue;
    const v = +m[2];
    mat17[v] = m[3].replace(/[܀。]/g, '').replace(/\s*[.!?]\s*$/, '').trim();
  }
}

// ── Tokenizer (same as fix-mark9-cascade) ────────────────────────────────────
function tokenize(text) {
  return text.replace(/\s+/g, ' ').trim().split(' ')
    .map(t => t.replace(/^[,;:!?()\[\]]+$/, ''))
    .filter(Boolean);
}

// ── Greek article detection ───────────────────────────────────────────────────
function normG(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
const ARTS = new Set(['ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι']);
function isArticle(t) { return ARTS.has(normG(t)); }

function vatGloss(row) { return row.vaticanus?.gloss?.gloss || '?'; }

// ── Fix one verse with a given Latin source text ──────────────────────────────
function fixVerse(verse, srcText) {
  const fp = path.join(BASE, 'matthew', '17', verse + '.json');
  if (!fs.existsSync(fp)) { console.warn('  MISSING ' + fp); return; }
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

  for (const row of data.rows) row.vulgate = { type: 'empty' };

  if (!srcText) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log('  matthew 17:' + verse + ' → cleared (no source text)');
    return;
  }

  const tokens = tokenize(srcText);
  const contentRows = data.rows.filter(r => !isArticle(r.vaticanus?.text));

  if (contentRows.length === 0 || tokens.length === 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    return;
  }

  for (let i = 0; i < contentRows.length && i < tokens.length; i++) {
    const row = contentRows[i];
    const gl = vatGloss(row);
    let text = tokens[i];
    if (i === contentRows.length - 1 && tokens.length > contentRows.length) {
      text = tokens.slice(i).join(' ');
    }
    const displayText = text.replace(/[,;:!?]+$/, '') || text;
    row.vulgate = { type: 'text', text: displayText, gloss: { gloss: gl, source: 'Whitaker' } };
  }

  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  const assigned = Math.min(contentRows.length, tokens.length);
  console.log('  matthew 17:' + verse + ' → ' + tokens.length + ' tokens across ' + assigned + ' rows' +
    (tokens.length > contentRows.length ? ' (bundled overflow)' : ''));
}

// ── Split Clementine[17:14] at the "dicens" boundary ─────────────────────────
// Full text: "Et cum venisset ad turbam, accessit ad eum homo genibus provolutus
//   ante eum, dicens : Domine, miserere filio meo, quia lunaticus est…"
// v14 portion: everything through "dicens"
// v15 portion: "Domine, miserere filio meo…" onward
const raw14 = mat17[14] || '';
const dIdx  = raw14.indexOf('dicens');
let v14text, v15text;
if (dIdx !== -1) {
  v14text = raw14.substring(0, dIdx + 'dicens'.length).trim();
  // Strip trailing punctuation artefacts
  v15text = raw14.substring(dIdx + 'dicens'.length).replace(/^[\s:]+/, '').trim();
} else {
  // Fallback if split point not found
  v14text = raw14;
  v15text = null;
  console.warn('WARNING: could not split Clementine[17:14]; verse 17:15 will be cleared');
}

console.log('Split Clementine[17:14]:');
console.log('  v14 portion: ' + v14text.substring(0, 70));
console.log('  v15 portion: ' + (v15text || '(none)').substring(0, 70));
console.log();

// ── Apply fixes ───────────────────────────────────────────────────────────────
fixVerse(14, v14text);                // approach only
fixVerse(15, v15text);               // "Domine miserere filio meo…"
fixVerse(16, mat17[15] || null);     // Et obtuli eum discipulis tuis…
fixVerse(17, mat17[16] || null);     // Respondens autem Jesus, O generatio…
fixVerse(18, mat17[17] || null);     // Et increpavit illum Jesus…
fixVerse(19, mat17[18] || null);     // Tunc accesserunt discipuli…
fixVerse(20, mat17[19] || null);     // Dixit illis Jesus: Propter incredulitatem…
fixVerse(21, mat17[20] || null);     // Hoc autem genus non ejicitur…

console.log('\nDone — matthew 17:14-21 Vulgate realigned to correct Clementine verse.');
console.log('Verses 17:22-27 were already carrying correct content and were not touched.');
