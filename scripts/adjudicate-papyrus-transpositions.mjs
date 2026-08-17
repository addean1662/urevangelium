import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const mappedClasses = new Set(['unique-guide-row', 'contextual-repeated-guide-row', 'conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const contextualClasses = new Set(['contextual-repeated-guide-row', 'conditioned-contextual-guide-row']);
const conditionedClasses = new Set(['conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const BOOK_KEYS = { matthew: 'B01', mark: 'B02', luke: 'B03', john: 'B04' };

const totals = {
  flaggedSequences: 0,
  cleanExactInversions: 0,
  conditionedInversions: 0,
  contextualRepetitionInversions: 0,
  incompleteMappingInversions: 0,
  candidateClusters: 0,
  sourceTokensAccounted: 0,
  sourceTokenCoverageErrors: 0,
  certifiedTranspositions: 0,
  intfCorroboratedTranspositions: 0,
};
const decisions = [];

function guideCell(row) {
  for (const column of ['vaticanus', 'sinaiticus', 'byzantine']) {
    const cell = row[column];
    if (cell?.type === 'text' || cell?.type === 'extant') return { column, text: cell.text };
  }
  return { column: null, text: null };
}

function normalize(text = '') {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
}
function intfWords(sequence) {
  const ga = sequence.siglum === 'P64+P67' ? 10064 : 10000 + Number(sequence.siglum.match(/\d+/)?.[0]);
  const file = path.join(ROOT, 'data/cache/intf', `${ga}-${sequence.gospel}.json`);
  if (!fs.existsSync(file)) return [];
  const [chapter, verse] = sequence.reference.split(':').map(Number);
  return JSON.parse(fs.readFileSync(file, 'utf8'))[`${BOOK_KEYS[sequence.gospel]}K${chapter}V${verse}`] ?? [];
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

for (const sequence of audit.sequences.filter((item) => item.orderStatus === 'candidate-transposition-review')) {
  totals.flaggedSequences++;
  totals.candidateClusters += sequence.inversionClusters.length;
  totals.sourceTokensAccounted += sequence.tokens.length;
  if (sequence.tokens.length !== sequence.sourceTokenCount || new Set(sequence.tokens.map((token) => token.sourceIndex)).size !== sequence.sourceTokenCount) totals.sourceTokenCoverageErrors++;

  const [chapter, verse] = sequence.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', sequence.gospel, chapter, `${verse}.json`), 'utf8'));
  const rowIndex = new Map(data.rows.map((row, index) => [row.id, index]));
  const mapped = sequence.tokens.filter((token) => mappedClasses.has(token.classification) && token.targetRowId);
  const unresolved = sequence.tokens.filter((token) => !mappedClasses.has(token.classification));
  const conditioned = mapped.filter((token) => conditionedClasses.has(token.classification));
  const contextual = mapped.filter((token) => contextualClasses.has(token.classification));
  const intf = intfWords(sequence);
  const intfCorroboratesOrder = intf.length > 0 && orderedTextAgreement(sequence.tokens.map((token) => normalize(token.diplomatic)), intf.map(normalize));

  let classification;
  let decision;
  if (unresolved.length) {
    classification = 'incomplete-mapping-review-first';
    decision = 'Resolve unmapped source tokens before deciding whether the row-order inversion represents a manuscript transposition.';
    totals.incompleteMappingInversions++;
  } else if (contextual.length) {
    classification = 'repeated-form-context-review';
    decision = 'Re-adjudicate repeated-form assignments in full clause context before certifying a transposition.';
    totals.contextualRepetitionInversions++;
  } else if (conditioned.length) {
    classification = 'conditioned-transposition-candidate';
    decision = 'The complete mapping is inverted, but damaged, supplied, or conditioned source evidence requires manuscript-level review.';
    totals.conditionedInversions++;
  } else {
    totals.cleanExactInversions++;
    if (intfCorroboratesOrder) {
      classification = 'corroborated-clean-transposition';
      decision = 'CNTR and cached INTF transcriptions agree on the complete papyrus source order; the exact row mapping confirms a manuscript transposition relative to the Vaticanus guide order.';
      totals.certifiedTranspositions++;
      totals.intfCorroboratedTranspositions++;
    } else {
      classification = 'clean-exact-transposition-candidate';
      decision = 'All source tokens map exactly once without conditioned or repeated-form evidence; obtain a second transcription or image review before certification.';
    }
  }

  const sourceOrder = sequence.tokens.map((token) => ({ sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, classification: token.classification, targetRowId: token.targetRowId }));
  const guideOrder = mapped.slice().sort((a, b) => rowIndex.get(a.targetRowId) - rowIndex.get(b.targetRowId)).map((token) => {
    const row = data.rows[rowIndex.get(token.targetRowId)];
    return { rowId: token.targetRowId, guide: guideCell(row), sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic };
  });
  const clusters = sequence.inversionClusters.map((cluster) => {
    const sourceIndexes = [cluster.earlierSourceToken, cluster.laterSourceToken].filter((value) => value !== null);
    const lower = Math.max(0, Math.min(...sourceIndexes) - 2);
    const upper = Math.min(sequence.tokens.length, Math.max(...sourceIndexes) + 3);
    return {
      ...cluster,
      sourceWindow: sourceOrder.slice(lower, upper),
      guideWindow: guideOrder.filter((item) => {
        const position = rowIndex.get(item.rowId);
        return position >= Math.min(rowIndex.get(cluster.earlierRow), rowIndex.get(cluster.laterRow)) - 2 && position <= Math.max(rowIndex.get(cluster.earlierRow), rowIndex.get(cluster.laterRow)) + 2;
      }),
    };
  });

  decisions.push({ siglum: sequence.siglum, gospel: sequence.gospel, reference: sequence.reference, classification, decision, sourceTokenCount: sequence.sourceTokenCount, mappedTokenCount: mapped.length, unresolvedTokenCount: unresolved.length, conditionedMappedCount: conditioned.length, contextualMappedCount: contextual.length, corroboration: { source: intf.length ? 'cached INTF transcription' : null, agreesWithCntrOrder: intfCorroboratesOrder, words: intf }, sourceOrder, guideOrder, clusters });
}

const report = {
  status: 'read-only-transposition-adjudication-ledger',
  generatedAt: new Date().toISOString(),
  rule: 'An inversion is not certified as a manuscript transposition until the complete source sequence is mapped, repeated forms are contextually resolved, conditioned evidence is reviewed, and the source transcription confirms the order.',
  totals,
  decisions,
};
const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-transposition-adjudication.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'papyrus-transposition-adjudication.md'), [
  '# Papyrus Transposition Adjudication Ledger', '', `Generated: ${report.generatedAt}`, '', '**Read-only. No live Gospel data was modified.**', '', report.rule, '',
  `- Flagged verse/witness sequences: ${totals.flaggedSequences}`,
  `- Candidate inversion clusters: ${totals.candidateClusters}`,
  `- Clean exact inversion candidates: ${totals.cleanExactInversions}`,
  `- Conditioned-evidence inversion candidates: ${totals.conditionedInversions}`,
  `- Repeated-form context cases: ${totals.contextualRepetitionInversions}`,
  `- Incomplete mappings requiring review first: ${totals.incompleteMappingInversions}`,
  `- Source tokens represented in the ledger: ${totals.sourceTokensAccounted}`,
  `- Exactly-once coverage errors: ${totals.sourceTokenCoverageErrors}`,
  `- Transpositions certified automatically: ${totals.certifiedTranspositions}`, '',
  `- Certified cases corroborated by cached INTF: ${totals.intfCorroboratedTranspositions}`, '',
  'The JSON ledger records complete source order, guide-row order, and local inversion windows for every flagged sequence.', '',
].join('\n'));
console.log(JSON.stringify(totals, null, 2));
