import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const BOOKS = ['matthew', 'mark', 'luke', 'john'];
const AUTHORITY = 'Henry Tompkins Anderson, 1918';
const SOURCE = 'Codex Sinaiticus Project public translation endpoint';
const OUT = path.join(ROOT, 'docs/audits/sinaiticus/anderson-alignment-certificate.json');

const boundaryOverrides = new Map([
  ['matthew 1:25', { from: 'matthew 1:24', start: 'and knew her not till she had brought forth a son; and he called his name Jesus.' }],
  ['matthew 15:8', { from: 'matthew 15:7', start: 'This people honors me with their lips, but their heart is far distant from me.' }],
  ['matthew 27:46', { from: 'matthew 27:45', start: 'And about the ninth hour Jesus cried with a loud voice, saying: Elei, Elei, lema sabachtha nei? that is, My God, my God, why hast thou forsaken me?', marker: '46 ' }],
  ['luke 2:30', { from: 'luke 2:29', start: 'for my eyes have seen thy salvation,', marker: '30 ' }],
  ['luke 4:2', { from: 'luke 4:1', start: 'forty days, tempted by the devil. And he ate nothing in those days, and when they were ended he was hungry.' }],
  ['john 14:7', { from: 'john 14:6', start: 'If you have known me, you shall know my Father also; and even now you know him and lave seen him.', marker: '7 ' }],
  ['john 20:14', { from: 'john 20:13', start: 'Having said these things, she turned back, and saw Jesus standing, and knew not that it was Jesus.' }],
]);

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function norm(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function tokenize(text = '') { return text.trim().split(/\s+/).filter(Boolean).map((display, index) => ({ index, display, normalized: norm(display) })); }
function versePath(book, chapter, verse) { return path.join(ROOT, 'data', book, String(chapter), `${verse}.json`); }
function key(book, chapter, verse) { return `${book} ${chapter}:${verse}`; }

const units = new Map();
for (const book of BOOKS) {
  const sourceFile = path.join(ROOT, 'data/sources/sinaiticus-english/anderson-1918', `${book}.json`);
  const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  for (const verse of source.verses) units.set(key(book, verse.chapter, verse.verse), { ...verse, book, sourceFile: path.relative(ROOT, sourceFile) });
}

// The official endpoint occasionally failed to emit a verse label. Split only
// at exact, pinned Anderson substrings. No wording is added, removed, or moved
// across any other boundary.
const boundaryLedger = [];
for (const [targetKey, override] of boundaryOverrides) {
  const parent = units.get(override.from);
  if (!parent) throw new Error(`${targetKey}: missing parent unit ${override.from}`);
  const needle = `${override.marker ?? ''}${override.start}`;
  const offset = parent.text.indexOf(needle);
  if (offset < 0) throw new Error(`${targetKey}: exact boundary substring not found in ${override.from}`);
  const target = targetKey.match(/^(\w+) (\d+):(\d+)$/);
  const prior = parent.text.slice(0, offset).trim();
  const moved = parent.text.slice(offset + (override.marker?.length ?? 0)).trim();
  if (!prior || moved !== override.start) throw new Error(`${targetKey}: boundary assertion failed`);
  parent.text = prior;
  units.set(targetKey, { ...parent, book: target[1], chapter: Number(target[2]), verse: Number(target[3]), text: moved, boundarySource: override.from });
  boundaryLedger.push({ target: targetKey, source: override.from, exactStart: override.start, removedPrintedMarker: override.marker ?? null });
}

function rowEvidence(row) {
  const values = [];
  for (const column of ['papyrus', 'coptic', 'vaticanus', 'vulgate', 'bezae', 'peshitta', 'byzantine']) {
    const gloss = row[column]?.gloss?.gloss;
    if (gloss) values.push(...tokenize(gloss).map(word => word.normalized));
  }
  return new Set(values.filter(Boolean));
}

function allocate(rows, words) {
  if (!words.length) return { owners: [], evidence: [] };
  if (!rows.length) return { owners: words.map(() => null), evidence: words.map(() => 'NO_GREEK_PARENT') };
  const capacity = rows.length * 3;
  const assignable = words.slice(0, capacity);
  const evidence = rows.map(({ row }) => rowEvidence(row));
  const states = rows.length * 3;
  const back = Array.from({ length: assignable.length }, () => new Int32Array(states).fill(-2));
  let previous = new Float64Array(states).fill(Number.POSITIVE_INFINITY);
  const cost = (wordIndex, rank) => {
    const expected = wordIndex / Math.max(1, assignable.length - 1) * Math.max(0, rows.length - 1);
    const exact = evidence[rank].has(assignable[wordIndex].normalized);
    const existsElsewhere = evidence.some((set) => set.has(assignable[wordIndex].normalized));
    return Math.abs(rank - expected) * 3 - (exact ? 100 : 0) + (!exact && existsElsewhere ? 20 : 0);
  };
  for (let rank = 0; rank < rows.length; rank++) previous[rank * 3] = cost(0, rank);
  for (let wordIndex = 1; wordIndex < assignable.length; wordIndex++) {
    const current = new Float64Array(states).fill(Number.POSITIVE_INFINITY);
    let prefixCost = Number.POSITIVE_INFINITY;
    let prefixState = -1;
    for (let rank = 0; rank < rows.length; rank++) {
      const base = rank * 3;
      const start = prefixCost + cost(wordIndex, rank);
      if (start < current[base]) { current[base] = start; back[wordIndex][base] = prefixState; }
      for (let count = 1; count < 3; count++) {
        const prior = base + count - 1;
        const candidate = previous[prior] + cost(wordIndex, rank);
        if (candidate < current[base + count]) { current[base + count] = candidate; back[wordIndex][base + count] = prior; }
      }
      for (let count = 0; count < 3; count++) {
        const state = base + count;
        if (previous[state] < prefixCost) { prefixCost = previous[state]; prefixState = state; }
      }
    }
    previous = current;
  }
  let state = 0;
  for (let candidate = 1; candidate < states; candidate++) if (previous[candidate] < previous[state]) state = candidate;
  const owners = Array(assignable.length);
  const statuses = Array(assignable.length);
  for (let wordIndex = assignable.length - 1; wordIndex >= 0; wordIndex--) {
    const rank = Math.floor(state / 3);
    owners[wordIndex] = rank;
    statuses[wordIndex] = evidence[rank].has(assignable[wordIndex].normalized) ? 'CROSS_TRADITION_EXACT_ENGLISH_ANCHOR' : 'ANDERSON_MONOTONIC_PHRASE_CONTEXT';
    state = back[wordIndex][state];
  }
  for (let i = capacity; i < words.length; i++) { owners.push(null); statuses.push('SUPPRESSED_NO_GREEK_PARENT'); }
  return { owners, evidence: statuses };
}

const pending = new Map();
const decisions = [];
const totals = { records: 0, sourcePresentRecords: 0, sourceAbsentRecords: 0, greekWords: 0, andersonWords: 0, assignedWords: 0, exactAnchorWords: 0, phraseContextWords: 0, expansionWords: 0, greekCellsWithEnglish: 0, greekCellsWithoutEnglish: 0, maxWordsPerGreekCell: 0, missingPublishedUnitsWithGreek: 0, failures: 0 };

for (const book of BOOKS) {
  const chapters = fs.readdirSync(path.join(ROOT, 'data', book), { withFileTypes: true }).filter(x => x.isDirectory() && /^\d+$/.test(x.name));
  for (const chapterDir of chapters) {
    const chapter = Number(chapterDir.name);
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', book, chapterDir.name)).filter(x => /^\d+\.json$/.test(x))) {
      const verse = Number(filename.slice(0, -5));
      const file = versePath(book, chapter, verse);
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      pending.set(file, document);
      totals.records++;
      document.rows = document.rows.filter(row => !String(row.id).startsWith('sinaiticus-english-'));
      const rows = document.rows.map((row, documentIndex) => ({ row, documentIndex })).filter(({ row }) => row.sinaiticus?.type === 'text').sort((a, b) => (a.row.sinaiticus.provenance?.sourceToken ?? a.documentIndex) - (b.row.sinaiticus.provenance?.sourceToken ?? b.documentIndex));
      totals.greekWords += rows.length;
      if (rows.length) totals.sourcePresentRecords++; else totals.sourceAbsentRecords++;
      const reference = key(book, chapter, verse);
      const unit = units.get(reference);
      const words = tokenize(unit?.text ?? '');
      if (rows.length && !unit) totals.missingPublishedUnitsWithGreek++;
      totals.andersonWords += words.length;
      const allocation = allocate(rows, words);
      const assigned = new Map(rows.map((_, index) => [index, []]));
      allocation.owners.forEach((owner, index) => { if (owner !== null) assigned.get(owner).push(index); });
      for (let rank = 0; rank < rows.length; rank++) {
        const indices = assigned.get(rank);
        const display = indices.map(index => words[index].display).join(' ');
        const cell = rows[rank].row.sinaiticus;
        cell.gloss = { gloss: display, source: 'Anderson', tooltip: display ? 'Henry T. Anderson 1918 · monotonic alignment to the GA 01 source sequence' : 'Henry T. Anderson 1918 · no English phrase assigned to this Greek word' };
        cell.provenance.englishAlignment = { authority: AUTHORITY, source: SOURCE, sourceReference: reference, scope: 'greek-parent-cell', englishIndices: indices, evidence: [...new Set(indices.map(index => allocation.evidence[index]))], status: display ? 'deterministically-aligned' : (unit ? 'no-phrase-assigned' : 'no-published-anderson-unit') };
        if (display) totals.greekCellsWithEnglish++; else totals.greekCellsWithoutEnglish++;
        totals.maxWordsPerGreekCell = Math.max(totals.maxWordsPerGreekCell, indices.length);
      }
      const suppressed = allocation.owners.flatMap((owner, index) => owner === null ? [{ englishIndex: index, english: words[index].display, reason: rows.length ? 'ANDERSON_WORDS_EXCEED_THREE_PER_EXTANT_GREEK_WORD' : 'NO_EXTANT_GA01_GREEK_IN_CANONICAL_VERSE' }] : []);
      totals.expansionWords += suppressed.length;
      totals.assignedWords += words.length - suppressed.length;
      totals.exactAnchorWords += allocation.evidence.filter(x => x === 'CROSS_TRADITION_EXACT_ENGLISH_ANCHOR').length;
      totals.phraseContextWords += allocation.evidence.filter(x => x === 'ANDERSON_MONOTONIC_PHRASE_CONTEXT').length;
      if (allocation.owners.length !== words.length || [...assigned.values()].some(x => x.length > 3)) totals.failures++;
      decisions.push({ reference, greekWords: rows.length, englishWords: words.length, publishedUnit: Boolean(unit), boundarySource: unit?.boundarySource ?? null, suppressedEnglishWords: suppressed });
    }
  }
}

