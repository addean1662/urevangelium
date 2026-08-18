import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-contextual-realignment.json'), 'utf8'));
const heldPath = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
const held = JSON.parse(fs.readFileSync(heldPath, 'utf8'));
const decisions = new Map(held.decisions.map((item) => [`${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`, item]));
let relocated = 0;
let sameWitnessCollisionsHeld = 0;

for (const item of audit.cases.filter((entry) => ['unique-strong-contextual-counterpart', 'unique-lemma-contextual-counterpart'].includes(entry.classification))) {
  const candidate = item.classification === 'unique-lemma-contextual-counterpart' ? item.candidates.find((entry) => entry.lemmaAgreement?.length) : item.candidates[0];
  const [chapter, verse] = item.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', item.gospel, chapter, `${verse}.json`), 'utf8'));
  const row = data.rows.find((entry) => entry.id === candidate.rowId);
  if (!row) throw new Error(`${item.gospel} ${item.reference} ${candidate.rowId}: missing target row`);
  if (row.papyrus?.provenance?.sourceAttestations?.some((attestation) => attestation.siglum === item.siglum)) {
    sameWitnessCollisionsHeld++;
    continue;
  }
  const key = `${item.gospel}|${item.reference}|${item.siglum}|${item.word.sourceWord}`;
  const decision = decisions.get(key);
  if (!decision || decision.adjudication !== 'source-attested-unharmonized-papyrus-row-within-certified-context') throw new Error(`${key}: missing unharmonized decision`);
  decision.previousUnharmonizedRowId = decision.targetRowId;
  decision.targetRowId = candidate.rowId;
  decision.adjudication = item.classification === 'unique-lemma-contextual-counterpart' ? 'lemma-supported-contextual-disagreement-aligned-to-shared-sentence-row' : 'contextual-disagreement-aligned-to-shared-sentence-row';
  decision.alignmentStatus = 'contextually-harmonized';
  decision.comparisonCounterpart = { column: candidate.best.column, text: candidate.best.text, similarity: candidate.best.similarity, ...(candidate.lemmaAgreement?.length ? { lemmaAgreement: candidate.lemmaAgreement } : {}) };
  decision.comparisonAgreementRequired = false;
  relocated++;
}

if (write) {
  held.generatedAt = new Date().toISOString();
  held.status = 'source-complete-comparative-alignment-in-progress';
  fs.writeFileSync(heldPath, `${JSON.stringify(held, null, 2)}\n`);
}
console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', relocatedToSharedRows: relocated, sameWitnessCollisionsHeld }, null, 2));
