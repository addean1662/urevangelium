import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');

const BOOKS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const hierarchy = ['vaticanus', 'sinaiticus', 'byzantine'];
const NOMINA = {
  ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν',
  χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
  κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω',
  θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
  πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
  υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ',
};
function greek(text = '') {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
  return NOMINA[value] ?? value;
}
function cellText(row, column) {
  const cell = row[column];
  return cell?.type === 'text' || cell?.type === 'extant' ? cell.text : null;
}

const sources = [];
const sourceDir = path.join(ROOT, 'data/sources/earliest-papyrus');
for (const file of fs.readdirSync(sourceDir).filter((name) => /^P\d+\.txt$/.test(name))) {
  const siglum = file === 'P64.txt' ? 'P64+P67' : file.slice(0, -4);
  for (const line of fs.readFileSync(path.join(sourceDir, file), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const prefix = line.match(/^(\d{2})(\d{3})(\d{3})\s/);
    if (!prefix || !BOOKS[Number(prefix[1])] || line.includes('[stub')) continue;
    const parsed = parseMesLine(line);
    const words = parsed.baseWords.filter((word) => word.presence !== 'absent').map((word, index) => ({
      sourceIndex: index,
      diplomatic: word.diplomatic,
      form: comparisonForm(word) || greek(word.diplomatic),
      conditioned: word.conditions.length > 0 || Boolean(word.supplied),
      conditions: word.conditions,
      supplied: word.supplied,
    }));
    if (words.length) sources.push({ siglum, gospel: BOOKS[Number(prefix[1])], chapter: Number(prefix[2]), verse: Number(prefix[3]), words });
  }
}

const totals = {
  verseWitnessSequences: sources.length,
  sourceTokens: 0,
  exactMappedTokens: 0,
  conditionedMappedTokens: 0,
  ambiguousRepeatedTokens: 0,
  semanticReviewTokens: 0,
  sequencesWithOrderInversion: 0,
  inversionClusters: 0,
  genuineAdditionsCertified: 0,
  coverageErrors: 0,
};
const sequences = [];

for (const source of sources) {
  const file = path.join(ROOT, 'data', source.gospel, String(source.chapter), `${source.verse}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const guide = data.rows.map((row, rowIndex) => {
    for (const column of hierarchy) {
      const text = cellText(row, column);
      if (text) return { rowId: row.id, rowIndex, column, text, form: greek(text) };
    }
    return { rowId: row.id, rowIndex, column: null, text: null, form: '' };
  });
  const operations = alignSequences(source.words.map((word) => word.form), guide.map((row) => row.form));
  const monotonic = new Map(operations.filter((op) => op.sourceIndex !== null && op.displayIndex !== null && source.words[op.sourceIndex].form === guide[op.displayIndex].form).map((op) => [op.sourceIndex, op.displayIndex]));
  const sourceFormCounts = new Map();
  for (const word of source.words) sourceFormCounts.set(word.form, (sourceFormCounts.get(word.form) ?? 0) + 1);
  const tokenDecisions = [];

  for (const word of source.words) {
    totals.sourceTokens++;
    const possible = guide.filter((row) => row.form && row.form === word.form);
    let target = null;
    let classification;
    if (possible.length === 1 && sourceFormCounts.get(word.form) === 1) {
      target = possible[0];
      classification = word.conditioned ? 'conditioned-unique-guide-row' : 'unique-guide-row';
      if (word.conditioned) totals.conditionedMappedTokens++; else totals.exactMappedTokens++;
    } else if (possible.length && monotonic.has(word.sourceIndex)) {
      target = guide[monotonic.get(word.sourceIndex)];
      classification = word.conditioned ? 'conditioned-contextual-guide-row' : 'contextual-repeated-guide-row';
      if (word.conditioned) totals.conditionedMappedTokens++; else totals.exactMappedTokens++;
    } else if (possible.length > 1) {
      classification = 'ambiguous-repeated-guide-form';
      totals.ambiguousRepeatedTokens++;
    } else {
      classification = possible.length === 1 ? 'source-repetition-review' : 'semantic-review-required';
      totals.semanticReviewTokens++;
    }
    tokenDecisions.push({ ...word, classification, targetRowId: target?.rowId ?? null, targetRowIndex: target?.rowIndex ?? null, guide: target ? { column: target.column, text: target.text } : null, possibleRowIds: target ? undefined : possible.map((row) => row.rowId) });
  }

  const mapped = tokenDecisions.filter((token) => token.targetRowIndex !== null);
  const clusters = [];
  let maximum = -1;
  for (const token of mapped) {
    if (token.targetRowIndex < maximum) {
      const previous = [...mapped].reverse().find((candidate) => candidate.sourceIndex < token.sourceIndex && candidate.targetRowIndex > token.targetRowIndex);
      clusters.push({ earlierSourceToken: previous?.sourceIndex ?? null, laterSourceToken: token.sourceIndex, earlierRow: previous?.targetRowId ?? null, laterRow: token.targetRowId });
    }
    maximum = Math.max(maximum, token.targetRowIndex);
  }
  if (clusters.length) {
    totals.sequencesWithOrderInversion++;
    totals.inversionClusters += clusters.length;
  }
  const covered = tokenDecisions.length;
  if (covered !== source.words.length || new Set(tokenDecisions.map((token) => token.sourceIndex)).size !== source.words.length) totals.coverageErrors++;
  sequences.push({ siglum: source.siglum, gospel: source.gospel, reference: `${source.chapter}:${source.verse}`, sourceTokenCount: source.words.length, mappedTokenCount: mapped.length, orderStatus: clusters.length ? 'candidate-transposition-review' : 'monotonic-among-mapped-tokens', inversionClusters: clusters, tokens: tokenDecisions });
}

const report = {
  status: 'read-only-complete-source-order-audit',
  generatedAt: new Date().toISOString(),
  method: 'Map every CNTR base-hand papyrus token to a Vaticanus-first row guide. Unique forms map directly; repeated forms require a monotonic contextual match. Row-index inversions are retained as candidate transpositions for review.',
  safeguards: ['Guide witnesses locate rows but never supply papyrus text.', 'Conditioned or supplied source tokens remain explicitly marked.', 'No surface mismatch is classified automatically as a genuine addition.', 'Every parsed source token is represented exactly once in this ledger.'],
  totals,
  sequences,
};
const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-source-order-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
const t = totals;
fs.writeFileSync(path.join(outDir, 'papyrus-source-order-audit.md'), [
  '# Papyrus Complete Source-Order Audit', '', `Generated: ${report.generatedAt}`, '', '**Read-only. No live Gospel data was modified.**', '', report.method, '',
  `- Verse/witness sequences: ${t.verseWitnessSequences}`,
  `- CNTR source tokens inventoried: ${t.sourceTokens}`,
  `- Unconditioned tokens mapped to guide rows: ${t.exactMappedTokens}`,
  `- Conditioned/supplied tokens mapped but held: ${t.conditionedMappedTokens}`,
  `- Repeated forms still ambiguous: ${t.ambiguousRepeatedTokens}`,
  `- Tokens requiring semantic review: ${t.semanticReviewTokens}`,
  `- Sequences containing row-order inversions: ${t.sequencesWithOrderInversion}`,
  `- Candidate inversion clusters: ${t.inversionClusters}`,
  `- Genuine additions certified automatically: ${t.genuineAdditionsCertified}`,
  `- Exactly-once coverage errors: ${t.coverageErrors}`, '',
  'An inversion is a candidate transposition, not a final textual judgment. It must be reviewed in the complete verse context before publication.', '',
].join('\n'));
console.log(JSON.stringify(totals, null, 2));
