import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('./coptic/parse-tt.js');
const { alignWords } = require('./coptic/align.js');

const APPLY = process.argv.includes('--apply');
const GOSPEL_ARG = process.argv.find((arg) => arg.startsWith('--gospel='));
const GOSPEL = GOSPEL_ARG?.split('=')[1] ?? 'john';
const JOHN_7_8_ONLY = GOSPEL === 'john' && !GOSPEL_ARG;
const PREFIX = { matthew: '40_Matthew', mark: '41_Mark', luke: '42_Luke', john: '43_John' }[GOSPEL];
if (!PREFIX) throw new Error(`Unsupported Gospel: ${GOSPEL}`);
const SOURCE_DIR = path.join(ROOT, 'data', 'sources', 'coptic-tt');
const SOURCE_FILES = fs.readdirSync(SOURCE_DIR).filter((name) => name.startsWith(PREFIX) && name.endsWith('.tt')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const source = new Map();
for (const sourceFile of SOURCE_FILES) {
  const sourceRaw = fs.readFileSync(path.join(SOURCE_DIR, sourceFile), 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(sourceRaw).digest('hex');
  const fileChapter = Number(sourceFile.match(/_(\d+)\.tt$/)?.[1]);
  let chapter = fileChapter;
  let passedSevenFiftyThree = false;
  for (const record of parseTTChapterSequence(sourceRaw)) {
    if (GOSPEL === 'john' && fileChapter === 7) {
      if (passedSevenFiftyThree) chapter = 8;
      else if (record.verse === 53) passedSevenFiftyThree = true;
    }
    if (record.words.length === 0) continue;
    record.words.sourceFile = sourceFile;
    record.words.sourceSha256 = sourceSha256;
    source.set(`${chapter}:${record.verse}`, record.words);
  }
}

function nextRowId(rows, token) {
  const base = `coptic-j${token}`;
  if (!rows.some((row) => row.id === base)) return base;
  let suffix = 2;
  while (rows.some((row) => row.id === `${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function preservedGlosses(rows) {
  const byText = new Map();
  for (const row of rows) {
    if (row.coptic?.type !== 'text' || !row.coptic.gloss) continue;
    const queue = byText.get(row.coptic.text) ?? [];
    queue.push(row.coptic.gloss);
    byText.set(row.coptic.text, queue);
  }
  return byText;
}

function takeGloss(byText, text) {
  const queue = byText.get(text);
  return queue?.shift();
}

function rebuildVerse(chapterNumber, verseNumber, words) {
  const file = path.join(ROOT, 'data', GOSPEL, String(chapterNumber), `${verseNumber}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing live verse file: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = data.rows;
  const certified = new Map();
  for (const row of rows) {
    const cell = row.coptic;
    const provenance = cell?.provenance;
    if (cell?.type === 'text' && provenance?.edition === 'Sahidica NT 4.1.0' &&
        provenance.sourceReference === `${GOSPEL} ${chapterNumber}:${verseNumber}` &&
        provenance.sourceSha256 === words.sourceSha256 && provenance.diplomatic === cell.text) {
      certified.set(provenance.sourceToken, cell.text);
    }
  }
  if (certified.size === words.length && words.every((word, index) => certified.get(index + 1) === word.text)) {
    return { sourceTokens: words.length, rows: rows.length, methodCounts: { 'existing-exact-provenance': words.length } };
  }
  const glosses = preservedGlosses(rows);
  const alignment = alignWords(words, rows);
  const placements = new Map();
  const assignedRows = new Set();

  for (const [rowId, assignment] of alignment) {
    const sourceIndex = words.indexOf(assignment.word);
    const row = rows.find((candidate) => candidate.id === rowId);
    if (sourceIndex >= 0 && row) {
      placements.set(sourceIndex, { row, confidence: assignment.confidence, method: assignment.method });
      assignedRows.add(row);
    }
  }

  for (let sourceIndex = 0; sourceIndex < words.length; sourceIndex++) {
    if (placements.has(sourceIndex)) continue;
    let previous = null;
    let following = null;
    for (let i = sourceIndex - 1; i >= 0; i--) if (placements.has(i)) { previous = placements.get(i).row; break; }
    for (let i = sourceIndex + 1; i < words.length; i++) if (placements.has(i)) { following = placements.get(i).row; break; }
    const previousIndex = previous ? rows.indexOf(previous) : -1;
    const followingIndex = following ? rows.indexOf(following) : rows.length;
    const available = rows.find((row, index) => !assignedRows.has(row) && index > previousIndex && index < followingIndex);
    if (available) {
      placements.set(sourceIndex, { row: available, confidence: 'low', method: 'source-order-open-row' });
      assignedRows.add(available);
      continue;
    }
    const row = { id: nextRowId(rows, sourceIndex + 1) };
    const insertAt = following ? rows.indexOf(following) : (previous ? rows.indexOf(previous) + 1 : rows.length);
    rows.splice(insertAt, 0, row);
    placements.set(sourceIndex, { row, confidence: 'low', method: 'source-order-new-row' });
    assignedRows.add(row);
  }

  for (const row of rows) {
    delete row.coptic;
    delete row._copticDraft;
  }

  const methodCounts = {};
  for (let sourceIndex = 0; sourceIndex < words.length; sourceIndex++) {
    const word = words[sourceIndex];
    const placement = placements.get(sourceIndex);
    if (!placement) throw new Error(`Unplaced source token John ${chapterNumber}:${verseNumber} #${sourceIndex + 1}`);
    const oldGloss = takeGloss(glosses, word.text);
    placement.row.coptic = {
      type: 'text',
      text: word.text,
      ...(oldGloss ? { gloss: oldGloss } : {}),
      provenance: {
        authority: 'Sahidica NT via Coptic SCRIPTORIUM',
        edition: 'Sahidica NT 4.1.0',
        versionDate: '2021-03-31',
        sourceFile: words.sourceFile,
        sourceReference: `${GOSPEL} ${chapterNumber}:${verseNumber}`,
        sourceToken: sourceIndex + 1,
        diplomatic: word.text,
        sourceSha256: words.sourceSha256,
        verification: 'exact-source-word-group',
        placementMethod: placement.method,
      },
    };
    if (placement.confidence !== 'high') placement.row._copticDraft = true;
    methodCounts[placement.method] = (methodCounts[placement.method] ?? 0) + 1;
  }

  for (const row of rows) if (!row.coptic) row.coptic = { type: 'empty' };
  if (APPLY) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return { sourceTokens: words.length, rows: rows.length, methodCounts };
}

function markOmitted(chapterNumber, verseNumber) {
  const file = path.join(ROOT, 'data', GOSPEL, String(chapterNumber), `${verseNumber}.json`);
  if (!fs.existsSync(file)) return { rows: 0 };
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const row of data.rows) {
    row.coptic = {
      type: 'omitted',
      provenance: {
        authority: 'Sahidica NT via Coptic SCRIPTORIUM',
        edition: 'Sahidica NT 4.1.0',
        versionDate: '2021-03-31',
        sourceFile: '43_John_07.tt',
        sourceReference: `${GOSPEL} ${chapterNumber}:${verseNumber}`,
        sourceSha256: source.get('7:52')?.sourceSha256,
        verification: 'no-source-word-group',
      },
    };
    delete row._copticDraft;
  }
  if (APPLY) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return { rows: data.rows.length };
}

const report = {
  status: APPLY ? 'applied' : 'dry-run',
  governingSource: 'Sahidica NT 4.1.0 via Coptic SCRIPTORIUM',
  gospel: GOSPEL,
  sourceFiles: SOURCE_FILES,
  rebuilt: {},
  omitted: {},
  totals: { sourceTokens: 0, versesRebuilt: 0, omittedVerses: 0, newRows: 0 },
};

for (const [reference, words] of source) {
  const [chapterNumber, verseNumber] = reference.split(':').map(Number);
  if (JOHN_7_8_ONLY && ![7, 8].includes(chapterNumber)) continue;
  const before = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', GOSPEL, String(chapterNumber), `${verseNumber}.json`), 'utf8')).rows.length;
  const result = rebuildVerse(chapterNumber, verseNumber, words);
  report.rebuilt[reference] = result;
  report.totals.sourceTokens += result.sourceTokens;
  report.totals.versesRebuilt++;
  report.totals.newRows += Math.max(0, result.rows - before);
}

for (const [chapterNumber, verses] of (GOSPEL === 'john' ? [[7, [53]], [8, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]] : [])) {
  for (const verseNumber of verses) {
    const result = markOmitted(chapterNumber, verseNumber);
    report.omitted[`${chapterNumber}:${verseNumber}`] = result;
    report.totals.omittedVerses++;
  }
}

const out = path.join(ROOT, 'docs', 'audits', `coptic-${GOSPEL}-source-repair.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.totals, null, 2));
