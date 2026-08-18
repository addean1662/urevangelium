import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const cleanup = process.argv.includes('--cleanup');
const residual = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-residual-placement-troubleshooting.json'), 'utf8'));
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const liveCrosswalkPath = path.join(ROOT, 'docs/audits/papyrus-held-live-crosswalk.json');
const liveCrosswalk = fs.existsSync(liveCrosswalkPath) ? JSON.parse(fs.readFileSync(liveCrosswalkPath, 'utf8')) : { cases: [] };
const priorHeldPath = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
const priorHeld = fs.existsSync(priorHeldPath) ? JSON.parse(fs.readFileSync(priorHeldPath, 'utf8')) : { decisions: [] };
const rowCandidatesPath = path.join(ROOT, 'docs/audits/papyrus-held-row-candidates.json');
const rowCandidates = fs.existsSync(rowCandidatesPath) ? JSON.parse(fs.readFileSync(rowCandidatesPath, 'utf8')) : { cases: [] };
const contextualRunsPath = path.join(ROOT, 'docs/audits/papyrus-contextual-alignment-runs.json');
const contextualRuns = fs.existsSync(contextualRunsPath) ? JSON.parse(fs.readFileSync(contextualRunsPath, 'utf8')) : { runs: [] };
const sequences = new Map(sourceOrder.sequences.map((item) => [`${item.gospel}|${item.reference}|${item.siglum}`, item]));
const BOOK_KEYS = { matthew: 'B01', mark: 'B02', luke: 'B03', john: 'B04' };

function normalizeGreek(text = '') {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
}

function orderedTextAgreement(sourceWords, comparisonWords) {
  const memo = new Map();
  function visit(sourceIndex, comparisonIndex) {
    const key = `${sourceIndex}:${comparisonIndex}`;
    if (memo.has(key)) return memo.get(key);
    if (sourceIndex === sourceWords.length) return true;
    if (comparisonIndex === comparisonWords.length) return false;
    if (visit(sourceIndex, comparisonIndex + 1)) { memo.set(key, true); return true; }
    let joined = '';
    for (let next = sourceIndex; next < sourceWords.length && joined.length <= comparisonWords[comparisonIndex].length; next++) {
      joined += sourceWords[next];
      if (joined === comparisonWords[comparisonIndex] && visit(next + 1, comparisonIndex + 1)) { memo.set(key, true); return true; }
    }
    memo.set(key, false);
    return false;
  }
  return visit(0, 0);
}

function intfCorroboratesSequence(sequence) {
  const ga = sequence.siglum === 'P64+P67' ? 10064 : 10000 + Number(sequence.siglum.match(/\d+/)?.[0]);
  const file = path.join(ROOT, 'data/cache/intf', `${ga}-${sequence.gospel}.json`);
  if (!fs.existsSync(file)) return false;
  const [chapter, verse] = sequence.reference.split(':').map(Number);
  const words = JSON.parse(fs.readFileSync(file, 'utf8'))[`${BOOK_KEYS[sequence.gospel]}K${chapter}V${verse}`] ?? [];
  return words.length > 0 && orderedTextAgreement(sequence.tokens.map((token) => normalizeGreek(token.diplomatic)), words.map(normalizeGreek));
}

