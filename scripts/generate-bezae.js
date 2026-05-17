// @ts-check
// scripts/generate-bezae.js
//
// Parses Bezae-Greek.xml and Bezae-Latin.xml (Cambridge/ITSEE, CC BY-NC-SA 3.0)
// and populates the 'bezae' field in each verse JSON.
//
// Alignment strategy:
//   Greek — normalized text match to existing Vaticanus rows.
//   Latin — Vulgate-anchored prefix match using already-aligned row data,
//            with proportional fallback for function words the traditions
//            express differently (autem vs ergo, etc.).
//
// Usage:
//   node scripts/generate-bezae.js                  # all four Gospels
//   node scripts/generate-bezae.js matthew          # one Gospel
//   node scripts/generate-bezae.js matthew 2        # one chapter
//   node scripts/generate-bezae.js matthew 2 1      # one verse (debug)

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const GREEK_XML = path.join(ROOT, 'data/sources/bezae/Bezae-Greek.xml');
const LATIN_XML = path.join(ROOT, 'data/sources/bezae/Bezae-Latin.xml');
const DATA_DIR  = path.join(ROOT, 'data');

// B-number → gospel name  (Bezae B01=Matthew, B02=Mark, B03=Luke, B04=John)
const BOOK_MAP = { '01': 'matthew', '02': 'mark', '03': 'luke', '04': 'john' };

// ── Normalization ─────────────────────────────────────────────────────────────

// Greek nomina sacra → normalized full form for matching against Vaticanus
const GREEK_NS_EXPAND = {
  // Jesus
  'ιηυ': 'ιησου', 'ιην': 'ιησουν', 'ιης': 'ιησους', 'ιη': 'ιησους',
  'ιν':  'ιησουν',
  // Lord
  'κυ':  'κυριου', 'κω': 'κυριω', 'κν': 'κυριον', 'κς': 'κυριος',
  // God
  'θυ':  'θεου', 'θω': 'θεω', 'θν': 'θεον', 'θσ': 'θεος',
  // Christ
  'χυ':  'χριστου', 'χω': 'χριστω', 'χν': 'χριστον', 'χσ': 'χριστος',
  // Spirit
  'πνσ': 'πνευματος', 'πνα': 'πνευματα', 'πνι': 'πνευματι',
  // Father
  'πρσ': 'πατηρ', 'πρα': 'πατερα', 'πρι': 'πατρι', 'πρς': 'πατρος',
  // Son
  'υσ':  'υιος', 'υν': 'υιον', 'υω': 'υιω', 'υυ': 'υιου',
  // David
  'δαδ': 'δαυιδ',
  // Israel
  'ιηλ': 'ισραηλ',
};

function normalizeGreek(s) {
  const base = s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining diacritics
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^α-ω]/g, '')
    .replace(/ει/g, 'ι');    // iotacism (ει=ι in Byzantine phonology)
  return GREEK_NS_EXPAND[base] ?? base;
}

/** Latin normalization for prefix-matching Bezae vs Vulgate.
 *  u↔v and j↔i are classical equivalents; strip leading 'h' before 'iero'
 *  so hierosolyma matches ierosolymam across traditions. */
function normLatin(s) {
  return s.toLowerCase()
    .replace(/^h(?=iero)/g, '')  // hierosolyma → ierosolyma
    .replace(/j/g, 'i')
    .replace(/u/g, 'v')
    .replace(/[^a-z]/g, '');
}

// Latin nomina sacra → expanded form for matching
const LATIN_NS_EXPAND = {
  'ihm': 'iesvm', 'ihs': 'iesvs', 'ihm': 'iesvm',
  'dnm': 'dominvm', 'dns': 'dominvs', 'dno': 'domino',
  'xpm': 'christvm', 'xps': 'christvs',
  'spm': 'spiritvmsanctvm',
};

function expandLatinNS(s) {
  const low = s.toLowerCase().replace(/[^a-z]/g, '');
  return LATIN_NS_EXPAND[low] ?? normLatin(s);
}

// ── XML parsing ───────────────────────────────────────────────────────────────
// Returns Map<verseRef, {n, text, line}[]>
// Each word carries the manuscript line it appeared on (0 = before first <lb>).

