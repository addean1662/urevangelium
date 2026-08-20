import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-allocations.json'), 'utf8'));
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results;
const diagnosisByKey = new Map(diagnosis.map((item) => [`${item.sourceReference}:${item.rowIndex}`, item]));
const horner = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const hornerByReference = new Map(horner.units.map((unit) => [unit.sourceReference, unit]));
const crum = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/coptic/crum-lookup.json'), 'utf8'));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokenize = (value) => normalize(value).split(/\s+/).filter(Boolean);
const stem = (word) => word.length <= 4 ? word : word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
const equivalent = (left, right) => left === right || stem(left) === stem(right);
const functionPos = new Set(['ART', 'PREP', 'PPERS', 'PPERO', 'PPOS', 'COP', 'PTC', 'CCIRC', 'APREC', 'APST', 'ANY', 'CONJ', 'CREL', 'PDEM', 'PINT', 'PPERI', 'AOPT', 'ANEGOPT', 'FUT']);
const copticNormalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
const editDistance = (left, right) => {
  const a = [...left]; const b = [...right]; const row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const held = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = held; } }
  return row[b.length];
};
const alternatives = (value) => String(value ?? '').replace(/\([^)]*\)/g, ' ').split(/[,;/]|\bor\b/iu).map((part) => normalize(part)).filter(Boolean);
const findPhrase = (text, phrase) => {
  const haystack = tokenize(text);
  const needle = tokenize(phrase);
  const matches = [];
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((word, index) => equivalent(word, haystack[start + index]))) matches.push({ start, end: start + needle.length });
  }
  return matches;
};
const hornerVerbatim = (text, phrase) => {
  const words = [...String(text).matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], norm: normalize(match[0]), start: match.index, end: match.index + match[0].length }));
  const needle = tokenize(phrase);
  for (let start = 0; start <= words.length - needle.length; start += 1) {
    if (needle.every((word, index) => equivalent(word, words[start + index].norm))) return text.slice(words[start].start, words[start + needle.length - 1].end);
  }
  return null;
};