const standard = 'The displayed English is verbatim Henry T. Anderson (1918), acquired from the Codex Sinaiticus Project endpoint. Exact source strings resolve seven missing printed verse labels without rewriting English. Within each canonical verse, a deterministic monotonic dynamic program assigns zero to three consecutive Anderson words to each GA 01 source word. Existing scholarly row glosses provide fixed exact-word anchors; all other ownership is explicitly phrase-context, not a claim of lexical equivalence. Anderson wording for a verse or clause absent from the certified GA 01 reading is recorded in the audit but suppressed from display, because English without a Greek parent would conceal the manuscript difference. AI translation, generated English, cross-verse spans, merged or continuation cells, arrows, and proportional multi-cell text spreading are prohibited. English absent from Anderson remains absent rather than being invented.';
const core = { standard, boundaryLedger, totals, decisions };
const decisionSha256 = sha256(JSON.stringify(core));
for (const document of pending.values()) for (const row of document.rows) if (row.sinaiticus?.provenance?.englishAlignment) row.sinaiticus.provenance.englishAlignment.decisionSha256 = decisionSha256;
const report = { status: totals.failures ? 'FAILED' : (APPLY ? 'APPLIED' : 'DRY_RUN'), generatedAt: new Date().toISOString(), authority: AUTHORITY, source: SOURCE, decisionSha256, standard, boundaryLedger, totals, decisions };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (APPLY && !totals.failures) for (const [file, document] of pending) fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, decisionSha256, totals, boundaryLedger }, null, 2));