function parseXML(filepath) {
  const raw = fs.readFileSync(filepath, 'utf8');
  /** @type {Map<string, {n:number, text:string, line:number}[]>} */
  const verseMap = new Map();

  const abRe = /<ab\s+n="([^"]+)"[^>]*>([\s\S]*?)<\/ab>/g;
  let abM;
  while ((abM = abRe.exec(raw)) !== null) {
    const ref  = abM[1];
    const body = abM[2];
    const words = extractWords(body);
    if (!words.length) continue;
    if (verseMap.has(ref)) verseMap.get(ref).push(...words);
    else verseMap.set(ref, words);
  }
  return verseMap;
}

function extractWords(body) {
  // Handle <app> — keep only the first (original) reading
  const deAppped = body.replace(
    /<app[^>]*>([\s\S]*?)<\/app>/g,
    (_, inner) => {
      const first = inner.match(/<rdg[^>]*>([\s\S]*?)<\/rdg>/);
      return first ? first[1] : '';
    }
  );

  const words = [];
  let line = 0;

  // Walk tokens: <lb> elements update the current line; <w> elements yield words
  const tokenRe = /(<lb[^/]*?n="(\d+)"[^>]*\/>|<w\s+n="(\d+)"[^>]*>([\s\S]*?)<\/w>)/g;
  let m;
  while ((m = tokenRe.exec(deAppped)) !== null) {
    if (m[2] !== undefined) {
      line = parseInt(m[2], 10);
    } else if (m[3] !== undefined) {
      const text = m[4].replace(/<[^>]+>/g, '').trim();
      if (text) words.push({ n: parseInt(m[3], 10), text, line });
    }
  }
  return words;
}

// ── Reference → file coordinates ──────────────────────────────────────────────

function refToCoords(ref) {
  const m = ref.match(/^B(\d+)K(\d+)V(\d+)/);
  if (!m) return null;
  const gospel = BOOK_MAP[m[1]];
  if (!gospel) return null;
  return { gospel, chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10) };
}

// ── Greek alignment ───────────────────────────────────────────────────────────
// Map Bezae Greek word indices to row indices via normalized text matching.
// Scans forward to handle repeated words correctly.

function alignGreekToRows(bezWords, rows) {
  /** @type {Map<number, number>} wi → ri */
  const assignment = new Map();
  let rowCursor = 0;

  for (let wi = 0; wi < bezWords.length; wi++) {
    const normBez = normalizeGreek(bezWords[wi].text);
    if (!normBez) continue;

    let matched = false;
    for (let ri = rowCursor; ri < rows.length; ri++) {
      const vat = rows[ri].vaticanus;
      if (!vat || vat.type !== 'text') continue;
      if (normalizeGreek(vat.text) === normBez) {
        assignment.set(wi, ri);
        rowCursor = ri + 1;
        matched = true;
        break;
      }
    }

    // Prefix fallback: handles inflectional variants where one form is a
    // complete prefix of the other (e.g., ηρωδου vs ηρωδουσ).
    if (!matched && normBez.length >= 4) {
      for (let ri = rowCursor; ri < rows.length; ri++) {
        const vat = rows[ri].vaticanus;
        if (!vat || vat.type !== 'text') continue;
        const normVat = normalizeGreek(vat.text);
        const minLen = Math.min(normBez.length, normVat.length);
        if (minLen >= 4 && commonPrefixLen(normBez, normVat) >= minLen) {
          assignment.set(wi, ri);
          rowCursor = ri + 1;
          break;
        }
      }
    }
  }
  return assignment;
}

// ── Latin alignment ───────────────────────────────────────────────────────────
// Phase 1: anchor known words against Vulgate via prefix matching.
// Phase 2: proportionally fill remaining rows with unmatched words.

function commonPrefixLen(a, b) {
  let i = 0;
  const len = Math.min(a.length, b.length);
  while (i < len && a[i] === b[i]) i++;
  return i;
}