const liveFiles = new Map();
const directBySurface = new Map();
const directByLemma = new Map();
for (const gospel of GOSPELS) {
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`), 'utf8'));
  for (const item of shadow.decisions) {
    const [chapter, verse] = item.reference.split(':');
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    let data = liveFiles.get(file);
    if (!data) { data = JSON.parse(fs.readFileSync(file, 'utf8')); liveFiles.set(file, data); }
    const cell = data.rows.find((row) => row.id === item.rowId)?.coptic;
    if (!cell?.gloss?.gloss || !['Crum', 'Scriptorium'].includes(cell.gloss.source)) continue;
    for (const [index, key] of [[directBySurface, cell.text], [directByLemma, item.lemma]]) {
      if (!key) continue;
      const record = index.get(key) ?? new Map();
      record.set(cell.gloss.gloss, (record.get(cell.gloss.gloss) ?? 0) + 1);
      index.set(key, record);
    }
  }
}

const decisions = [];
for (const target of audit.results) {
  const key = `${target.sourceReference}:${target.rowIndex}`;
  const detail = diagnosisByKey.get(key) ?? target;
  const unit = hornerByReference.get(target.sourceReference);
  const [book, chapter, verse] = target.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = liveFiles.get(file) ?? JSON.parse(fs.readFileSync(file, 'utf8'));
  liveFiles.set(file, data);
  const cell = data.rows[target.rowIndex]?.coptic;
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`), 'utf8'));
  const shadowItem = shadow.decisions.find((item) => item.reference === `${chapter}:${verse}` && item.sourceToken === detail.sourceToken);
  const candidates = [];
  const groupFunctionOnly = (detail.norms ?? []).length > 0 && detail.norms.every((norm) => functionPos.has(norm.pos));
  const addCandidate = (value, evidenceClass, source, contentBearing = false) => {
    for (const candidate of alternatives(value)) candidates.push({ candidate, evidenceClass, source, contentBearing });
  };
  const surfaceRecord = directBySurface.get(cell?.text);
  if (surfaceRecord?.size === 1) for (const [value] of surfaceRecord) addCandidate(value, 'RECURRENT_EXACT_COPTIC_SURFACE', 'published-live-corpus', true);
  for (const norm of detail.norms ?? []) {
    const contentBearing = !functionPos.has(norm.pos);
    const lemmaRecord = directByLemma.get(norm.lemma);
    if (lemmaRecord?.size === 1) for (const [value] of lemmaRecord) addCandidate(value, 'RECURRENT_EXACT_SCRIPTORIUM_LEMMA', 'published-live-corpus', contentBearing);
    addCandidate(crum[norm.lemma], 'KELLIA_COMPONENT_LEXICON', 'KELLIA-CCL-1.2', contentBearing);
  }
  if (shadowItem?.identity) for (const component of shadowItem.identity.replace(/\([^)]*\)/g, '').split(/\s+/)) addCandidate(component, 'SCRIPTORIUM_ENTITY_COMPONENT', 'Coptic-SCRIPTORIUM', true);
  if (target.candidate) addCandidate(target.candidate, 'IMMEDIATE_SOURCE_ORDER_HORNER_BOUNDS', 'Horner', false);

  const supported = candidates.filter((candidate) => findPhrase(unit?.english, candidate.candidate).length === 1 && findPhrase(detail.scriptoriumVerseTranslation, candidate.candidate).length >= 1);
  const byOutput = new Map();
  for (const candidate of supported) {
    const output = hornerVerbatim(unit.english, candidate.candidate);
    if (!output) continue;
    const record = byOutput.get(normalize(output)) ?? { output, evidence: [] };
    record.evidence.push(candidate);
    byOutput.set(normalize(output), record);
  }
  const ranked = [...byOutput.values()].sort((left, right) => {
    const weight = (record) => record.evidence.filter((item) => item.contentBearing).length * 100 + new Set(record.evidence.map((item) => item.evidenceClass)).size * 10 + record.evidence.length;
    return weight(right) - weight(left) || tokenize(right.output).length - tokenize(left.output).length;
  });
  const best = ranked[0];
  const bestClasses = new Set(best?.evidence.map((item) => item.evidenceClass) ?? []);
  const independentEvidenceClasses = [...bestClasses].filter((name) => name !== 'IMMEDIATE_SOURCE_ORDER_HORNER_BOUNDS').length;
  const hasContentEvidence = best?.evidence.some((item) => item.contentBearing) ?? false;
  const display = copticNormalize(cell?.text);
  const source = copticNormalize(detail.sourceSurface);
  const sourceIdentityCompatible = display && source && editDistance(display, source) / Math.max(display.length, source.length) <= 0.25;
  const functionGroupFullySupported = groupFunctionOnly && (detail.norms?.length ?? 0) === 1;
  const admitted = best && independentEvidenceClasses > 0 && (functionGroupFullySupported || hasContentEvidence) && sourceIdentityCompatible && (!ranked[1] || normalize(ranked[1].output) === normalize(best.output));
  const withholdReason = admitted ? null
    : !sourceIdentityCompatible ? 'COPTIC_DISPLAY_AND_SOURCE_GROUP_IDENTITY_REQUIRE_REVIEW'
      : !best ? 'NO_HORNER_WORDING_CORROBORATED_BY_BOTH_SCRIPTORIUM_CONTEXT_AND_PUBLISHED_LEXICAL_OR_ENTITY_EVIDENCE'
        : !(groupFunctionOnly || hasContentEvidence) ? 'ONLY_PARTIAL_FUNCTION_MORPHEME_EVIDENCE_FOR_A_LARGER_COPTIC_GROUP'
          : ranked[1] && normalize(ranked[1].output) !== normalize(best.output) ? 'MULTIPLE_ENGLISH_OUTPUTS_REMAIN_PLAUSIBLE'
            : 'ALIGNMENT_EVIDENCE_BELOW_ADMISSION_THRESHOLD';
  const record = {
    key,
    sourceReference: target.sourceReference,
    rowIndex: target.rowIndex,
    sourceToken: detail.sourceToken,
    coptic: cell?.text ?? target.coptic,
    priorClassification: target.classification,
    decision: admitted ? 'ADMIT_HORNER_WORD_OR_PHRASE' : 'WITHHOLD_ALIGNMENT_UNRESOLVED',
    output: admitted ? best.output : null,
    withholdReason,
    evidence: admitted ? best.evidence : ranked.slice(0, 5),
    sourceIdentityCompatible,
    rejectedAlternatives: admitted ? ranked.slice(1, 5) : ranked.slice(0, 5),
    hornerUnitId: unit?.id ?? null,
  };
  record.decisionSha256 = sha(JSON.stringify(record));
  decisions.push(record);
}

if (APPLY) {
  const touchedFiles = new Set();
  for (const decision of decisions.filter((item) => item.decision === 'ADMIT_HORNER_WORD_OR_PHRASE')) {
    const [book, chapter, verse] = decision.sourceReference.split('.');
    const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    const data = liveFiles.get(file);
    const cell = data.rows[decision.rowIndex]?.coptic;
    if (cell?.provenance?.sourceToken !== decision.sourceToken) throw new Error(`${decision.key}: live source token changed during adjudication`);
    if (cell?.provenance?.hornerAdjudication229?.decisionSha256 === decision.decisionSha256 && cell.gloss?.source === 'Horner' && cell.gloss?.gloss === decision.output) continue;
    if (cell?.gloss?.gloss) throw new Error(`${decision.key}: live English changed during adjudication`);
    cell.gloss = { gloss: decision.output, source: 'Horner', tooltip: `George W. Horner · source-order alignment corroborated by Scriptorium and published lexical/entity evidence · ${decision.hornerUnitId}` };
    cell.provenance.hornerAdjudication229 = { decisionSha256: decision.decisionSha256, unitId: decision.hornerUnitId, status: 'internally-adjudicated-not-independent-scholarly-review' };
    touchedFiles.add(file);
  }
  for (const file of touchedFiles) fs.writeFileSync(file, `${JSON.stringify(liveFiles.get(file), null, 2)}\n`);
}

const counts = decisions.reduce((output, item) => ({ ...output, [item.decision]: (output[item.decision] ?? 0) + 1 }), {});
const report = { generatedAt: new Date().toISOString(), applied: APPLY, cohort: audit.results.length, policy: 'Horner supplies English; Urevangelium aligns only where Scriptorium context plus published lexical/entity recurrence uniquely corroborate the same Horner wording.', counts, decisions };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-horner-229-adjudication.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ cohort: audit.results.length, applied: APPLY, counts }, null, 2));
