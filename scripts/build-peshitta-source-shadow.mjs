import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const APPLY = process.argv.includes('--apply');
const CERTIFY = process.argv.includes('--certify');
const ONLY_ARGUMENT = process.argv.find((argument) => argument.startsWith('--only='));
const ONLY_REFERENCES = ONLY_ARGUMENT ? new Set(ONLY_ARGUMENT.slice('--only='.length).split(',')) : null;
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const HEADINGS = { Matthew: 'matthew', Mark: 'mark', Luke: 'luke', John: 'john' };
const COLUMNS = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
const SOURCE_FILE = 'data/sources/peshitta/Peshitta.txt';
const SOURCE_SHA256 = '6E6E13089148E2D9809103F4B0BBB602D95086C28B37F44B086E800C5690651B';
const ENGLISH_LEDGER_FILE = path.join(ROOT, 'docs/audits/peshitta-row-english-adjudication.json');
const ENGLISH_ADJUDICATION_SHA256 = fs.existsSync(ENGLISH_LEDGER_FILE)
  ? JSON.parse(fs.readFileSync(ENGLISH_LEDGER_FILE, 'utf8')).adjudicationSha256
  : null;

function tokenize(value) {
  return value.normalize('NFC').replace(/[\p{P}\p{S}]+/gu, ' ').trim().split(/\s+/u).filter(Boolean);
}

function normalized(value) {
  return value.normalize('NFC');
}

function sedraNormalized(value) {
  return normalized(value).replaceAll('\u0724', '\u0723');
}

function multisetDifference(left, right) {
  const remaining = new Map();
  for (const token of right) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  const difference = [];
  for (const token of left) {
    const count = remaining.get(token) ?? 0;
    if (count > 0) remaining.set(token, count - 1);
    else difference.push(token);
  }
  return difference;
}

function classifyDifference(source, live) {
  const sourceNormalized = source.map(normalized);
  const liveNormalized = live.map(normalized);
  const sourceOnly = multisetDifference(sourceNormalized, liveNormalized);
  const displayOnly = multisetDifference(liveNormalized, sourceNormalized);
  const sedraExact = source.length === live.length && source.map(sedraNormalized).every((token, index) => token === sedraNormalized(live[index]));
  let classification = 'SUBSTITUTION_OR_MIXED';
  if (sedraExact) classification = 'SAMEKH_NORMALIZATION_ONLY';
  else if (sourceOnly.length === 0 && displayOnly.length === 0) classification = 'ORDER_ONLY';
  else if (sourceOnly.length > 0 && displayOnly.length === 0) classification = 'SOURCE_TOKENS_MISSING_FROM_DISPLAY';
  else if (sourceOnly.length === 0 && displayOnly.length > 0) classification = 'DISPLAY_TOKENS_ABSENT_FROM_SOURCE';
  return { classification, sourceOnly, displayOnly };
}

