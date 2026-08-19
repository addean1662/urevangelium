import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-pilot/manifest.json'), 'utf8'));
const allowedEquivalence = new Set(manifest.allowedEquivalenceClasses ?? []);
const allowedMethods = new Set(manifest.acquisition?.allowedMethods ?? []);
const allowedOperations = new Set([...(manifest.automaticNormalizationOperations ?? []), ...(manifest.reviewRequiredOperations ?? [])]);
const reviewRequired = new Set(manifest.reviewRequiredOperations ?? []);
const errors = [];
const requiredUnitFields = ['id', 'pilotId', 'gospel', 'chapter', 'verseStart', 'verseEnd', 'hornerVolume', 'hornerPage', 'hornerCopticRaw', 'hornerCopticComparisonForm', 'hornerEnglishVerbatim', 'sahidicaCopticRaw', 'sahidicaComparisonForm', 'sahidicaGroupIds', 'translationUnitBoundaryBasis', 'equivalenceClass', 'normalizationOperations', 'decision', 'reviewStatus'];

for (const unit of manifest.translationUnits ?? []) {
  for (const field of requiredUnitFields) if (unit[field] === undefined || unit[field] === null || unit[field] === '') errors.push(`${unit.id ?? '(unnamed unit)'} missing ${field}`);
  for (const operation of unit.normalizationOperations ?? []) {
    if (!allowedOperations.has(operation.type)) errors.push(`${unit.id}: unrecognized normalization ${operation.type}`);
    if (operation.before === undefined || operation.after === undefined || !operation.rule) errors.push(`${unit.id}: normalization ${operation.type} must store before, after, and rule`);
    if (reviewRequired.has(operation.type) && !operation.reviewedBy) errors.push(`${unit.id}: ${operation.type} requires human review`);
  }
  if (unit.decision !== 'admit') continue;
  if (!allowedEquivalence.has(unit.equivalenceClass)) errors.push(`${unit.id}: admission forbidden for ${unit.equivalenceClass}`);
  if (!allowedMethods.has(manifest.acquisition?.method)) errors.push(`${unit.id}: qualified acquisition method missing`);
  for (const field of ['humanOriginVerified', 'sourceEditionIdentified', 'auditabilitySufficient', 'rightsValidForPublicUse']) if (manifest.acquisition?.[field] !== true) errors.push(`${unit.id}: acquisition.${field} must be true`);
  if (!manifest.horner.sourceImages?.length) errors.push(`${unit.id}: facsimile source record missing`);
  if (!manifest.horner.rightsBasis) errors.push(`${unit.id}: rights basis missing`);
  if (!unit.hornerEnglishVerbatim) errors.push(`${unit.id}: Horner English must be verbatim`);
}

const result = { status: errors.length ? 'failed' : manifest.translationUnits.length ? 'valid-pilot-ledger' : 'valid-empty-scaffold', pilots: manifest.pilots.length, translationUnits: manifest.translationUnits.length, admitted: manifest.translationUnits.filter((unit) => unit.decision === 'admit').length, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
