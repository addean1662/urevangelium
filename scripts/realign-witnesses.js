// @ts-check
// scripts/realign-witnesses.js
//
// Realigns Vulgate and Peshitta words to their semantically correct Greek
// rows using Strong's numbers from the TAGNT source file.
//
// Strategy:
//   - Greek definite articles (G3588) have no Latin or Syriac equivalent.
//     Those rows are skipped when assigning source words.
//   - Vulgate: enough words to fill most non-article rows, so assign
//     word-for-word to non-article rows in order.
//   - Peshitta: typically fewer words than non-article rows, so spread
//     proportionally across non-article rows.
//   - Only touches machine-generated distributions (top-loaded or
//     proportionally spread). Hand-curated patterns are left untouched.
//
// Usage:
//   node scripts/realign-witnesses.js            # all four Gospels
//   node scripts/realign-witnesses.js john       # one Gospel
//   node scripts/realign-witnesses.js john 18    # one chapter
//   node scripts/realign-witnesses.js john 18 31 # one verse

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAGNT_FILE = path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt');
const BOOK_MAP = { Mat: 'matthew', Mrk: 'mark', Luk: 'luke', Jhn: 'john' };

// G3588 = Greek definite article — no Latin or Syriac equivalent
const SKIP_STRONGS = new Set(['G3588']);

// ---------------------------------------------------------------------------
// Build TAGNT index: gospel → ch → verse → Strong's[] (one per row)
// ---------------------------------------------------------------------------

function buildTagntIndex() {
  const lines = fs.readFileSync(TAGNT_FILE, 'utf8').split('\n');
  /** @type {Map<string, Map<number, Map<number, string[]>>>} */
  const index = new Map();
  for (const gospel of Object.values(BOOK_MAP)) index.set(gospel, new Map());

  for (const line of lines) {
    const m = line.match(/^([A-Z][a-z]{2})\.(\d+)\.(\d+)#(\d+)/);
    if (!m) continue;
    const gospel = BOOK_MAP[m[1]];
    if (!gospel) continue;
    const ch = parseInt(m[2], 10);
    const v  = parseInt(m[3], 10);
    const cols    = line.split('\t');
    const strongs = (cols[3] || '').split('=')[0].trim();
    const gm = index.get(gospel);
    if (!gm.has(ch)) gm.set(ch, new Map());
    const cm = gm.get(ch);
    if (!cm.has(v)) cm.set(v, []);
    cm.get(v).push(strongs);
  }
  return index;
}

// ---------------------------------------------------------------------------
// Proportional target slots (reused from redistribute-peshitta.js)
// ---------------------------------------------------------------------------

function proportionalTargets(W, R) {
  if (W === 0) return [];
  if (W === 1) return [0];
  if (W >= R)  return Array.from({ length: R }, (_, i) => i);
  return Array.from({ length: W }, (_, i) => Math.round(i * (R - 1) / (W - 1)));
}

// ---------------------------------------------------------------------------
// Detect machine-generated distributions (safe to overwrite)
// Returns true if the witness words are in a top-loaded or proportional pattern.
// Hand-curated data (John 1) has irregular gaps and is not detected as machine.
// ---------------------------------------------------------------------------

function isMachineGenerated(rows, witness) {
  const W = rows.filter(r => r[witness]?.type === 'text').length;
  const R = rows.length;
  if (W === 0 || W >= R) return false;

  const actual = rows.map((r, i) => r[witness]?.type === 'text' ? i : -1).filter(i => i >= 0);

  // Top-loaded: words at rows 0..W-1
  const topLoaded = Array.from({ length: W }, (_, i) => i);
  if (actual.join(',') === topLoaded.join(',')) return true;

  // Proportionally distributed: words at Math.round(i*(R-1)/(W-1))
  const proportional = proportionalTargets(W, R);
  if (actual.join(',') === proportional.join(',')) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Realign one verse
// ---------------------------------------------------------------------------

function realign(data, tagntStrongs) {
  const { rows } = data;
  let changed = false;

  for (const witness of ['vulgate', 'peshitta']) {
    const glossSource = witness === 'vulgate' ? 'Whitaker' : 'PayneSmith';

    if (!isMachineGenerated(rows, witness)) continue;

    const words = rows
      .filter(r => r[witness]?.type === 'text')
      .map(r => r[witness].text);
    const W = words.length;
    if (W === 0) continue;

    // Slots = row indices where the Greek word is NOT a skipped function word
    const slots = rows.map((_, i) => i).filter(i => !SKIP_STRONGS.has(tagntStrongs[i] ?? ''));
    if (slots.length === 0) continue;

    // Clear all witness cells
    for (const row of rows) row[witness] = { type: 'empty' };

    if (W <= slots.length) {
      // Spread proportionally within non-article slots
      const targets = proportionalTargets(W, slots.length);
      for (let i = 0; i < W; i++) {
        const ri = slots[targets[i]];
        rows[ri][witness] = {
          type: 'text',
          text: words[i],
          gloss: { gloss: rows[ri].vaticanus?.gloss?.gloss ?? '', source: glossSource },
        };
      }
    } else {
      // More source words than non-article slots: fill slots, then overflow
      for (let i = 0; i < slots.length; i++) {
        const ri = slots[i];
        rows[ri][witness] = {
          type: 'text',
          text: words[i],
          gloss: { gloss: rows[ri].vaticanus?.gloss?.gloss ?? '', source: glossSource },
        };
      }
      let wi = slots.length;
      for (let ri = 0; ri < rows.length && wi < W; ri++) {
        if (rows[ri][witness]?.type === 'empty') {
          rows[ri][witness] = {
            type: 'text',
            text: words[wi++],
            gloss: { gloss: rows[ri].vaticanus?.gloss?.gloss ?? '', source: glossSource },
          };
        }
      }
    }

    changed = true;
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  process.stdout.write("Building TAGNT Strong's index... ");
  const tagntIndex = buildTagntIndex();
  console.log('done');

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let changed = 0, skipped = 0;

  for (const gospel of gospels) {
    if (targetGospel && gospel !== targetGospel) continue;
    const gospelDir = path.join(ROOT, 'data', gospel);
    if (!fs.existsSync(gospelDir)) continue;
    const gospelTagnt = tagntIndex.get(gospel);

    const chapters = fs.readdirSync(gospelDir)
      .map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

    for (const chapter of chapters) {
      if (targetChapter !== null && chapter !== targetChapter) continue;
      const chDir = path.join(gospelDir, String(chapter));
      const verseFiles = fs.readdirSync(chDir)
        .filter(f => /^\d+\.json$/.test(f))
        .map(f => ({ n: parseInt(f, 10), f }))
        .sort((a, b) => a.n - b.n);

      for (const { n, f } of verseFiles) {
        if (targetVerse !== null && n !== targetVerse) continue;
        const filepath = path.join(chDir, f);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const tagntStrongs = gospelTagnt?.get(chapter)?.get(n) ?? [];

        if (realign(data, tagntStrongs)) {
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
          changed++;
        } else {
          skipped++;
        }
      }
    }
    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Realigned : ${changed}`);
  console.log(`  Skipped   : ${skipped}  (hand-curated, fully covered, or no data)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
