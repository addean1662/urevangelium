// @ts-check
// scripts/generate-verses.js
// Greek-only first-pass generation of verse JSON files.
// Uses TAGNT as the word-by-word spine; Vulgate and Peshitta cells are
// set to {type:"empty"} and will be filled in a later pass.
//
// Usage:
//   node scripts/generate-verses.js                  # all 4 gospels
//   node scripts/generate-verses.js john             # one gospel
//   node scripts/generate-verses.js john 3           # one chapter
//   node scripts/generate-verses.js john 3 5         # one verse (debug)
//
// Skips files that already exist.

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── TAGNT ─────────────────────────────────────────────────────────────────

const TAGNT_BOOK = { matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn' };

/** @returns {Map<string, Array<{wordNum:number,greek:string,gloss:string,strong:string,spellingWH?:string,spellingByz?:string,inByz:boolean}>>} */
function loadTagnt() {
  const src = path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt');
  const map = new Map();

  for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
    const cols = line.split('\t');
    const ref  = cols[0]?.trim() ?? '';
    if (!ref || ref.startsWith('#') || !ref.includes('#')) continue;

    const hashIdx = ref.indexOf('#');
    const verseKey = ref.slice(0, hashIdx);         // "Jhn.1.1"
    const afterHash = ref.slice(hashIdx + 1);        // "01=NKO"
    const eqIdx = afterHash.indexOf('=');
    const wordNum = parseInt(eqIdx >= 0 ? afterHash.slice(0, eqIdx) : afterHash, 10);
    if (isNaN(wordNum)) continue;

    const greekRaw = cols[1]?.trim() ?? '';
    const parenIdx = greekRaw.indexOf(' (');
    const greek = parenIdx >= 0 ? greekRaw.slice(0, parenIdx) : greekRaw;
    if (!greek) continue;

    const gloss = (cols[2]?.trim() ?? '').replace(/\[|\]/g, '').replace(/\s+/g, ' ').trim();
    const strongGram = cols[3]?.trim() ?? '';
    const sgEq = strongGram.indexOf('=');
    const strong = sgEq >= 0 ? strongGram.slice(0, sgEq) : strongGram;
    const inByz = (cols[5]?.trim() ?? '').includes('Byz');

    let spellingWH, spellingByz;
    for (const part of (cols[7]?.trim() ?? '').split(';').map(s => s.trim()).filter(Boolean)) {
      const ci = part.indexOf(':');
      if (ci < 0) continue;
      const edStr = part.slice(0, ci).replace(/^\+/, '').trim();
      const form  = part.slice(ci + 1).trim();
      if (!form) continue;
      for (const ed of edStr.split('+').map(e => e.trim())) {
        if (ed === 'WH')              spellingWH  = form;
        if (ed === 'TR' || ed === 'Byz') spellingByz ??= form;
      }
    }

    if (!map.has(verseKey)) map.set(verseKey, []);
    map.get(verseKey).push({ wordNum, greek, gloss, strong, spellingWH, spellingByz, inByz });
  }

  return map;
}

// ── Coverage index ────────────────────────────────────────────────────────

function loadCoverage() {
  const src = path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json');
  const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

  // siglum -> date
  const meta = {};
  for (const p of raw.papyri) meta[p.siglum] = p.date;

  // byVerse: gospel -> chapter -> verse -> siglum[]
  return { byVerse: raw.byVerse, meta };
}

// ── Byzantine ─────────────────────────────────────────────────────────────

const BYZ_FILE = { matthew: 'MAT.csv', mark: 'MAR.csv', luke: 'LUK.csv', john: 'JOH.csv' };

