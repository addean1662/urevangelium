import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const heldPath = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
const held = JSON.parse(fs.readFileSync(heldPath, 'utf8'));
const eligible = held.decisions.filter((item) => item.adjudication === 'source-attested-unharmonized-papyrus-row-within-certified-context');
const groups = new Map();
for (const decision of eligible) {
  const key = `${decision.gospel}|${decision.reference}|${decision.siglum}|${decision.contextualBounds?.before?.rowId ?? 'START'}|${decision.contextualBounds?.after?.rowId ?? 'END'}`;
  const group = groups.get(key) ?? { key, gospel: decision.gospel, reference: decision.reference, siglum: decision.siglum, decisions: [], priorComparisonInterval: decision.priorComparisonInterval ?? [] };
  group.decisions.push(decision);
  groups.set(key, group);
}

function carriesComparisonText(row) {
  return ['vaticanus', 'sinaiticus', 'byzantine', 'bezae', 'vulgate', 'peshitta', 'coptic'].some((column) => {
    const cell = row?.[column];
    return cell?.type === 'text' && Boolean(cell.text ?? cell.greek ?? cell.latin);
  });
}

let relocated = 0;
let retainedWithoutComparisonText = 0;
let multiwordSharedPlacements = 0;
for (const group of groups.values()) {
  const [chapter, verse] = group.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', group.gospel, chapter, `${verse}.json`), 'utf8'));
  const rows = new Map(data.rows.map((row) => [row.id, row]));
  const candidates = group.priorComparisonInterval.filter((rowId) => !rowId.startsWith('pap-') && carriesComparisonText(rows.get(rowId)));
  group.decisions.sort((a, b) => a.sourceToken - b.sourceToken);
  if (!candidates.length) {
    retainedWithoutComparisonText += group.decisions.length;
    for (const decision of group.decisions) {
      decision.adjudication = 'source-attested-addition-without-comparison-text-in-bounded-interval';
      decision.alignmentStatus = 'papyrus-specific-addition';
    }
    continue;
  }
  const assignments = new Map();
  for (let index = 0; index < group.decisions.length; index++) {
    const candidateIndex = group.decisions.length <= candidates.length
      ? Math.min(candidates.length - 1, Math.floor(((index + 1) * candidates.length) / (group.decisions.length + 1)))
      : Math.min(candidates.length - 1, Math.floor((index * candidates.length) / group.decisions.length));
    const targetRowId = candidates[candidateIndex];
    const decision = group.decisions[index];
    decision.previousUnharmonizedRowId = decision.targetRowId;
    decision.targetRowId = targetRowId;
    decision.adjudication = 'source-order-structural-disagreement-aligned-within-certified-sentence-anchors';
    decision.alignmentStatus = 'sentence-structure-aligned';
    decision.structuralAlignment = { candidateRows: candidates, sourceRunLength: group.decisions.length, selectedPosition: candidateIndex + 1, lexicalAgreementRequired: false };
    const count = (assignments.get(targetRowId) ?? 0) + 1;
    assignments.set(targetRowId, count);
    relocated++;
  }
  multiwordSharedPlacements += [...assignments.values()].filter((count) => count > 1).length;
}

if (write) {
  held.generatedAt = new Date().toISOString();
  held.status = 'source-complete-comparative-sentence-structure-aligned';
  fs.writeFileSync(heldPath, `${JSON.stringify(held, null, 2)}\n`);
}
console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', sourceWordsRelocatedToSharedRows: relocated, sourceWordsRetainedAsAdditions: retainedWithoutComparisonText, multiwordSharedPlacements }, null, 2));
