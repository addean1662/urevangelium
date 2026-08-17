import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { similarity } = await load('lib/alignment/sequenceAlign.js');
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const transpositions = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-transposition-adjudication.json'), 'utf8'));
const incompleteKeys = new Set(transpositions.decisions.filter((decision) => decision.classification === 'incomplete-mapping-review-first').map((decision) => `${decision.gospel}:${decision.reference}:${decision.siglum}`));
const mappedClasses = new Set(['unique-guide-row', 'contextual-repeated-guide-row', 'conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);

function greek(text = '') {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
}
function guideCell(row) {
  for (const column of ['vaticanus', 'sinaiticus', 'byzantine']) {
    const cell = row[column];
    if (cell?.type === 'text' || cell?.type === 'extant') return { column, text: cell.text, form: greek(cell.text) };
  }
  return null;
}

const totals = {
  incompleteSequences: incompleteKeys.size,
  unresolvedTokens: 0,
  uniqueHighOrthographicCandidates: 0,
  multipleHighCandidates: 0,
  moderateCandidatesHeld: 0,
  noLexicalCandidate: 0,
  occupiedExactRepetitions: 0,
  tokensAccounted: 0,
  coverageErrors: 0,
  additionsCertified: 0,
};
const decisions = [];

for (const sequence of sourceOrder.sequences) {
  const sequenceKey = `${sequence.gospel}:${sequence.reference}:${sequence.siglum}`;
  if (!incompleteKeys.has(sequenceKey)) continue;
  const [chapter, verse] = sequence.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', sequence.gospel, chapter, `${verse}.json`), 'utf8'));
  const guideRows = data.rows.map((row, rowIndex) => ({ rowId: row.id, rowIndex, ...guideCell(row) })).filter((row) => row.text);
  const usedRows = new Set(sequence.tokens.filter((token) => mappedClasses.has(token.classification) && token.targetRowId).map((token) => token.targetRowId));
  const unresolved = sequence.tokens.filter((token) => !mappedClasses.has(token.classification));
  totals.unresolvedTokens += unresolved.length;

  for (const token of unresolved) {
    totals.tokensAccounted++;
    const sourceForm = greek(token.diplomatic);
    const occupiedExact = guideRows.filter((row) => row.form === sourceForm && usedRows.has(row.rowId));
    const available = guideRows.filter((row) => !usedRows.has(row.rowId)).map((row) => ({ ...row, similarity: similarity(sourceForm, row.form) })).sort((a, b) => b.similarity - a.similarity || a.rowIndex - b.rowIndex);
    const high = available.filter((row) => Math.min(sourceForm.length, row.form.length) >= 4 && row.similarity >= 0.8);
    const moderate = available.filter((row) => Math.min(sourceForm.length, row.form.length) >= 4 && row.similarity >= 0.65 && row.similarity < 0.8);
    let classification;
    let decision;
    let candidates = [];
    if (high.length === 1) {
      classification = 'unique-high-orthographic-candidate';
      decision = 'Review this existing-row candidate as an orthographic or inflectional variant; do not create a new row.';
      candidates = high;
      totals.uniqueHighOrthographicCandidates++;
    } else if (high.length > 1) {
      classification = 'multiple-high-orthographic-candidates';
      decision = 'Resolve repeated or similar forms from clause context before placement.';
      candidates = high;
      totals.multipleHighCandidates++;
    } else if (occupiedExact.length) {
      classification = 'occupied-exact-source-repetition';
      decision = 'A matching row is already used by another token from this papyrus. Review for dittography, a genuine additional proposition, or an earlier mapping error.';
      candidates = occupiedExact;
      totals.occupiedExactRepetitions++;
    } else if (moderate.length) {
      classification = 'moderate-lexical-candidate-held';
      decision = 'Similarity is insufficient for automatic placement; review morphology and semantics.';
      candidates = moderate.slice(0, 5);
      totals.moderateCandidatesHeld++;
    } else {
      classification = 'no-lexical-candidate';
      decision = 'Review as a possible substitution, different lexeme, or genuine addition. Absence of a surface match is not evidence for a new row.';
      totals.noLexicalCandidate++;
    }
    decisions.push({ sequenceKey, siglum: sequence.siglum, gospel: sequence.gospel, reference: sequence.reference, sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, priorClassification: token.classification, classification, candidates: candidates.map((row) => ({ rowId: row.rowId, column: row.column, guideText: row.text, similarity: row.similarity ?? 1 })), decision });
  }
}

if (totals.tokensAccounted !== totals.unresolvedTokens || decisions.length !== totals.unresolvedTokens) totals.coverageErrors++;
const report = {
  status: 'read-only-incomplete-mapping-candidate-audit',
  generatedAt: new Date().toISOString(),
  rule: 'Only unused existing rows with a unique high surface similarity are proposed for orthographic review. No candidate is applied automatically and no absence of a match establishes a new row.',
  totals,
  decisions,
};
const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-incomplete-mapping-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'papyrus-incomplete-mapping-audit.md'), [
  '# Papyrus Incomplete-Mapping Audit', '', `Generated: ${report.generatedAt}`, '', '**Read-only. No live Gospel data or shadow data was modified.**', '', report.rule, '',
  `- Incomplete verse/witness sequences: ${totals.incompleteSequences}`,
  `- Unresolved source tokens inventoried: ${totals.unresolvedTokens}`,
  `- Unique high orthographic candidates: ${totals.uniqueHighOrthographicCandidates}`,
  `- Multiple high candidates: ${totals.multipleHighCandidates}`,
  `- Exact matches on already occupied rows: ${totals.occupiedExactRepetitions}`,
  `- Moderate candidates held: ${totals.moderateCandidatesHeld}`,
  `- No lexical candidate: ${totals.noLexicalCandidate}`,
  `- Exactly-once coverage errors: ${totals.coverageErrors}`,
  `- Additions certified automatically: ${totals.additionsCertified}`, '',
].join('\n'));
console.log(JSON.stringify(totals, null, 2));
