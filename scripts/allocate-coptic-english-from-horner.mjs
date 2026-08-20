import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results
  .filter((item) => item.classification !== 'PUNCTUATION_CORRECTLY_HAS_NO_ENGLISH' && item.scriptoriumVerseTranslation);
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const crumLookup = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/coptic/crum-lookup.json'), 'utf8'));
const unitByReference = new Map(ledger.units.map((unit) => [unit.sourceReference, unit]));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const archaicGroups = [new Set(['you', 'ye', 'thou', 'thee']), new Set(['your', 'thy', 'thine']), new Set(['are', 'art']), new Set(['have', 'hast']), new Set(['has', 'hath']), new Set(['will', 'wilt']), new Set(['shall', 'shalt'])];
const normalizeWord = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const tokenize = (text) => [...text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], word: normalizeWord(match[0]), start: match.index ?? 0, end: (match.index ?? 0) + match[0].length })).filter((token) => token.word);
const stem = (word) => word.length <= 4 ? word : word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
const functionEnglish = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'he', 'her', 'him', 'his', 'i', 'in', 'it', 'me', 'my', 'of', 'on', 'or', 'she', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'us', 'we', 'who', 'you', 'your']);
const equivalent = (left, right) => left === right || stem(left) === stem(right) || archaicGroups.some((group) => group.has(left) && group.has(right));
const glossAlternatives = (gloss) => gloss.replace(/\([^)]*\)/g, ' ').split(/[,;/]|\bor\b/iu).map((part) => tokenize(part).map((token) => token.word)).filter((part) => part.length > 0 && part.length <= 4);
const anchorForGloss = (gloss, hornerTokens) => {
  if (!gloss) return null;
  const matches = [];
  for (const candidate of glossAlternatives(gloss)) {
    for (let start = 0; start <= hornerTokens.length - candidate.length; start += 1) {
      if (candidate.every((word, index) => equivalent(word, hornerTokens[start + index].word))) matches.push({ start, end: start + candidate.length, candidate });
    }
  }
  const unique = [...new Map(matches.map((match) => [`${match.start}:${match.end}`, match])).values()];
  return unique.length === 1 ? unique[0] : null;
};
const copticSourceSequence = (rows) => rows
  .map((row, rowIndex) => ({ rowIndex, cell: row.coptic }))
  .filter((entry) => entry.cell?.type === 'text' && Number.isInteger(entry.cell.provenance?.sourceToken))
  .sort((left, right) => left.cell.provenance.sourceToken - right.cell.provenance.sourceToken);
const anchoredNeighbor = (sequence, sourceToken, direction, hornerTokens) => {
  const candidates = sequence.filter((entry) => direction < 0
    ? entry.cell.provenance.sourceToken < sourceToken
    : entry.cell.provenance.sourceToken > sourceToken);
  const entry = direction < 0 ? candidates.at(-1) : candidates[0];
  return entry ? { ...entry, anchor: anchorForGloss(entry.cell.gloss?.gloss, hornerTokens) } : { rowIndex: -1, cell: null, anchor: null };
};