/** @returns {Map<string, string[]>} "ch:v" -> word array */
function loadByzantine(gospel) {
  const src = path.join(ROOT, `data/sources/byzantine/${BYZ_FILE[gospel]}`);
  const map = new Map();
  for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('chapter')) continue;
    const c1 = t.indexOf(',');
    if (c1 < 0) continue;
    const ch   = t.slice(0, c1).trim();
    const rest = t.slice(c1 + 1);
    const c2   = rest.indexOf(',');
    if (c2 < 0) continue;
    const v       = rest.slice(0, c2).trim();
    const textRaw = rest.slice(c2 + 1).trim().replace(/^"|"$/g, '');
    const words = textRaw
      .split(/\s+/)
      .map(w => w.replace(/^¶/, '').replace(/[.,·;:!?…]+$/, '').replace(/^[„"([—\-]+/, '').trim())
      .filter(Boolean);
    if (words.length) map.set(`${ch}:${v}`, words);
  }
  return map;
}

// ── Verse builder ─────────────────────────────────────────────────────────

/**
 * Build a single verse JSON object.
 * Byzantine words are aligned positionally with TAGNT words.
 * When lengths differ, the TAGNT spellingByz form (or greek) is the fallback.
 */
function buildVerse(gospel, chapter, verse, tagntWords, byzWords, byVerse, papyrusMeta) {
  const sigla = byVerse[gospel]?.[chapter]?.[verse] ?? [];
  const fragments = sigla.map(s => ({ id: s, date: papyrusMeta[s] ?? 'date unknown' }));

  const rows = tagntWords.map((w, i) => {
    const papyrus = fragments.length > 0
      ? { type: 'extant', fragments, text: w.greek, gloss: { gloss: w.gloss, source: 'TAGNT' } }
      : { type: 'lost' };

    // Sinaiticus: use WH spelling when explicitly noted; otherwise NA28 form
    const sinaText = w.spellingWH ?? w.greek;

    // Byzantine: prefer positional match from Byzantine CSV; fall back to TAGNT encoding
    const byzFromCsv = byzWords[i];
    const byzText = byzFromCsv ?? w.spellingByz ?? w.greek;

    return {
      id: `r${i + 1}`,
      papyrus,
      vaticanus:  { type: 'text', text: w.greek,    gloss: { gloss: w.gloss, source: 'TAGNT' } },
      sinaiticus: { type: 'text', text: sinaText,   gloss: { gloss: w.gloss, source: 'TAGNT' } },
      vulgate:    { type: 'empty' },
      peshitta:   { type: 'empty' },
      byzantine:  { type: 'text', text: byzText,    gloss: { gloss: w.gloss, source: 'TAGNT' } },
    };
  });

  return { gospel, chapter, verse, rows };
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  const [targetGospel, targetChapterStr, targetVerseStr] = process.argv.slice(2);
  const targetChapter = targetChapterStr ? parseInt(targetChapterStr, 10) : null;
  const targetVerse   = targetVerseStr   ? parseInt(targetVerseStr, 10)   : null;

  process.stdout.write('Loading TAGNT... ');
  const tagnt = loadTagnt();
  console.log(`${tagnt.size} verse-keys`);

  process.stdout.write('Loading coverage index... ');
  const { byVerse, meta: papyrusMeta } = loadCoverage();
  console.log('done');

  const gospels = ['matthew', 'mark', 'luke', 'john'];
  let written = 0, skipped = 0;

  for (const gospel of gospels) {
    if (targetGospel && gospel !== targetGospel) continue;

    const bookCode = TAGNT_BOOK[gospel];
    const byzMap = loadByzantine(gospel);

    // Build chapter→verse list from TAGNT keys for this gospel
    /** @type {Map<number, number[]>} */
    const byChapter = new Map();
    for (const key of tagnt.keys()) {
      if (!key.startsWith(bookCode + '.')) continue;
      const parts = key.split('.');
      const ch = parseInt(parts[1], 10);
      const v  = parseInt(parts[2], 10);
      if (!byChapter.has(ch)) byChapter.set(ch, []);
      byChapter.get(ch).push(v);
    }

    const chapters = [...byChapter.keys()].sort((a, b) => a - b);
    console.log(`\n${gospel}: ${chapters.length} chapters`);

    for (const chapter of chapters) {
      if (targetChapter !== null && chapter !== targetChapter) continue;

      const verses = [...new Set(byChapter.get(chapter))].sort((a, b) => a - b);

      for (const verse of verses) {
        if (targetVerse !== null && verse !== targetVerse) continue;

        const outPath = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);

        if (fs.existsSync(outPath)) { skipped++; continue; }

        const tagntWords = tagnt.get(`${bookCode}.${chapter}.${verse}`) ?? [];
        if (tagntWords.length === 0) continue;

        const byzWords = byzMap.get(`${chapter}:${verse}`) ?? [];
        const verseData = buildVerse(gospel, chapter, verse, tagntWords, byzWords, byVerse, papyrusMeta);

        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(verseData, null, 2), 'utf-8');
        written++;

        if (written % 200 === 0) process.stdout.write(`\r  ${gospel} ${chapter}: ${written} written...`);
      }
    }

    console.log(`  ${gospel}: done`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Written : ${written}`);
  console.log(`  Skipped : ${skipped} (already existed)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
