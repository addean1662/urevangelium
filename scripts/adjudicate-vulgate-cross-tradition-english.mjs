import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const baseFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json');
const evidenceFile = path.join(ROOT, 'docs/audits/vulgate-cross-tradition-english-shadow.json');
const outputFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication-final.json');
const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
const lexicalShadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vulgate-word-english-shadow.json'), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

if (evidence.inputAdjudicationSha256 !== base.adjudicationSha256) throw new Error('Cross-tradition evidence was not built from the current base adjudication.');
const decisions = new Map(evidence.units.flatMap((unit) => unit.decisions.map((decision) => [`${unit.sourceReference}:${decision.latinIndex}`, decision])));
const units = structuredClone(base.units);
let appliedDisplay = 0;
let appliedShared = 0;
let appliedTranslationUnit = 0;
const lexicalByReference = new Map(lexicalShadow.records.map((record) => [record.sourceReference, record]));

for (const unit of units) {
  const pending = new Set(unit.pendingEnglishIndices);
  for (const row of unit.rows) {
    const decision = decisions.get(`${unit.sourceReference}:${row.latinIndex}`);
    if (!decision) continue;
    if (row.action !== 'blank-unresolved') throw new Error(`${unit.sourceReference}:${row.latinIndex} is no longer unresolved.`);
    row.englishIndices = [decision.englishIndex];
    row.anchorEnglishIndex = decision.englishIndex;
    row.anchorEnglish = decision.english;
    row.evidence = [
      'WHITAKER_HEADWORD_SENSE',
      'TWO_ALIGNED_GREEK_WITNESSES',
      decision.bezaeLatinClassification,
      decision.rule,
    ];
    if (decision.proposedAction === 'DISPLAY_UNOWNED_DOUAY_TOKEN') {
      row.action = 'display';
      row.english = decision.english;
      pending.delete(decision.englishIndex);
      appliedDisplay++;
    } else {
      row.action = 'blank-compressed';
      row.sharedEnglishOwnerLatinIndex = decision.priorOwnerLatinIndex;
      appliedShared++;
    }
  }
  const lexicalRecord = lexicalByReference.get(unit.sourceReference);
  for (const row of unit.rows) {
    if (row.action !== 'blank-unresolved') continue;
    const spans = (lexicalRecord?.translationSpans ?? []).filter((span) => span.latinStart <= row.latinIndex && span.latinEnd >= row.latinIndex);
    if (spans.length !== 1) throw new Error(`${unit.sourceReference}:${row.latinIndex} requires exactly one governing translation span; found ${spans.length}.`);
    const span = spans[0];
    row.action = 'blank-unit-member';
    row.translationUnit = {
      latinStart: span.latinStart,
      latinEnd: span.latinEnd,
      englishStart: span.englishStart,
      englishEnd: span.englishEnd,
      status: span.status,
      closingAnchor: span.closingAnchor ?? null,
    };
    row.evidence = [
      'PUBLISHED_DOUAY_TRANSLATION_UNIT',
      span.status,
      'NO_FINER_WORD_BOUNDARY_CLAIMED',
    ];
    appliedTranslationUnit++;
  }
  unit.pendingEnglishIndices = [...pending].sort((a, b) => a - b);
}

const totals = { ...base.totals };
totals.displayedLatinRows += appliedDisplay;
totals.displayedEnglishTokens += appliedDisplay;
totals.pendingEnglishTokens -= appliedDisplay;
totals.compressedSharedLatinRows += appliedShared;
totals.translationUnitLatinRows = appliedTranslationUnit;
totals.heldLatinRows -= appliedDisplay + appliedShared + appliedTranslationUnit;
const errors = [];
if (totals.displayedEnglishTokens + totals.pendingEnglishTokens !== totals.englishTokens) errors.push('Corpus English accounting failed after cross-tradition adjudication.');
if (totals.displayedLatinRows + totals.compressedSharedLatinRows + totals.reorderedLatinRows + totals.unexpressedLatinRows + totals.translationUnitLatinRows + totals.heldLatinRows !== totals.latinTokens) errors.push('Corpus Latin accounting failed after cross-tradition adjudication.');
totals.accountingErrors = errors.length;
const report = {
  ...base,
  status: errors.length ? 'failed' : 'complete-latin-row-classification-with-phrase-level-english-held',
  generatedAt: new Date().toISOString(),
  rules: [...base.rules, 'A cross-tradition admission retains verbatim Douay English and requires a Whitaker headword sense, a unique local Douay occurrence, and agreement from at least two aligned Greek witnesses. Bezae Latin is recorded as corroborating or differing evidence and never supplies English.'],
  baseAdjudicationSha256: base.adjudicationSha256,
  crossTraditionEvidenceSha256: evidence.reportSha256,
  crossTraditionApplied: { display: appliedDisplay, sharedTranslationUnit: appliedShared, total: appliedDisplay + appliedShared },
  phraseLevelClassificationApplied: appliedTranslationUnit,
  totals,
  errors,
  units,
};
report.adjudicationSha256 = sha256(JSON.stringify(units));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, crossTraditionApplied: report.crossTraditionApplied, totals, errors, adjudicationSha256: report.adjudicationSha256, output: path.relative(ROOT, outputFile) }, null, 2));
if (errors.length) process.exitCode = 1;