function sourceVerses() {
  const result = new Map();
  let gospel = null;
  let pending = null;

  function flush() {
    if (!pending) return;
    pending.tokens = tokenize(pending.physicalLines.join(' '));
    result.set(pending.reference, pending);
    pending = null;
  }

  for (const line of fs.readFileSync(path.join(ROOT, SOURCE_FILE), 'utf8').split(/\r?\n/u)) {
    const heading = line.match(/^###\s+(\S+)\s*$/u);
    if (heading) {
      flush();
      gospel = HEADINGS[heading[1]] ?? null;
      continue;
    }
    if (!gospel) continue;
    const match = line.match(/^\[(\d+):(\d+)\]\s*(.*)$/u);
    if (match) {
      flush();
      const chapter = Number(match[1]);
      const verse = Number(match[2]);
      pending = {
        reference: `${gospel} ${chapter}:${verse}`,
        sourceReference: `${gospel} ${chapter}:${verse}`,
        physicalLines: [match[3]],
      };
      continue;
    }
    if (pending && line.trim() && !line.startsWith('#')) pending.physicalLines.push(line.trim());
  }
  flush();

  // The upstream file embeds the modern Mark 9:50 verse number and text at
  // the end of its 9:49 line, followed by an empty [9:50] record. Preserve
  // every Syriac token while mapping that documented boundary to local files.
  const mark949 = result.get('mark 9:49');
  const mark950 = result.get('mark 9:50');
  const boundary = mark949?.tokens.indexOf('50') ?? -1;
  if (!mark949 || !mark950 || boundary < 0 || mark950.tokens.length !== 0) {
    throw new Error('Unexpected Peshitta Mark 9:49-50 source boundary');
  }
  mark949.tokens = mark949.tokens.slice(0, boundary);
  mark950.tokens = mark949.physicalLines.length > 0
    ? tokenize(mark949.physicalLines.join(' ')).slice(boundary + 1)
    : [];
  mark950.sourceReference = 'mark 9:49 (embedded marker 50)';
  // The upstream Mark 3:35 physical record continues after its verse
  // terminator with the gathered-crowd portion of Mark 4:1. Reassign that
  // suffix after the explicit Mark 4:1 clause without changing any token.
  const mark335 = result.get('mark 3:35');
  const mark41 = result.get('mark 4:1');
  const mark41Boundary = mark335?.tokens.indexOf('\u0718\u0710\u072c\u071f\u0722\u072b\u0718') ?? -1;
  if (!mark335 || !mark41 || mark41Boundary < 0) {
    throw new Error('Unexpected Peshitta Mark 3:35-4:1 source boundary');
  }
  const embeddedMark41 = mark335.tokens.slice(mark41Boundary);
  mark335.tokens = mark335.tokens.slice(0, mark41Boundary);
  mark41.tokens = [...mark41.tokens, ...embeddedMark41];
  mark41.sourceReference = 'mark 4:1 plus suffix embedded after mark 3:35 terminator';
  return result;
}

function displayedTokens(rows) {
  const result = [];
  rows.forEach((row, rowIndex) => {
    if (row.peshitta?.type !== 'text') return;
    tokenize(row.peshitta.text).forEach((text, tokenInCell) => result.push({
      text,
      normalized: normalized(text),
      rowIndex,
      tokenInCell,
      provenance: row.peshitta.provenance,
      cell: row.peshitta,
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

function certifiedCell(text, sourceReference, sourceToken, englishOverlay = null) {
  const cell = {
    type: 'text',
    text,
    provenance: {
      sourceId: 'peshitta-scrollmapper',
      sourceTitle: 'Peshitta New Testament (scrollmapper electronic text)',
      sourceReference,
      sourceToken,
      sourceFile: SOURCE_FILE,
      sourceSha256: SOURCE_SHA256,
      verification: 'source-token-order-verified',
    },
  };
  if (englishOverlay) {
    cell.gloss = structuredClone(englishOverlay.gloss);
    cell.provenance.englishAlignment = structuredClone(englishOverlay.englishAlignment);
  }
  return cell;
}

function rebuild(rows, source, displayReference, sourceReference) {
  const display = displayedTokens(rows);
  const englishBySourceToken = new Map(display
    .filter((item) => item.cell.gloss && ['internally-certified-row-phrase-alignment', 'adjudicated', 'no-certified-equivalent'].includes(item.provenance?.englishAlignment?.status))
    .map((item) => [item.provenance.sourceToken, { gloss: item.cell.gloss, englishAlignment: item.provenance.englishAlignment }]));
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
      const row = emptyRow(`peshitta-${displayReference.replace(/[ :]/gu, '-')}-source-${sourceIndex + 1}`);
      row.peshitta = certifiedCell(source[sourceIndex], sourceReference, sourceIndex + 1, englishBySourceToken.get(sourceIndex + 1));
      rebuilt.push(row);
    }
    if (rowIndex === rows.length) break;
    const row = structuredClone(rows[rowIndex]);
    const sourceIndex = assignments.get(rowIndex);
    row.peshitta = sourceIndex === undefined ? { type: 'empty' } : certifiedCell(source[sourceIndex], sourceReference, sourceIndex + 1, englishBySourceToken.get(sourceIndex + 1));
    rebuilt.push(row);
  }
  const actual = displayedTokens(rebuilt).map((item) => item.normalized);
  const expected = source.map(normalized);
  if (actual.length !== expected.length || actual.some((token, index) => token !== expected[index])) throw new Error(`Rebuild verification failed: ${displayReference}`);
  return { rows: rebuilt, inserted, anchors: anchors.length, previousDisplayed: display.length };
}

const sources = sourceVerses();
const ledger = [];
const totals = { sourceVerseRecords: sources.size, sourceTokens: 0, previousDisplayed: 0, finalDisplayed: 0, insertedRows: 0, reusedRows: 0, missingSourceVerse: 0, sourceOnlyVerse: 0, liveExactVerses: 0, liveMismatchedVerses: 0, displayOrderDifferences: 0, wrappedSourceVerses: 0, liveProvenanceFailures: 0, liveGlossCells: 0, liveEnglishAlignmentFailures: 0, liveInsertedRows: 0 };
const visited = new Set();
for (const source of sources.values()) if (source.physicalLines.length > 1) totals.wrappedSourceVerses += 1;

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
        totals.missingSourceVerse += 1;
        ledger.push({ reference, status: 'NO_MATCHING_SOURCE_VERSE' });
        continue;
      }
      visited.add(reference);
      if (ONLY_REFERENCES && !ONLY_REFERENCES.has(reference)) continue;
      const file = path.join(chapterDir, `${verse}.json`);
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      const liveItems = displayedTokens(document.rows);
      const live = liveItems.map((item) => item.normalized);
      const expected = sourceRecord.tokens.map(normalized);
      totals.liveGlossCells += document.rows.filter((row) => row.peshitta?.type === 'text' && row.peshitta.gloss).length;
      document.rows.filter((row) => row.peshitta?.type === 'text' && row.peshitta.gloss).forEach((row) => {
        const english = row.peshitta.provenance?.englishAlignment;
        if (row.peshitta.gloss.source !== 'Murdock' || !['adjudicated', 'no-certified-equivalent'].includes(english?.status) || !ENGLISH_ADJUDICATION_SHA256 || english.adjudicationSha256 !== ENGLISH_ADJUDICATION_SHA256) {
          totals.liveEnglishAlignmentFailures += 1;
        }
      });
      totals.liveInsertedRows += document.rows.filter((row) => row.id.startsWith('peshitta-') && row.peshitta?.type === 'text').length;
      const sourceOccurrences = new Set();
      liveItems.forEach((item) => {
        const provenance = item.provenance;
        const sourceToken = provenance?.sourceToken;
        const occurrenceValid = Number.isInteger(sourceToken)
          && sourceToken >= 1
          && sourceToken <= expected.length
          && item.normalized === expected[sourceToken - 1]
          && !sourceOccurrences.has(sourceToken);
        if (occurrenceValid) sourceOccurrences.add(sourceToken);
        if (item.tokenInCell !== 0 || provenance?.sourceFile !== SOURCE_FILE || provenance?.sourceSha256 !== SOURCE_SHA256 || provenance?.sourceReference !== sourceRecord.sourceReference || !occurrenceValid || provenance?.verification !== 'source-token-order-verified') {
          totals.liveProvenanceFailures += 1;
        }
      });
      const displayOrderExact = live.length === expected.length && live.every((token, index) => token === expected[index]);
      if (!displayOrderExact) totals.displayOrderDifferences += 1;
      const liveExact = liveItems.length === expected.length && sourceOccurrences.size === expected.length;
      if (liveExact) totals.liveExactVerses += 1;
      else totals.liveMismatchedVerses += 1;
      const structuralRows = document.rows.filter((row) => !(row.id.startsWith('peshitta-') && COLUMNS.filter((column) => column !== 'peshitta').every((column) => row[column]?.type === 'empty')));
      const result = rebuild(structuralRows, sourceRecord.tokens, reference, sourceRecord.sourceReference);
      const difference = liveExact ? { classification: displayOrderExact ? 'EXACT' : 'SEMANTIC_ROW_ORDER', sourceOnly: [], displayOnly: [] } : classifyDifference(sourceRecord.tokens, live);
      totals.sourceTokens += sourceRecord.tokens.length;
      totals.previousDisplayed += result.previousDisplayed;
      totals.finalDisplayed += sourceRecord.tokens.length;
      totals.insertedRows += result.inserted;
      totals.reusedRows += sourceRecord.tokens.length - result.inserted;
      ledger.push({ reference, sourceReference: sourceRecord.sourceReference, status: 'SOURCE_OCCURRENCES_VERIFIED', liveExact, displayOrderExact, classification: difference.classification, sourceTokens: sourceRecord.tokens.length, previousDisplayed: result.previousDisplayed, tokenCountDelta: sourceRecord.tokens.length - result.previousDisplayed, anchors: result.anchors, insertedRows: result.inserted, sourceOnlyCount: difference.sourceOnly.length, displayOnlyCount: difference.displayOnly.length, sourceOnlySample: difference.sourceOnly.slice(0, 12), displayOnlySample: difference.displayOnly.slice(0, 12), sourcePhysicalLines: sourceRecord.physicalLines.length });
      if (APPLY) {
        document.rows = result.rows;
        fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
      }
    }
  }
}

for (const reference of sources.keys()) {
  if (!visited.has(reference)) {
    totals.sourceOnlyVerse += 1;
    ledger.push({ reference, status: 'SOURCE_VERSE_WITHOUT_LOCAL_FILE' });
  }
}

const report = { generatedAt: new Date().toISOString(), mode: APPLY ? 'applied' : 'shadow', sourceFile: SOURCE_FILE, sourceSha256: SOURCE_SHA256, totals, decisions: ledger };
fs.mkdirSync(path.join(ROOT, 'docs/audits'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/peshitta-source-order-shadow.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(totals, null, 2));
if (!APPLY) console.log('Shadow only. Run with --apply only after reviewing the ledger.');
const englishLayerIncomplete = totals.liveGlossCells !== 0 && totals.liveGlossCells !== totals.sourceTokens;
const certificationFailed = totals.missingSourceVerse !== 0 || totals.sourceOnlyVerse !== 0 || totals.liveMismatchedVerses !== 0 || totals.finalDisplayed !== totals.sourceTokens || totals.liveProvenanceFailures !== 0 || englishLayerIncomplete || totals.liveEnglishAlignmentFailures !== 0;
if (CERTIFY) {
  const certification = {
    generatedAt: report.generatedAt,
    status: certificationFailed ? 'failed' : 'source-text-verified',
    scope: 'Pinned electronic Syriac text and occurrence provenance, plus validation (when present) of the separately adjudicated Murdock row-phrase layer.',
    source: { file: SOURCE_FILE, sha256: SOURCE_SHA256, upstreamCommit: 'ba07bc991644d82b24426b920245eb4422daa769' },
    totals,
    boundaryDecisions: [{ localReference: 'mark 9:50', sourceReference: 'mark 9:49 (embedded marker 50)', rule: 'Split the upstream embedded numeric marker without adding, removing, or changing Syriac tokens.' }],
    withheld: ['Proportional Etheridge/Murdock word glosses', 'Independent specialist review of internal row-phrase adjudication', 'Exact BFBS/Urmia/Lee exemplar identity'],
  };
  fs.writeFileSync(path.join(ROOT, 'docs/audits/peshitta-live-certification.json'), `${JSON.stringify(certification, null, 2)}\n`);
}
if (CERTIFY && certificationFailed) {
  console.error('Certification failed: the live Peshitta occurrences do not exactly match the governed source mapping.');
  process.exitCode = 1;
}