function alignLatinToRows(latWords, rows) {
  /** @type {Map<number, number>} */
  const assignment = new Map();
  const usedRows = new Set();

  // Phase 1: Vulgate-prefix anchoring
  // For each Bezae Latin word, find the row whose Vulgate word shares the
  // longest common prefix (≥4 chars, or full match for short words).
  for (let wi = 0; wi < latWords.length; wi++) {
    const normBez = expandLatinNS(latWords[wi].text);
    let bestRow = -1, bestCp = 0;

    for (let ri = 0; ri < rows.length; ri++) {
      if (usedRows.has(ri)) continue;
      const vul = rows[ri].vulgate;
      if (!vul || vul.type !== 'text') continue;
      const normVul = normLatin(vul.text);
      const cp = commonPrefixLen(normBez, normVul);
      const minLen = Math.min(normBez.length, normVul.length);
      const threshold = minLen <= 3 ? minLen : 3;
      if (cp >= threshold && cp > bestCp) {
        bestCp = cp;
        bestRow = ri;
      }
    }

    if (bestRow >= 0) {
      assignment.set(wi, bestRow);
      usedRows.add(bestRow);
    }
  }

  // Phase 2: proportional fallback for unmatched Latin words
  const unmatched = [];
  for (let wi = 0; wi < latWords.length; wi++) {
    if (!assignment.has(wi)) unmatched.push(wi);
  }

  if (unmatched.length > 0) {
    // Free rows: have Greek text but no Latin assigned yet
    const freeRows = rows
      .map((_, i) => i)
      .filter(i => !usedRows.has(i) && rows[i].vaticanus?.type === 'text');

    const W = unmatched.length;
    const R = freeRows.length;
    for (let k = 0; k < W && k < R; k++) {
      const ri = R === 1 ? freeRows[0]
        : freeRows[Math.round(k * (R - 1) / Math.max(W - 1, 1))];
      if (!usedRows.has(ri)) {
        assignment.set(unmatched[k], ri);
        usedRows.add(ri);
      }
    }
  }

  return assignment;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const [targetGospel, targetChStr, targetVerseStr] = process.argv.slice(2);
  const targetCh = targetChStr  ? parseInt(targetChStr, 10)  : null;
  const targetV  = targetVerseStr ? parseInt(targetVerseStr, 10) : null;

  console.log('Parsing Bezae XML…');
  const greekMap = parseXML(GREEK_XML);
  const latinMap = parseXML(LATIN_XML);
  console.log(`  Greek verse entries: ${greekMap.size}`);
  console.log(`  Latin verse entries: ${latinMap.size}`);

  let updated = 0, noJson = 0;

  for (const [ref, greekWords] of greekMap) {
    const coords = refToCoords(ref);
    if (!coords) continue;
    if (targetGospel && coords.gospel  !== targetGospel) continue;
    if (targetCh     && coords.chapter !== targetCh)     continue;
    if (targetV      && coords.verse   !== targetV)      continue;

    const jsonPath = path.join(
      DATA_DIR, coords.gospel, String(coords.chapter), `${coords.verse}.json`
    );
    if (!fs.existsSync(jsonPath)) { noJson++; continue; }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const { rows } = data;

    // Reset bezae field on every row
    for (const row of rows) row.bezae = { type: 'empty' };

    // --- Greek alignment ---
    const greekAlign = alignGreekToRows(greekWords, rows);
    for (const [wi, ri] of greekAlign) {
      rows[ri].bezae = { type: 'text', greek: greekWords[wi].text };
    }

    // --- Latin alignment ---
    const latWords = latinMap.get(ref) ?? [];
    if (latWords.length > 0) {
      const latAlign = alignLatinToRows(latWords, rows);
      for (const [wi, ri] of latAlign) {
        if (rows[ri].bezae?.type === 'text') {
          rows[ri].bezae.latin = latWords[wi].text;
        } else {
          rows[ri].bezae = { type: 'text', latin: latWords[wi].text };
        }
      }
    }

    // Debug output for single-verse runs
    if (targetGospel && targetCh && targetV) {
      console.log(`\n${coords.gospel} ${coords.chapter}:${coords.verse}`);
      for (const row of rows) {
        const vat = row.vaticanus?.type === 'text' ? row.vaticanus.text : '—';
        const bez = row.bezae;
        const g = bez?.type === 'text' ? (bez.greek ?? '—') : '[empty]';
        const l = bez?.type === 'text' ? (bez.latin ?? '—') : '[empty]';
        console.log(`  ${row.id.padEnd(4)} ${vat.padEnd(20)} gk:${g.padEnd(20)} la:${l}`);
      }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    updated++;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Updated   : ${updated}`);
  console.log(`  No JSON   : ${noJson}  (verse not yet populated)`);
  console.log(`${'─'.repeat(50)}`);
}

main();