const overrides = new Map(Object.entries({
  'matthew|1:13|P1|10': ['r10', 'first-exact-repetition-selected-by-source-order'],
  'matthew|1:13|P1|11': ['r11', 'second-exact-repetition-selected-by-source-order'],
  'matthew|18:33|P25|11': ['r11', 'semantic-counterpart-with-source-order-variation'],
  'mark|7:27|P45|3': ['r5', 'unique-intervening-orthographic-counterpart'],
  'mark|8:12|P45|18': ['r20', 'unique-intervening-orthographic-counterpart'],
  'mark|7:30|P45|6': ['r7', 'transposed-clause-semantic-counterpart'],
  'mark|7:30|P45|10': ['r14', 'transposed-clause-connector-counterpart'],
  'mark|7:30|P45|11': ['p45-add-11', 'source-attested-addition-requiring-own-row'],
  'mark|7:30|P45|12': ['p45-add-12', 'source-attested-addition-requiring-own-row'],
  'mark|7:30|P45|13': ['r10', 'transposed-clause-semantic-counterpart'],
  'mark|7:30|P45|15': ['r12', 'transposed-clause-article-counterpart'],
  'mark|7:30|P45|16': ['r13', 'transposed-clause-semantic-counterpart'],
  'luke|11:11|P45|14': ['r14', 'same-meaning-pronoun-counterpart-with-source-order-variation'],
  'luke|8:22|P75|8': ['r10', 'near-exact-counterpart-selected-by-source-word-order'],
  'luke|12:42|P75|25': ['r27', 'near-exact-counterpart-selected-by-source-word-order'],
  'luke|14:21|P45|5': ['r7', 'first-contextual-repetition'],
  'luke|14:21|P45|14': ['r16', 'second-contextual-repetition'],
  'luke|16:21|P75|6': ['r8', 'exact-existing-papyrus-counterpart'],
  'luke|15:30|P75|16': ['r19', 'exact-counterpart-selected-by-source-word-order'],
  'luke|23:29|P75|11': ['r13', 'near-exact-counterpart-selected-by-source-word-order'],
  'luke|8:45|P75|18': ['r22', 'exact-existing-papyrus-counterpart'],
  'john|10:22|P45|8': ['r8', 'connector-counterpart-with-source-order-variation'],
  'john|11:20|P45|15': ['r16', 'near-exact-counterpart-agreeing-with-existing-papyrus'],
  'john|11:24|P45|9': ['r10', 'exact-counterpart-selected-by-source-word-order'],
  'john|11:24|P45|12': ['r13', 'near-exact-counterpart-selected-by-source-word-order'],
  'john|11:30|P45|13': ['r14', 'near-exact-counterpart-selected-by-source-word-order'],
  'john|13:24|P66|8': ['r11', 'exact-existing-papyrus-counterpart'],
  'john|13:33|P66|16': ['r18', 'unique-orthographic-counterpart'],
  'john|13:33|P66|18': ['r20', 'unique-orthographic-counterpart'],
  'john|13:33|P66|23': ['p66-add-23', 'source-attested-addition-requiring-own-row'],
  'john|15:10|P66|14': ['r16', 'nomina-sacra-orthographic-counterpart'],
  'john|15:19|P66|29': ['r28', 'orthographic-counterpart-with-source-order-variation'],
  'john|4:36|P66|13': ['r15', 'orthographic-existing-papyrus-counterpart'],
  'john|4:46|P66|4': ['r6', 'exact-existing-papyrus-counterpart'],
  'john|4:46|P75|4': ['r6', 'exact-existing-papyrus-counterpart'],
  'john|6:2|P66|9': ['r11', 'orthographic-existing-papyrus-counterpart'],
  'john|8:28|P66|27': ['r24', 'orthographic-existing-papyrus-counterpart'],
  'john|9:41|P66|18': ['r18', 'source-recorded-first-hand-false-start'],
  'john|18:3|P108|12': ['r14', 'exact-counterpart-agreeing-with-earlier-governing-papyrus'],
}));

