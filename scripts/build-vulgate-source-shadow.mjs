import fs from 'node:fs';
import path from 'node:path';
import { loadClementineSequences } from '../lib/sources/clementineSequences.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');
const CERTIFY = process.argv.includes('--certify');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const COLUMNS = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];

function tokenize(value) {
  return value.normalize('NFC').replace(/[\p{P}\p{S}]+/gu, ' ').trim().split(/\s+/u).filter(Boolean);
}

function normalized(value) {
  return value.toLocaleLowerCase('la').replaceAll('j', 'i').replaceAll('v', 'u');
}


function displayedTokens(rows) {
  const result = [];
  rows.forEach((row, rowIndex) => {
    if (row.vulgate?.type !== 'text') return;
    tokenize(row.vulgate.text).forEach((text, tokenInCell) => result.push({
      text,
      normalized: normalized(text),
      rowIndex,
      tokenInCell,
    }));
  });
  return result;
}

function lcs(source, display) {
  const a = source.map(normalized);
  const b = display.map((item) => item.normalized);
  const matrix = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

function selectPositions(count, candidates) {
  if (count === 0) return [];
  if (count > candidates.length) return null;
  if (count === candidates.length) return candidates;
  const chosen = [];
  let minimum = 0;
  for (let i = 0; i < count; i += 1) {
    const ideal = Math.round(((i + 1) * (candidates.length + 1)) / (count + 1)) - 1;
    const index = Math.max(minimum, Math.min(ideal, candidates.length - (count - i)));
    chosen.push(candidates[index]);
    minimum = index + 1;
  }
  return chosen;
}

function emptyRow(id) {
  return { id, ...Object.fromEntries(COLUMNS.map((column) => [column, { type: 'empty' }])) };
}

function certifiedCell(text, sourceReference, sourceToken) {
  return {
    type: 'text',
    text,
    provenance: {
      sourceId: 'vulgate-clementine',
      sourceTitle: 'Biblia Sacra juxta Vulgatam Clementinam',
      sourceReference,
      sourceToken,
      sourceFile: 'data/sources/vulgate/VulgClementine.txt',
      sourceSha256: 'F2BCC2BF6C7CCEC7258AE096A200F9C685B783A9E0A656232365792EBEC028AC',
      verification: 'source-token-order-verified',
    },
  };
}

function rebuild(rows, source, displayReference, sourceReference) {
  const display = displayedTokens(rows);
  const pairs = lcs(source, display);
  const anchors = [];
  const usedRows = new Set();
  for (const [sourceIndex, displayIndex] of pairs) {
    const rowIndex = display[displayIndex].rowIndex;
    if (usedRows.has(rowIndex)) continue;
    anchors.push({ sourceIndex, rowIndex });
    usedRows.add(rowIndex);
  }

  const assignments = new Map();
  const insertBefore = new Map();
  let previousSource = -1;
  let previousRow = -1;
  const boundaries = [...anchors, { sourceIndex: source.length, rowIndex: rows.length }];
  let inserted = 0;

  for (const boundary of boundaries) {
    const sourceIndices = Array.from({ length: boundary.sourceIndex - previousSource - 1 }, (_, index) => previousSource + index + 1);
    const candidates = Array.from({ length: boundary.rowIndex - previousRow - 1 }, (_, index) => previousRow + index + 1);
    const positions = selectPositions(sourceIndices.length, candidates);
    if (positions) sourceIndices.forEach((sourceIndex, index) => assignments.set(positions[index], sourceIndex));
    else {
      candidates.forEach((rowIndex, index) => assignments.set(rowIndex, sourceIndices[index]));
      const overflow = sourceIndices.slice(candidates.length);
      insertBefore.set(boundary.rowIndex, overflow);
      inserted += overflow.length;
    }
    if (boundary.sourceIndex < source.length) assignments.set(boundary.rowIndex, boundary.sourceIndex);
    previousSource = boundary.sourceIndex;
    previousRow = boundary.rowIndex;
  }

  const rebuilt = [];
  let insertionOrdinal = 0;
  for (let rowIndex = 0; rowIndex <= rows.length; rowIndex += 1) {
    for (const sourceIndex of insertBefore.get(rowIndex) ?? []) {
      insertionOrdinal += 1;
      const row = emptyRow(`vulgate-${displayReference.replace(/[ :]/gu, '-')}-${insertionOrdinal}`);
      row.vulgate = certifiedCell(source[sourceIndex], sourceReference, sourceIndex + 1);
      rebuilt.push(row);
    }
    if (rowIndex === rows.length) break;
    const row = structuredClone(rows[rowIndex]);
    const sourceIndex = assignments.get(rowIndex);
    row.vulgate = sourceIndex === undefined ? { type: 'empty' } : certifiedCell(source[sourceIndex], sourceReference, sourceIndex + 1);
    rebuilt.push(row);
  }
  const actual = displayedTokens(rebuilt).map((item) => item.normalized);
  const expected = source.map(normalized);
  if (actual.length !== expected.length || actual.some((token, index) => token !== expected[index])) throw new Error(`Rebuild verification failed: ${displayReference}`);
  return { rows: rebuilt, inserted, anchors: anchors.length, previousDisplayed: display.length };
}

const sources = loadClementineSequences(DATA);
const ledger = [];
let sourceTokens = 0;
let previousDisplayed = 0;
let finalDisplayed = 0;
let insertedRows = 0;
let reusedRows = 0;
let missingSourceVerse = 0;
let liveExactVerses = 0;
let liveMismatchedVerses = 0;

for (const gospel of GOSPELS) {
  const gospelDir = path.join(DATA, gospel);
  const chapters = fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name)).map((entry) => Number(entry.name)).sort((a, b) => a - b);
  for (const chapter of chapters) {
    const chapterDir = path.join(gospelDir, String(chapter));
    const verses = fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name)).map((name) => Number.parseInt(name, 10)).sort((a, b) => a - b);
    for (const verse of verses) {
      const reference = `${gospel} ${chapter}:${verse}`;
      const sourceRecord = sources.get(reference);
      if (!sourceRecord || sourceRecord.tokens.length === 0) {
        missingSourceVerse += 1;
        ledger.push({ reference, status: 'NO_MATCHING_SOURCE_VERSE' });
        continue;
      }
      const file = path.join(chapterDir, `${verse}.json`);
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      const source = sourceRecord.tokens;
      const live = displayedTokens(document.rows).map((item) => item.normalized);
      const expected = source.map(normalized);
      const liveExact = live.length === expected.length && live.every((token, index) => token === expected[index]);
      if (liveExact) liveExactVerses += 1;
      else liveMismatchedVerses += 1;
      const result = rebuild(document.rows, source, reference, sourceRecord.sourceReference);
      sourceTokens += source.length;
      previousDisplayed += result.previousDisplayed;
      finalDisplayed += source.length;
      insertedRows += result.inserted;
      reusedRows += source.length - result.inserted;
      ledger.push({ reference, sourceReference: sourceRecord.sourceReference, status: 'SOURCE_ORDER_REBUILT', liveExact, sourceTokens: source.length, previousDisplayed: result.previousDisplayed, anchors: result.anchors, insertedRows: result.inserted });
      if (APPLY) {
        document.rows = result.rows;
        fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'applied' : 'shadow',
  sourceFile: 'data/sources/vulgate/VulgClementine.txt',
  sourceSha256: 'F2BCC2BF6C7CCEC7258AE096A200F9C685B783A9E0A656232365792EBEC028AC',
  totals: { sourceTokens, previousDisplayed, finalDisplayed, insertedRows, reusedRows, missingSourceVerse, liveExactVerses, liveMismatchedVerses },
  decisions: ledger,
};
fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/vulgate-source-order-shadow.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
if (!APPLY) console.log('Shadow only. Run with --apply after reviewing the ledger.');
if (CERTIFY && (missingSourceVerse !== 0 || liveMismatchedVerses !== 0 || previousDisplayed !== sourceTokens)) {
  console.error('Certification failed: the live Vulgate stream does not exactly match the governed source mapping.');
  process.exitCode = 1;
}
