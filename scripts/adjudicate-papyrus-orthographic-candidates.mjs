import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const candidates = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-incomplete-mapping-audit.json'), 'utf8'));
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const BOOK_KEYS = { matthew: 'B01', mark: 'B02', luke: 'B03', john: 'B04' };
const mappedClasses = new Set(['unique-guide-row', 'contextual-repeated-guide-row', 'conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const sequenceIndex = new Map(sourceOrder.sequences.map((sequence) => [`${sequence.gospel}:${sequence.reference}:${sequence.siglum}`, sequence]));

function normalize(text = '') {
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
function intfWords(sequence) {
  const ga = sequence.siglum === 'P64+P67' ? 10064 : 10000 + Number(sequence.siglum.match(/\d+/)?.[0]);
  const file = path.join(ROOT, 'data/cache/intf', `${ga}-${sequence.gospel}.json`);
  if (!fs.existsSync(file)) return [];
  const [chapter, verse] = sequence.reference.split(':').map(Number);
  return JSON.parse(fs.readFileSync(file, 'utf8'))[`${BOOK_KEYS[sequence.gospel]}K${chapter}V${verse}`] ?? [];
}

const strong = candidates.decisions.filter((decision) => decision.classification === 'unique-high-orthographic-candidate');
const totals = { candidates: strong.length, certified: 0, conditionedHeld: 0, noIntfCorroboration: 0, outsideMappedContext: 0, missingSequenceOrRow: 0, coverageErrors: 0 };
totals.damagedReadableCertified = 0;
const decisions = [];

for (const candidate of strong) {
  const sequence = sequenceIndex.get(candidate.sequenceKey);
  if (!sequence) {
    totals.missingSequenceOrRow++;
    decisions.push({ ...candidate, adjudication: 'missing-sequence', certified: false });
    continue;
  }
  const token = sequence.tokens.find((item) => item.sourceIndex + 1 === candidate.sourceToken);
  const [chapter, verse] = candidate.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', candidate.gospel, chapter, `${verse}.json`), 'utf8'));
  const rowIndex = new Map(data.rows.map((row, index) => [row.id, index]));
  const targetRowId = candidate.candidates[0]?.rowId;
  const targetRowIndex = rowIndex.get(targetRowId);
  if (!token || targetRowIndex === undefined) {
    totals.missingSequenceOrRow++;
    decisions.push({ ...candidate, adjudication: 'missing-token-or-row', certified: false });
    continue;
  }
  const mapped = sequence.tokens.filter((item) => mappedClasses.has(item.classification) && item.targetRowId);
  const previous = mapped.filter((item) => item.sourceIndex < token.sourceIndex).sort((a, b) => b.sourceIndex - a.sourceIndex)[0] ?? null;
  const next = mapped.filter((item) => item.sourceIndex > token.sourceIndex).sort((a, b) => a.sourceIndex - b.sourceIndex)[0] ?? null;
  const lower = previous ? rowIndex.get(previous.targetRowId) : -1;
  const upper = next ? rowIndex.get(next.targetRowId) : data.rows.length;
  const contextCoherent = targetRowIndex > lower && targetRowIndex < upper;
  const intf = intfWords(sequence);
  const intfCorroborates = intf.length > 0 && orderedTextAgreement(sequence.tokens.map((item) => normalize(item.diplomatic)), intf.map(normalize));

  let adjudication;
  let certified = false;
  const damageOnly = !token.supplied && token.conditions?.length > 0 && token.conditions.every((condition) => condition.kind === 'damaged');
  if (token.conditioned && !damageOnly) {
    adjudication = 'conditioned-source-held';
    totals.conditionedHeld++;
  } else if (!intfCorroborates) {
    adjudication = 'second-transcription-not-corroborated';
    totals.noIntfCorroboration++;
  } else if (!contextCoherent) {
    adjudication = 'outside-mapped-context-review';
    totals.outsideMappedContext++;
  } else {
    adjudication = damageOnly ? 'certified-damaged-orthographic-existing-row' : 'certified-orthographic-existing-row';
    certified = true;
    totals.certified++;
    if (damageOnly) totals.damagedReadableCertified++;
  }
  decisions.push({ ...candidate, certified, adjudication, targetRowId, source: { diplomatic: token.diplomatic, conditioned: token.conditioned, conditions: token.conditions ?? [], supplied: token.supplied ?? null, sourceToken: token.sourceIndex + 1 }, context: { previous: previous ? { sourceToken: previous.sourceIndex + 1, rowId: previous.targetRowId } : null, next: next ? { sourceToken: next.sourceIndex + 1, rowId: next.targetRowId } : null, coherent: contextCoherent }, corroboration: { source: intf.length ? 'cached INTF transcription' : null, completeOrderAgreement: intfCorroborates } });
}
if (decisions.length !== strong.length) totals.coverageErrors++;
const report = { status: 'read-only-orthographic-candidate-adjudication', generatedAt: new Date().toISOString(), rule: 'Certification requires an unconditioned CNTR token, complete-order agreement with cached INTF, one unique unused high-similarity guide row, and a target between the nearest mapped source neighbors.', totals, decisions };
const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-orthographic-adjudication.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'papyrus-orthographic-adjudication.md'), [
  '# Papyrus Orthographic Candidate Adjudication', '', `Generated: ${report.generatedAt}`, '', '**Read-only. No live Gospel data or shadow data was modified.**', '', report.rule, '',
  `- Unique high-similarity candidates reviewed: ${totals.candidates}`,
  `- Certified existing-row mappings: ${totals.certified}`,
  `- Conditioned source tokens held: ${totals.conditionedHeld}`,
  `- Damaged-but-readable candidates certified: ${totals.damagedReadableCertified}`,
  `- Lacking complete INTF corroboration: ${totals.noIntfCorroboration}`,
  `- Outside coherent mapped context: ${totals.outsideMappedContext}`,
  `- Missing sequence or row evidence: ${totals.missingSequenceOrRow}`,
  `- Coverage errors: ${totals.coverageErrors}`, '',
].join('\n'));
console.log(JSON.stringify(totals, null, 2));