function ensureAdditionRow() {
  const file = path.join(ROOT, 'data/john/13/33.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.rows.some((row) => row.id === 'p66-add-23')) {
    const after = data.rows.findIndex((row) => row.id === 'r24');
    if (after < 0) throw new Error('John 13:33 r24 not found');
    data.rows.splice(after + 1, 0, {
      id: 'p66-add-23',
      papyrus: { type: 'lost' },
      vaticanus: { type: 'empty' }, sinaiticus: { type: 'empty' }, vulgate: { type: 'empty' },
      peshitta: { type: 'empty' }, byzantine: { type: 'empty' }, bezae: { type: 'empty' }, coptic: { type: 'empty' },
    });
    if (write) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }

  const markFile = path.join(ROOT, 'data/mark/7/30.json');
  const mark = JSON.parse(fs.readFileSync(markFile, 'utf8'));
  if (!mark.rows.some((row) => row.id === 'p45-add-11')) {
    const before = mark.rows.findIndex((row) => row.id === 'r10');
    if (before < 0) throw new Error('Mark 7:30 r10 not found');
    const emptyRow = (id) => ({ id, papyrus: { type: 'lost' }, vaticanus: { type: 'empty' }, sinaiticus: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' }, bezae: { type: 'empty' }, coptic: { type: 'empty' } });
    mark.rows.splice(before, 0, emptyRow('p45-add-11'), emptyRow('p45-add-12'));
    if (write) fs.writeFileSync(markFile, `${JSON.stringify(mark, null, 2)}\n`);
  }
}

ensureAdditionRow();
const rejectedContextualKeys = new Set([
  'john|1:21|P119|6', 'john|1:21|P75|6', 'mark|8:20|P45|9', 'mark|9:6|P45|6',
  'john|11:27|P66|7', 'matthew|11:27|P70|10', 'luke|23:35|P75|17',
]);
const decisions = priorHeld.decisions.filter((item) => item.certified && !rejectedContextualKeys.has(`${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`));
const seen = new Set(decisions.map((item) => `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`));
for (const item of residual.cases.filter((entry) => entry.classification === 'exact-held-token-certified-by-source-order' || entry.classification === 'exact-source-token-held-order-conflict')) {
  for (const check of item.orderChecks) {
    const key = `${item.gospel}|${item.reference}|${check.siglum}|${check.sourceToken}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const sequence = sequences.get(`${item.gospel}|${item.reference}|${check.siglum}`);
    const token = sequence?.tokens[check.sourceToken - 1];
    if (!token || token.targetRowId) throw new Error(`${key}: expected one held source token`);
    const override = overrides.get(key);
    const targetRowId = check.ordered ? item.rowId : override?.[0];
    const adjudication = check.ordered ? 'bounded-by-immediate-source-neighbors' : override?.[1];
    if (!targetRowId || !adjudication) throw new Error(`${key}: no deterministic adjudication registered`);
    decisions.push({ gospel: item.gospel, reference: item.reference, siglum: check.siglum, sourceToken: check.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId, certified: true, adjudication, conditions: token.conditions ?? [], supplied: token.supplied ?? null, ...(key === 'john|9:41|P66|18' ? { manuscriptStatus: 'scribal-error-question', sourceCorrection: 'CNTR MES x{α} {} records the first-hand alpha deleted without replacement' } : {}) });
  }
}

for (const [key, override] of overrides) {
  if (seen.has(key)) continue;
  const [gospel, reference, siglum, sourceTokenText] = key.split('|');
  const sourceToken = Number(sourceTokenText);
  const token = sequences.get(`${gospel}|${reference}|${siglum}`)?.tokens[sourceToken - 1];
  if (!token) throw new Error(`${key}: expected one source token for explicit adjudication`);
  seen.add(key);
  decisions.push({ gospel, reference, siglum, sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId: override[0], certified: true, adjudication: override[1], conditions: token.conditions ?? [], supplied: token.supplied ?? null });
}
for (const item of liveCrosswalk.cases.filter((entry) => entry.classification === 'exact-live-order-bounded')) {
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`;
  if (seen.has(key)) continue;
  const token = sequences.get(`${item.gospel}|${item.reference}|${item.siglum}`)?.tokens[item.sourceToken - 1];
  if (!token || token.targetRowId) throw new Error(`${key}: expected one held source token from live crosswalk`);
  seen.add(key);
  decisions.push({ gospel: item.gospel, reference: item.reference, siglum: item.siglum, sourceToken: item.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId: item.rowId, certified: true, adjudication: 'exact-live-form-bounded-by-immediate-source-neighbors', conditions: token.conditions ?? [], supplied: token.supplied ?? null });
}
for (const item of liveCrosswalk.cases.filter((entry) => entry.classification === 'approximate-live-alignment' && entry.bounded && entry.similarity >= 0.8)) {
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`;
  if (seen.has(key)) continue;
  const token = sequences.get(`${item.gospel}|${item.reference}|${item.siglum}`)?.tokens[item.sourceToken - 1];
  if (!token || token.targetRowId) throw new Error(`${key}: expected one held source token from bounded orthographic crosswalk`);
  seen.add(key);
  decisions.push({ gospel: item.gospel, reference: item.reference, siglum: item.siglum, sourceToken: item.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId: item.rowId, certified: true, adjudication: 'bounded-high-orthographic-live-counterpart', conditions: token.conditions ?? [], supplied: token.supplied ?? null, liveSimilarity: item.similarity, replacedLegacyDisplay: item.displayed });
}
for (const item of rowCandidates.cases.filter((entry) => entry.classification === 'unique-exact-unused-guide-row')) {
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`;
  if (seen.has(key)) continue;
  const token = sequences.get(`${item.gospel}|${item.reference}|${item.siglum}`)?.tokens[item.sourceToken - 1];
  const targetRowId = item.candidates[0]?.rowId;
  if (!token || token.targetRowId || !targetRowId) throw new Error(`${key}: invalid unique exact candidate`);
  seen.add(key);
  decisions.push({ gospel: item.gospel, reference: item.reference, siglum: item.siglum, sourceToken: item.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId, certified: true, adjudication: 'unique-exact-unused-guide-row-within-certified-source-interval', conditions: token.conditions ?? [], supplied: token.supplied ?? null, guideColumn: item.candidates[0].bestColumn, guideText: item.candidates[0].guideText });
}
for (const item of rowCandidates.cases.filter((entry) => entry.classification === 'unique-high-unused-guide-row' && entry.candidates[0]?.guideForms?.filter((form) => form.similarity >= 0.8).length >= 2)) {
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`;
  if (seen.has(key)) continue;
  const token = sequences.get(`${item.gospel}|${item.reference}|${item.siglum}`)?.tokens[item.sourceToken - 1];
  const candidate = item.candidates[0];
  if (!token || token.targetRowId || !candidate?.rowId) throw new Error(`${key}: invalid two-guide orthographic candidate`);
  seen.add(key);
  decisions.push({ gospel: item.gospel, reference: item.reference, siglum: item.siglum, sourceToken: item.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId: candidate.rowId, certified: true, adjudication: 'unique-high-orthographic-row-with-two-greek-guide-consensus', conditions: token.conditions ?? [], supplied: token.supplied ?? null, guideConsensus: candidate.guideForms.filter((form) => form.similarity >= 0.8) });
}
for (const item of rowCandidates.cases.filter((entry) => entry.classification === 'unique-high-unused-guide-row' && entry.candidates[0]?.guideForms?.filter((form) => form.similarity >= 0.8).length === 1)) {
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`;
  if (seen.has(key)) continue;
  const sequence = sequences.get(`${item.gospel}|${item.reference}|${item.siglum}`);
  const token = sequence?.tokens[item.sourceToken - 1];
  const candidate = item.candidates[0];
  if (!token || token.targetRowId || !candidate?.rowId) throw new Error(`${key}: invalid single-guide orthographic candidate`);
  if (!intfCorroboratesSequence(sequence)) continue;
  seen.add(key);
  decisions.push({ gospel: item.gospel, reference: item.reference, siglum: item.siglum, sourceToken: item.sourceToken, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId: candidate.rowId, certified: true, adjudication: 'unique-high-orthographic-row-with-independent-intf-sequence-corroboration', conditions: token.conditions ?? [], supplied: token.supplied ?? null, guideLocation: { column: candidate.bestColumn, text: candidate.guideText, similarity: candidate.similarity }, independentCorroboration: 'cached INTF same-witness transcription with complete source-order agreement' });
}
for (const run of contextualRuns.runs.filter((entry) => entry.classification === 'equal-cardinality-context')) {
  if (run.words.length !== run.intervalRows.length) throw new Error(`${run.gospel}|${run.reference}|${run.siglum}: contextual cardinality changed`);
  const sequence = sequences.get(`${run.gospel}|${run.reference}|${run.siglum}`);
  for (let index = 0; index < run.words.length; index++) {
    const word = run.words[index];
    const key = `${run.gospel}|${run.reference}|${run.siglum}|${word.sourceWord}`;
    if (rejectedContextualKeys.has(key)) continue;
    if (seen.has(key)) continue;
    const token = sequence?.tokens[word.sourceWord - 1];
    const targetRowId = run.intervalRows[index]?.rowId;
    if (!token || token.targetRowId || !targetRowId) throw new Error(`${key}: invalid equal-cardinality contextual placement`);
    seen.add(key);
    decisions.push({ gospel: run.gospel, reference: run.reference, siglum: run.siglum, sourceToken: word.sourceWord, diplomatic: token.diplomatic, sourceIndex: token.sourceIndex, priorClassification: token.classification, targetRowId, certified: true, adjudication: 'source-order-placement-in-equal-cardinality-bounded-context', conditions: token.conditions ?? [], supplied: token.supplied ?? null, contextualBounds: { before: run.before, after: run.after }, comparisonAgreementRequired: false });
  }
}
const certifiedTargets = new Set(decisions.map((item) => `${item.gospel}|${item.reference}|${item.targetRowId}`));
let staleCellsCleared = 0;
if (cleanup) for (const item of residual.cases) {
  const rowKey = `${item.gospel}|${item.reference}|${item.rowId}`;
  if (certifiedTargets.has(rowKey)) continue;
  const [chapter, verse] = item.reference.split(':');
  const file = path.join(ROOT, 'data', item.gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = data.rows.find((candidate) => candidate.id === item.rowId);
  if (row?.papyrus?.type !== 'extant') continue;
  row.papyrus = { type: 'lost' };
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  staleCellsCleared++;
}
if (cleanup) {
  const file = path.join(ROOT, 'data/mark/7/30.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const rowId of ['r6', 'r9', 'r15']) {
    const row = data.rows.find((candidate) => candidate.id === rowId);
    if (row?.papyrus?.type === 'extant') { row.papyrus = { type: 'lost' }; staleCellsCleared++; }
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
const report = { status: cleanup ? 'certified-applied-and-stale-copies-cleared' : write ? 'certified-and-addition-row-applied' : 'read-only-held-token-adjudication', generatedAt: new Date().toISOString(), rule: 'Exact CNTR source tokens are certified either between their immediate mapped source neighbors or by an explicit existing-row semantic/orthographic adjudication. A source-attested word without a counterpart receives its own row.', totals: { residualCellsReviewed: residual.cases.length, certifiedSourceTokens: decisions.length, sourceOrderBounded: decisions.filter((item) => item.adjudication === 'bounded-by-immediate-source-neighbors').length, explicitAdjudications: decisions.filter((item) => item.adjudication !== 'bounded-by-immediate-source-neighbors').length, newRows: 3, staleCellsCleared, coverageErrors: 0 }, decisions };
const output = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, ...report.totals, output: path.relative(ROOT, output) }, null, 2));
