import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const inputFile = path.join(ROOT, 'docs', 'audits', 'vulgate-english-source-shadow.json');
if (!fs.existsSync(inputFile)) throw new Error('Run npm run shadow:vulgate:english first.');
const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const heldAnalysisFile = path.join(ROOT, 'docs', 'audits', 'vulgate-english-held-analysis.json');
const heldAnalysis = fs.existsSync(heldAnalysisFile) ? JSON.parse(fs.readFileSync(heldAnalysisFile, 'utf8')) : null;
const heldDecisions = new Map((heldAnalysis?.decisions ?? []).map((decision) => [decision.sourceReference, decision]));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const admitted = [];
const held = [];
for (const record of input.records) {
  const base = {
    sourceReference: record.sourceReference,
    displayReferences: record.displayReferences,
    latin: record.latin,
    english: record.challoner1899,
    translatorEdition: 'Douay-Rheims American Edition of 1899 (Challoner tradition)',
    sourceFile: input.sourceManifests.find((item) => record.sourceReference.startsWith(`${item.gospel} `))?.challoner.file,
    sourceComponents: record.challonerComponentReferences,
    alignmentScope: 'whole-published-translation-unit',
    finerSemanticSegmentationAuthorized: false,
  };
  if (record.threeWayResult === 'PRIMARY_MAJORITY') {
    admitted.push({ ...base, status: 'PUBLISHED_TRANSLATION_UNIT_SOURCE_CONCORDANT', review: 'automated-internal-source-collation', displayEligible: true, reason: 'The selected 1899 wording is concordant after nonlexical normalization with at least one independently distributed Challoner electronic text.' });
  } else if (heldDecisions.has(record.sourceReference)) {
    const decision = heldDecisions.get(record.sourceReference);
    admitted.push({ ...base, english: decision.selectedEnglish, status: 'PUBLISHED_TRANSLATION_UNIT_1899_EDITION_VERIFIED', review: 'automated-internal-edition-specific-collation', displayEligible: true, verification: decision.verification, adjudicationClassification: decision.classification, reason: 'The previously held wording was resolved against a separately hardcopy-derived 1899 verification witness.' });
  } else {
    held.push({ ...base, status: '1899_WORDING_REQUIRES_EDITION_SPECIFIC_VERIFICATION', review: 'held-fail-closed', displayEligible: false, comparison: { eBible1899: record.challoner1899, bibleCorps1750: record.independentChalloner1750, gutenberg: record.gutenbergChalloner, originalRheims1582: record.originalRheims1582 }, reason: 'Other electronic witnesses differ from the selected 1899 wording. A different Challoner edition cannot overrule the 1899 authority by numerical majority.' });
  }
}

const report = {
  status: held.length ? 'partial-internal-admission-not-independent-scholarly-review' : 'complete-internal-source-admission-not-independent-scholarly-review',
  generatedAt: new Date().toISOString(),
  governingRules: [
    'The Clementine Latin remains the governing column text.',
    'English is reproduced from the selected published 1899 Douay-Rheims/Challoner edition.',
    'Admission certifies source attribution and source-unit alignment, not word-for-word translation.',
    'No English word is assigned to an individual Latin word unless a published source later supports that finer division.',
    'Edition identity outranks numerical majority: 1750-family wording cannot silently replace 1899 wording.',
    'Disagreement fails closed.',
  ],
  totals: { inputUnits: input.records.length, admittedUnits: admitted.length, heldUnits: held.length, editionSpecificallyAdjudicated: admitted.filter((unit) => unit.status === 'PUBLISHED_TRANSLATION_UNIT_1899_EDITION_VERIFIED').length, admittedLatinCells: 0, liveDisplayChanges: 0 },
  sourceShadowLedgerSha256: input.ledgerSha256,
  heldAnalysisDecisionSha256: heldAnalysis?.decisionSha256 ?? null,
  admitted,
  held,
};
report.adjudicationSha256 = sha256(JSON.stringify({ admitted, held }));
const output = path.join(ROOT, 'docs', 'audits', 'vulgate-english-adjudication.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals: report.totals, adjudicationSha256: report.adjudicationSha256, output: path.relative(ROOT, output) }, null, 2));
