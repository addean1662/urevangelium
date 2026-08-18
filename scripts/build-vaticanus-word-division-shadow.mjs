import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INPUT = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/word-division-ledger.json');
const OUTPUT = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/word-division-row-shadow.json');

function norm(text = '') { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, ''); }
function greekForms(row) {
  return [row.sinaiticus?.text, row.byzantine?.text, row.bezae?.greek, row.papyrus?.text]
    .filter(Boolean).map(norm).filter(Boolean);
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function combinations(values, count, start = 0, prefix = [], output = []) {
  if (prefix.length === count) { output.push(prefix); return output; }
  for (let index = start; index < values.length; index++) combinations(values, count, index + 1, [...prefix, values[index]], output);
  return output;
}

const audit = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const plans = [];
const totals = { inputSplits: 0, architectureCertified: 0, architectureWithheld: 0, partsPlaced: 0, reusedOmittedRows: 0, originalRowsUsed: 0, insertionsRequired: 0, invariantErrors: 0 };

for (const decision of audit.decisions.filter(item => item.decision === 'certified-word-division')) {
  totals.inputSplits++;
  const [gospel, cv] = decision.reference.split(' ');
  const [chapter, verse] = cv.split(':');
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const live = JSON.parse(fs.readFileSync(file, 'utf8'));
  const originalIndex = live.rows.findIndex(row => row.id === decision.rowId);
  if (originalIndex < 0) { totals.invariantErrors++; plans.push({ ...decision, status: 'error-row-not-found' }); continue; }
  const candidateIndexes = [];
  for (let index = Math.max(0, originalIndex - 4); index <= Math.min(live.rows.length - 1, originalIndex + 4); index++) {
    const vat = live.rows[index].vaticanus;
    if (index === originalIndex || !vat || vat.type === 'omitted' || vat.type === 'empty') candidateIndexes.push(index);
  }
  const scored = combinations(candidateIndexes, decision.split.length).map(indexes => {
    const partEvidence = indexes.map((rowIndex, partIndex) => {
      const part = norm(decision.split[partIndex]);
      const forms = greekForms(live.rows[rowIndex]);
      const exactSources = forms.filter(form => form === part).length;
      return { rowIndex, rowId: live.rows[rowIndex].id, part: decision.split[partIndex], exactSources, forms };
    });
    const allSupported = partEvidence.every(part => part.exactSources > 0);
    const containsOriginal = indexes.includes(originalIndex);
    const distance = indexes.reduce((sum, index) => sum + Math.abs(index - originalIndex), 0);
    const score = partEvidence.reduce((sum, part) => sum + part.exactSources * 100, 0) + (containsOriginal ? 10 : 0) - distance;
    return { indexes, partEvidence, allSupported, score };
  }).filter(entry => entry.allSupported).sort((a, b) => b.score - a.score);
  const uniqueBest = scored.length && (scored.length === 1 || scored[0].score > scored[1].score) ? scored[0] : null;
  if (!uniqueBest) {
    totals.architectureWithheld++;
    plans.push({ ...decision, status: 'withheld-no-unique-two-source-row-placement', candidatePlacements: scored.slice(0, 5) });
    continue;
  }
  const proposedRows = structuredClone(live.rows);
  for (let partIndex = 0; partIndex < uniqueBest.partEvidence.length; partIndex++) {
    const placement = uniqueBest.partEvidence[partIndex];
    const original = live.rows[originalIndex].vaticanus;
    proposedRows[placement.rowIndex].vaticanus = {
      type: 'text', text: placement.part,
      provenance: { ...original.provenance, diplomatic: placement.part, wordDivision: { sourceToken: decision.intfToken, sourceTokenXml: decision.intfRawXml, rule: decision.rule, cntrTokens: decision.cntrTokens, part: partIndex + 1, parts: decision.split.length } },
    };
    if (placement.rowIndex === originalIndex) totals.originalRowsUsed++; else totals.reusedOmittedRows++;
    totals.partsPlaced++;
  }
  if (!uniqueBest.indexes.includes(originalIndex)) proposedRows[originalIndex].vaticanus = { type: 'omitted' };
  const projected = proposedRows.filter(row => row.vaticanus?.type === 'text').map(row => row.vaticanus.text).join('');
  const originalProjection = live.rows.filter(row => row.vaticanus?.type === 'text').map(row => row.vaticanus.text).join('');
  if (projected !== originalProjection) totals.invariantErrors++;
  totals.architectureCertified++;
  plans.push({ ...decision, status: 'architecture-certified', placement: uniqueBest.partEvidence, proposedRows });
}

const output = { status: 'shadow-only', generatedAt: new Date().toISOString(), policy: 'CNTR supplies a unique exact division and every component must map in order to a distinct nearby shared row with exact support from another Greek column.', sourceLedgerSha256: hash(audit.decisions), totals, passed: totals.invariantErrors === 0, decisionSha256: hash(plans.map(({ proposedRows: _rows, ...plan }) => plan)), plans };
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), ...totals, passed: output.passed, decisionSha256: output.decisionSha256 }, null, 2));
process.exitCode = output.passed ? 0 : 2;
