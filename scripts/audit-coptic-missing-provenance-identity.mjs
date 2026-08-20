import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results
  .filter((item) => item.scriptoriumVerseTranslation && item.classification !== 'PUNCTUATION_CORRECTLY_HAS_NO_ENGLISH');
const applied = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/applied-allocations.json'), 'utf8')).records
  .filter((item) => item.method === 'HORNER_SAME_ROW_MULTI_WITNESS_ALLOCATION');
const targets = [...diagnosis, ...applied];
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
const cache = new Map();

function verseGroups(sourceFile, verseNumber) {
  const key = `${sourceFile}:${verseNumber}`;
  if (cache.has(key)) return cache.get(key);
  const text = fs.readFileSync(path.join(ROOT, 'data/sources/coptic-tt', sourceFile), 'utf8');
  const verse = text.match(new RegExp(`<verse_n verse_n="${verseNumber}"[^>]*>([\\s\\S]*?)(?=<verse_n verse_n="\\d+"|$)`));
  const groups = verse ? [...verse[1].matchAll(/<norm_group[^>]*norm_group="([^"]*)"[^>]*>([\s\S]*?)<\/norm_group>/g)]
    .filter((match) => ![...match[2].matchAll(/<norm\s+[^>]*pos="([^"]*)"[^>]*>/g)].every((norm) => norm[1] === 'PUNCT'))
    .map((match) => match[1]) : [];
  cache.set(key, groups);
  return groups;
}

const touchedFiles = new Map();
const results = targets.map((target) => {
  const [book, chapter, verse] = target.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = touchedFiles.get(file) ?? JSON.parse(fs.readFileSync(file, 'utf8'));
  touchedFiles.set(file, data);
  const cell = data.rows[target.rowIndex]?.coptic;
  const groups = cell?.provenance?.sourceFile ? verseGroups(cell.provenance.sourceFile, Number(verse)) : [];
  const matches = groups.flatMap((surface, index) => normalize(surface) === normalize(cell?.text) ? [{ sourceToken: index + 1, surface }] : []);
  const recordedSourceToken = cell?.provenance?.sourceToken ?? null;
  const ranked = [...matches].sort((left, right) => Math.abs(left.sourceToken - recordedSourceToken) - Math.abs(right.sourceToken - recordedSourceToken));
  const repair = !matches.some((match) => match.sourceToken === recordedSourceToken)
    && ranked.length > 0
    && (ranked.length === 1 || Math.abs(ranked[0].sourceToken - recordedSourceToken) < Math.abs(ranked[1].sourceToken - recordedSourceToken))
    ? ranked[0]
    : null;
  if (APPLY && repair && cell?.provenance) {
    cell.provenance.sourceTokenIdentityRepair = {
      previousSourceToken: recordedSourceToken,
      repairedSourceToken: repair.sourceToken,
      basis: 'DISPLAY_SURFACE_EXACTLY_MATCHES_PINNED_SCRIPTORIUM_NORM_GROUP',
    };
    cell.provenance.sourceToken = repair.sourceToken;
  }
  return {
    sourceReference: target.sourceReference,
    rowIndex: target.rowIndex,
    display: cell?.text ?? null,
    recordedSourceToken,
    matchingSourceTokens: matches.map((match) => match.sourceToken),
    recordedTokenMatchesDisplay: matches.some((match) => match.sourceToken === cell?.provenance?.sourceToken),
    repairSourceToken: repair?.sourceToken ?? null,
    allocationState: target.method ?? 'UNALLOCATED',
  };
});

if (APPLY) {
  for (const [file, data] of touchedFiles) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const counts = {
  targets: results.length,
  recordedTokenMatchesDisplay: results.filter((item) => item.recordedTokenMatchesDisplay).length,
  provenanceSurfaceDrift: results.filter((item) => !item.recordedTokenMatchesDisplay).length,
  uniqueRepairCandidate: results.filter((item) => !item.recordedTokenMatchesDisplay && item.matchingSourceTokens.length === 1).length,
  repeatedSurfaceCandidates: results.filter((item) => !item.recordedTokenMatchesDisplay && item.matchingSourceTokens.length > 1).length,
  noSurfaceMatch: results.filter((item) => !item.recordedTokenMatchesDisplay && item.matchingSourceTokens.length === 0).length,
  deterministicallyRepairable: results.filter((item) => item.repairSourceToken).length,
};
const report = { generatedAt: new Date().toISOString(), applied: APPLY, counts, results };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-missing-provenance-identity.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));
