import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');
const CERTIFY = process.argv.includes('--certify');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const FILES = { matthew: 'MAT.csv', mark: 'MAR.csv', luke: 'LUK.csv', john: 'JOH.csv' };
const COLUMNS = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
const SOURCE_COMMIT = '27a45ff1b7be6c17ccbfeac414f3f55732ae8e28';
const SOURCE_TAG = 'v3.3.2';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function tokenize(text) {
  return text.normalize('NFC')
    .replace(/^¶/u, '')
    .split(/\s+/u)
    .map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''))
    .filter(Boolean);
}

function normalized(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el').replace(/ς/gu, 'σ').replace(/[^α-ω]/gu, '');
}

function parseCsvLine(line) {
  const match = line.match(/^(\d+),(\d+),(.*)$/u);
  if (!match) return null;
  let text = match[3].trim();
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).replace(/""/gu, '"');
  return { chapter: Number(match[1]), verse: Number(match[2]), tokens: tokenize(text) };
}

function sourceCorpus() {
  const verses = new Map();
  const files = {};
  for (const gospel of GOSPELS) {
    const relative = `data/sources/byzantine/${FILES[gospel]}`;
    const file = path.join(ROOT, relative);
    files[gospel] = { file: relative, sha256: sha256(file) };
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
      const parsed = parseCsvLine(line);
      if (parsed) verses.set(`${gospel} ${parsed.chapter}:${parsed.verse}`, parsed.tokens);
    }
  }
  return { verses, files };
}

function displayedTokens(rows) {
  const result = [];
  rows.forEach((row, rowIndex) => {
    if (row.byzantine?.type !== 'text') return;
    tokenize(row.byzantine.text).forEach((text) => result.push({ text, normalized: normalized(text), rowIndex }));
  });
  return result;
}

function lcs(source, display) {
  const a = source.map(normalized);
  const b = display.map((item) => item.normalized);
  const matrix = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) {
    matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { pairs.push([i, j]); i += 1; j += 1; }
    else if (matrix[i + 1][j] >= matrix[i][j + 1]) i += 1;
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

function certifiedCell(text, reference, sourceToken, sourceFile, sourceSha256) {
  return {
    type: 'text',
    text,
    provenance: {
      sourceId: 'robinson-pierpont-2018',
      sourceTitle: 'The New Testament in the Original Greek: Byzantine Textform 2018',
      sourceReference: reference,
      sourceToken,
      sourceFile,
      sourceSha256,
      upstreamTag: SOURCE_TAG,
      upstreamCommit: SOURCE_COMMIT,
      verification: 'source-token-order-verified',
    },
  };
}

function rebuild(rows, source, reference, sourceFile, sourceSha256) {
  const display = displayedTokens(rows);
  const pairs = lcs(source, display);
  const anchors = [];
  const usedRows = new Set();
  for (const [sourceIndex, displayIndex] of pairs) {
    const rowIndex = display[displayIndex].rowIndex;
    if (!usedRows.has(rowIndex)) { anchors.push({ sourceIndex, rowIndex }); usedRows.add(rowIndex); }
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
      const row = emptyRow(`byzantine-${reference.replace(/[ :]/gu, '-')}-${insertionOrdinal}`);
      row.byzantine = certifiedCell(source[sourceIndex], reference, sourceIndex + 1, sourceFile, sourceSha256);
      rebuilt.push(row);
    }
    if (rowIndex === rows.length) break;
    const row = structuredClone(rows[rowIndex]);
    const sourceIndex = assignments.get(rowIndex);
    row.byzantine = sourceIndex === undefined ? { type: 'empty' } : certifiedCell(source[sourceIndex], reference, sourceIndex + 1, sourceFile, sourceSha256);
    rebuilt.push(row);
  }
  const actual = displayedTokens(rebuilt).map((item) => item.normalized);
  const expected = source.map(normalized);
  if (actual.length !== expected.length || actual.some((token, index) => token !== expected[index])) throw new Error(`Rebuild verification failed: ${reference}`);
  return { rows: rebuilt, inserted, anchors: anchors.length, previousDisplayed: display.length };
}

const corpus = sourceCorpus();
const decisions = [];
const totals = { sourceVerses: corpus.verses.size, siteVerses: 0, sourceTokens: 0, previousDisplayed: 0, finalDisplayed: 0, insertedRows: 0, reusedRows: 0, omittedSiteVerses: 0, liveExactVerses: 0, liveMismatchedVerses: 0 };

for (const gospel of GOSPELS) {
  const gospelDir = path.join(DATA, gospel);
  const chapters = fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name)).map((entry) => Number(entry.name)).sort((a, b) => a - b);
  for (const chapter of chapters) {
    const chapterDir = path.join(gospelDir, String(chapter));
    const verses = fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name)).map((name) => Number.parseInt(name, 10)).sort((a, b) => a - b);
    for (const verse of verses) {
      totals.siteVerses += 1;
      const reference = `${gospel} ${chapter}:${verse}`;
      const file = path.join(chapterDir, `${verse}.json`);
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      const source = corpus.verses.get(reference);
      if (!source) {
        const previousDisplayed = displayedTokens(document.rows).length;
        let omissionPlaced = false;
        document.rows = document.rows.map((row) => {
          if ((row.byzantine?.type === 'text' || row.byzantine?.type === 'omitted') && !omissionPlaced) {
            omissionPlaced = true;
            return { ...row, byzantine: { type: 'omitted', reason: `RP2018 has no ${reference} verse record` } };
          }
          return { ...row, byzantine: { type: 'empty' } };
        });
        if (!omissionPlaced && document.rows.length) document.rows[0].byzantine = { type: 'omitted', reason: `RP2018 has no ${reference} verse record` };
        totals.previousDisplayed += previousDisplayed;
        totals.omittedSiteVerses += 1;
        decisions.push({ reference, status: 'SOURCE_OMISSION', previousDisplayed });
        if (APPLY) fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
        continue;
      }
      const live = displayedTokens(document.rows).map((item) => item.normalized);
      const expected = source.map(normalized);
      const liveExact = live.length === expected.length && live.every((token, index) => token === expected[index]);
      if (liveExact) totals.liveExactVerses += 1; else totals.liveMismatchedVerses += 1;
      const sourceMeta = corpus.files[gospel];
      const result = rebuild(document.rows, source, reference, sourceMeta.file, sourceMeta.sha256);
      totals.sourceTokens += source.length;
      totals.previousDisplayed += result.previousDisplayed;
      totals.finalDisplayed += source.length;
      totals.insertedRows += result.inserted;
      totals.reusedRows += source.length - result.inserted;
      decisions.push({ reference, status: 'SOURCE_ORDER_REBUILT', liveExact, sourceTokens: source.length, previousDisplayed: result.previousDisplayed, anchors: result.anchors, insertedRows: result.inserted });
      if (APPLY) { document.rows = result.rows; fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`); }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'applied' : 'shadow',
  source: { edition: 'Robinson-Pierpont Byzantine Textform 2018', upstreamTag: SOURCE_TAG, upstreamCommit: SOURCE_COMMIT, files: corpus.files },
  policy: { textAuthority: 'RP2018 v3.3.2 only', alignmentAuthority: 'shared rows only', fallbackText: 'forbidden', english: 'not certified by this audit' },
  totals,
  decisions,
};
fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/byzantine-source-order-shadow.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(totals, null, 2));
if (!APPLY) console.log('Shadow only. Run with --apply after reviewing the ledger.');
if (CERTIFY && (!APPLY || totals.liveMismatchedVerses || totals.previousDisplayed !== totals.finalDisplayed)) process.exitCode = 1;