const results = [];
const files = new Map();
for (const item of diagnosis) {
  const unit = unitByReference.get(item.sourceReference);
  if (!unit) {
    results.push({ ...item, allocation: null, classification: 'NO_BOUNDED_HORNER_UNIT' });
    continue;
  }
  const [book, chapter, verse] = item.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  let verseData = files.get(file);
  if (!verseData) { verseData = JSON.parse(fs.readFileSync(file, 'utf8')); files.set(file, verseData); }
  const sourceSequence = copticSourceSequence(verseData.rows);
  const hornerTokens = tokenize(unit.english);
  const previousNeighbor = anchoredNeighbor(sourceSequence, item.sourceToken, -1, hornerTokens);
  const nextNeighbor = anchoredNeighbor(sourceSequence, item.sourceToken, 1, hornerTokens);
  const previous = previousNeighbor.cell;
  const next = nextNeighbor.cell;
  if (previous?.type !== 'text' || next?.type !== 'text' || !previous.gloss?.gloss || !next.gloss?.gloss) {
    results.push({ ...item, allocation: null, previousRowIndex: previousNeighbor.rowIndex, nextRowIndex: nextNeighbor.rowIndex, previousHasGloss: Boolean(previous?.gloss?.gloss), nextHasGloss: Boolean(next?.gloss?.gloss), classification: 'NEAREST_SOURCE_SEQUENCE_HORNER_ANCHORS_UNAVAILABLE' });
    continue;
  }
  const previousAnchor = previousNeighbor.anchor;
  const nextAnchor = nextNeighbor.anchor;
  if (!previousAnchor || !nextAnchor || previousAnchor.end >= nextAnchor.start) {
    results.push({ ...item, allocation: null, previousGloss: previous.gloss.gloss, nextGloss: next.gloss.gloss, classification: 'HORNER_ANCHORS_AMBIGUOUS_OR_UNORDERED' });
    continue;
  }
  let candidateTokens = hornerTokens.slice(previousAnchor.end, nextAnchor.start);
  const unresolvedBetweenAnchors = sourceSequence.filter((entry) => entry.cell.provenance.sourceToken > previous.provenance.sourceToken
    && entry.cell.provenance.sourceToken < next.provenance.sourceToken
    && !entry.cell.gloss?.gloss);
  if (unresolvedBetweenAnchors.length !== 1 || unresolvedBetweenAnchors[0].cell.provenance.sourceToken !== item.sourceToken) {
    results.push({ ...item, allocation: null, unresolvedSourceTokens: unresolvedBetweenAnchors.map((entry) => entry.cell.provenance.sourceToken), classification: 'HORNER_SPAN_COVERS_MULTIPLE_UNRESOLVED_COPTIC_GROUPS' });
    continue;
  }
  if (candidateTokens.length < 1 || candidateTokens.length > 5) {
    results.push({ ...item, allocation: null, previousAnchor, nextAnchor, classification: 'BOUNDED_HORNER_SPAN_NOT_SINGLE_GROUP_SCALE' });
    continue;
  }
  const poses = item.norms.map((norm) => norm.pos).filter(Boolean);
  const hasProperName = poses.includes('NPROP');
  const functionOnly = poses.length > 0 && poses.every((pos) => ['ART', 'PREP', 'PPERS', 'PPERO', 'PPOS', 'COP', 'PTC', 'CCIRC', 'APREC', 'APST', 'ANY', 'CONJ', 'CREL', 'PDEM', 'PINT', 'PPERI'].includes(pos));
  if (hasProperName) {
    const names = candidateTokens.filter((token) => /^[A-Z]/.test(token.raw));
    if (names.length !== 1) {
      results.push({ ...item, allocation: null, candidate: candidateTokens.map((token) => token.raw).join(' '), classification: 'HORNER_PROPER_NAME_NOT_UNIQUELY_BOUNDED' });
      continue;
    }
    candidateTokens = names;
  } else if (functionOnly) {
    results.push({ ...item, allocation: null, candidate: candidateTokens.map((token) => token.raw).join(' '), classification: 'FUNCTION_GROUP_REQUIRES_PHRASE_LEVEL_ADJUDICATION' });
    continue;
  } else if (candidateTokens.length > item.norms.length + 1) {
    results.push({ ...item, allocation: null, candidate: candidateTokens.map((token) => token.raw).join(' '), classification: 'HORNER_SPAN_EXCEEDS_RECORDED_MORPHEME_SCALE' });
    continue;
  }
  const lexicalWords = new Set(item.norms.flatMap((norm) => tokenize(crumLookup[norm.lemma] ?? '').map((token) => token.word)));
  const substantiveCandidateWords = candidateTokens.map((token) => token.word).filter((word) => !functionEnglish.has(word));
  const lexicalCorroboration = substantiveCandidateWords.filter((word) => [...lexicalWords].some((candidate) => equivalent(word, candidate)));
  if (!hasProperName && substantiveCandidateWords.length > 0 && lexicalCorroboration.length === 0) {
    results.push({ ...item, allocation: null, candidate: candidateTokens.map((token) => token.raw).join(' '), lexicalEvidence: item.norms.map((norm) => ({ lemma: norm.lemma, gloss: crumLookup[norm.lemma] ?? null })), classification: 'COPTIC_COMPONENT_LEXICON_DOES_NOT_SUPPORT_HORNER_SPAN' });
    continue;
  }
  const scriptoriumWords = tokenize(item.scriptoriumVerseTranslation).map((token) => token.word);
  const corroborated = candidateTokens.filter((token) => scriptoriumWords.some((word) => equivalent(token.word, word))).length;
  const corroborationRatio = corroborated / candidateTokens.length;
  if (!hasProperName && corroborationRatio < 1) {
    results.push({ ...item, allocation: null, candidate: candidateTokens.map((token) => token.raw).join(' '), corroborationRatio, classification: 'SCRIPTORIUM_CONTEXT_DOES_NOT_CORROBORATE_BOUNDED_HORNER_SPAN' });
    continue;
  }
  const start = candidateTokens[0].start;
  const end = candidateTokens.at(-1).end;
  const allocation = unit.english.slice(start, end).replace(/\s+/g, ' ').trim();
  const record = {
    sourceReference: item.sourceReference,
    rowIndex: item.rowIndex,
    sourceToken: item.sourceToken,
    coptic: item.coptic,
    allocation,
    hornerUnitId: unit.id,
    hornerEnglish: unit.english,
    previousAnchor,
    nextAnchor,
    scriptoriumVerseTranslation: item.scriptoriumVerseTranslation,
    corroborationRatio,
    classification: 'HORNER_BOUNDED_ALLOCATION_ADMITTED',
  };
  record.decisionSha256 = sha(JSON.stringify(record));
  results.push(record);
  if (APPLY) {
    const cell = verseData.rows[item.rowIndex]?.coptic;
    if (cell?.type !== 'text' || cell.gloss?.gloss || cell.provenance?.sourceToken !== item.sourceToken) throw new Error(`${item.sourceReference} row ${item.rowIndex}: live Coptic cell no longer matches allocation evidence`);
    cell.gloss = { gloss: allocation, source: 'Horner', tooltip: `George W. Horner · bounded allocation corroborated by Scriptorium context · ${unit.id}` };
    cell.provenance.hornerAllocation = { unitId: unit.id, decisionSha256: record.decisionSha256, status: 'internally-adjudicated-not-independent-scholarly-review' };
  }
}

if (APPLY) for (const [file, data] of files) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const counts = results.reduce((output, result) => { output[result.classification] = (output[result.classification] ?? 0) + 1; return output; }, {});
const report = { generatedAt: new Date().toISOString(), applied: APPLY, eligibleRows: diagnosis.length, counts, results };
const outputPath = path.join(ROOT, 'docs/audits/coptic-horner-allocations.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: APPLY ? 'applied' : 'audited', eligibleRows: diagnosis.length, counts }, null, 2));
