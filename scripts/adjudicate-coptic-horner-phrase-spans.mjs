import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const WIDE_NEIGHBORS = process.argv.includes('--wide-neighbors');
const cohort = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-229-adjudication.json'), 'utf8'));
const priorPhrase = WIDE_NEIGHBORS
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-phrase-span-adjudication.json'), 'utf8'))
  : null;
const remainingKeys = priorPhrase
  ? new Set(priorPhrase.results.filter((item) => item.classification !== 'ADMIT_HORNER_PHRASE_SPAN').flatMap((item) => item.sourceTokens.map((token) => `${item.sourceReference}:${token}`)))
  : null;
const horner = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const hornerByReference = new Map(horner.units.map((unit) => [unit.sourceReference, unit]));
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results;
const diagnosisByKey = new Map(diagnosis.map((item) => [`${item.sourceReference}:${item.rowIndex}`, item]));
const functionPos = new Set(['ART', 'PREP', 'PPERS', 'PPERO', 'PPOS', 'COP', 'PTC', 'CCIRC', 'APREC', 'APST', 'ANY', 'CONJ', 'CREL', 'PDEM', 'PINT', 'PPERI', 'AOPT', 'ANEGOPT', 'FUT']);
const archaicGroups = [new Set(['you', 'ye', 'thou', 'thee']), new Set(['your', 'thy', 'thine']), new Set(['are', 'art']), new Set(['have', 'hast']), new Set(['has', 'hath']), new Set(['will', 'wilt']), new Set(['shall', 'shalt'])];
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizeWord = (word) => word.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const tokenize = (text) => [...String(text ?? '').matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], word: normalizeWord(match[0]), start: match.index, end: match.index + match[0].length })).filter((token) => token.word);
const stem = (word) => word.length <= 4 ? word : word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
const equivalent = (left, right) => left === right || stem(left) === stem(right) || archaicGroups.some((group) => group.has(left) && group.has(right));
const alternatives = (gloss) => String(gloss ?? '').replace(/\([^)]*\)/g, ' ').split(/[,;/]|\bor\b/iu).map((part) => tokenize(part).map((token) => token.word)).filter((part) => part.length > 0 && part.length <= 5);
const matchesFor = (candidate, tokens) => {
  const matches = [];
  for (let start = 0; start <= tokens.length - candidate.length; start += 1) if (candidate.every((word, index) => equivalent(word, tokens[start + index].word))) matches.push({ start, end: start + candidate.length });
  return matches;
};
const uniqueAnchor = (gloss, tokens) => {
  const matches = alternatives(gloss).flatMap((candidate) => matchesFor(candidate, tokens).map((match) => ({ ...match, candidate })));
  const unique = [...new Map(matches.map((match) => [`${match.start}:${match.end}`, match])).values()];
  return unique.length === 1 ? unique[0] : null;
};
const anchorsForGloss = (gloss, tokens) => {
  const matches = alternatives(gloss).flatMap((candidate) => matchesFor(candidate, tokens).map((match) => ({ ...match, candidate })));
  return [...new Map(matches.map((match) => [`${match.start}:${match.end}`, match])).values()];
};
const allCorroborated = (phraseTokens, scriptoriumEnglish) => {
  const source = tokenize(scriptoriumEnglish).map((token) => token.word);
  return phraseTokens.every((token) => source.some((word) => equivalent(token.word, word)));
};

const shadowByGospel = new Map(['matthew', 'mark', 'luke', 'john'].map((gospel) => {
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`), 'utf8'));
  return [gospel, new Map(shadow.decisions.map((item) => [`${item.reference}:${item.sourceToken}`, item]))];
}));
const byReference = new Map();
const reviewedPhraseAdmissions = new Set([
  'horner-phrase-matt-12-19-10-10',
  'horner-phrase-matt-12-29-9-9',
  'horner-phrase-luke-1-15-7-8',
  'horner-phrase-luke-1-36-9-9',
  'horner-phrase-luke-1-36-11-11',
  'horner-phrase-luke-21-21-5-5',
  'horner-phrase-luke-22-10-21-21',
  'horner-phrase-luke-22-31-1-2',
  'horner-phrase-john-6-39-5-5',
  'horner-phrase-john-9-22-20-20',
]);
const reviewedCellAllocations = new Map([
  ['horner-phrase-luke-1-15-7-8', ['strong', 'drink']],
  ['horner-phrase-luke-22-31-1-2', ['Simon,', 'Simon']],
]);
for (const decision of cohort.decisions.filter((item) => item.decision === 'WITHHOLD_ALIGNMENT_UNRESOLVED')) {
  if (remainingKeys && !remainingKeys.has(`${decision.sourceReference}:${decision.sourceToken}`)) continue;
  const entries = byReference.get(decision.sourceReference) ?? [];
  entries.push(decision);
  byReference.set(decision.sourceReference, entries);
}

const files = new Map();
const results = [];
for (const [sourceReference, entries] of byReference) {
  const [book, chapter, verse] = sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  files.set(file, data);
  const sequence = data.rows.map((row, rowIndex) => ({ rowIndex, cell: row.coptic })).filter((entry) => entry.cell?.type === 'text' && Number.isInteger(entry.cell.provenance?.sourceToken)).sort((left, right) => left.cell.provenance.sourceToken - right.cell.provenance.sourceToken);
  const unit = hornerByReference.get(sourceReference);
  const hornerTokens = tokenize(unit?.english);
  const entryByToken = new Map(entries.map((entry) => [entry.sourceToken, entry]));
  const sourceTokens = [...entryByToken.keys()].sort((left, right) => left - right);
  const clusters = [];
  for (const token of sourceTokens) {
    const previous = clusters.at(-1);
    if (previous && token === previous.at(-1) + 1) previous.push(token); else clusters.push([token]);
  }
  for (const cluster of clusters) {
    const members = cluster.map((token) => entryByToken.get(token));
    const blockedIdentity = members.some((member) => member.withholdReason === 'COPTIC_DISPLAY_AND_SOURCE_GROUP_IDENTITY_REQUIRE_REVIEW');
    const beforeCell = sequence.filter((entry) => entry.cell.provenance.sourceToken < cluster[0] && (!WIDE_NEIGHBORS || entry.cell.gloss?.gloss)).at(-1) ?? null;
    const afterCell = sequence.filter((entry) => entry.cell.provenance.sourceToken > cluster.at(-1) && (!WIDE_NEIGHBORS || entry.cell.gloss?.gloss))[0] ?? null;
    const beforeAnchors = beforeCell?.cell.gloss?.gloss ? anchorsForGloss(beforeCell.cell.gloss.gloss, hornerTokens) : [];
    const afterAnchors = afterCell?.cell.gloss?.gloss ? anchorsForGloss(afterCell.cell.gloss.gloss, hornerTokens) : [];
    let before = null;
    let after = null;
    if (beforeAnchors.length && afterAnchors.length) {
      const pairs = beforeAnchors.flatMap((left) => afterAnchors.filter((right) => left.end <= right.start).map((right) => ({ left, right, size: right.start - left.end }))).sort((left, right) => left.size - right.size || right.left.end - left.left.end || left.right.start - right.right.start);
      if (pairs.length) { before = { ...beforeCell, anchor: pairs[0].left }; after = { ...afterCell, anchor: pairs[0].right }; }
    } else if (beforeAnchors.length && !afterCell) {
      const anchor = [...beforeAnchors].sort((left, right) => right.end - left.end)[0];
      before = { ...beforeCell, anchor };
    } else if (afterAnchors.length && !beforeCell) {
      const anchor = [...afterAnchors].sort((left, right) => left.start - right.start)[0];
      after = { ...afterCell, anchor };
    }
    const start = before?.anchor.end ?? 0;
    const end = after?.anchor.start ?? hornerTokens.length;
    const phraseTokens = start < end ? hornerTokens.slice(start, end) : [];
    const scriptoriumEnglish = diagnosisByKey.get(`${sourceReference}:${members[0].rowIndex}`)?.scriptoriumVerseTranslation;
    const scale = members.reduce((count, member) => count + (diagnosisByKey.get(`${sourceReference}:${member.rowIndex}`)?.norms.length ?? 1), 0);
    let classification = 'ADMIT_HORNER_PHRASE_SPAN';
    if (blockedIdentity) classification = 'WITHHOLD_SOURCE_IDENTITY_REVIEW';
    else if (!unit || !scriptoriumEnglish) classification = 'WITHHOLD_SOURCE_TRANSLATION_UNAVAILABLE';
    else if (!before && !after) classification = 'WITHHOLD_IMMEDIATE_SOURCE_NEIGHBORS_DO_NOT_ANCHOR';
    else if (before && after && before.anchor.end >= after.anchor.start) classification = 'WITHHOLD_ANCHORS_UNORDERED';
    else if (!phraseTokens.length) classification = 'WITHHOLD_EMPTY_HORNER_SPAN';
    else if (phraseTokens.length > Math.max(8, scale * 3)) classification = 'WITHHOLD_PHRASE_EXCEEDS_GROUP_SCALE';
    else if (!allCorroborated(phraseTokens, scriptoriumEnglish)) classification = 'WITHHOLD_SCRIPTORIUM_DOES_NOT_CORROBORATE_WHOLE_PHRASE';
    const phrase = phraseTokens.length ? unit.english.slice(phraseTokens[0].start, phraseTokens.at(-1).end).replace(/\s+/g, ' ').trim() : null;
    const record = { sourceReference, gospel, chapter, verse, sourceTokens: cluster, rowIndexes: members.map((member) => member.rowIndex), coptic: members.map((member) => member.coptic), hornerUnitId: unit?.id ?? null, hornerSpan: { start, end }, phrase, leftAnchor: before ? { sourceToken: before.cell.provenance.sourceToken, gloss: before.cell.gloss.gloss, span: before.anchor } : null, rightAnchor: after ? { sourceToken: after.cell.provenance.sourceToken, gloss: after.cell.gloss.gloss, span: after.anchor } : null, scriptoriumEnglish, classification };
    record.id = `horner-phrase-${sourceReference.toLowerCase().replaceAll('.', '-')}-${cluster[0]}-${cluster.at(-1)}`;
    if (record.classification === 'ADMIT_HORNER_PHRASE_SPAN' && WIDE_NEIGHBORS) record.classification = 'CANDIDATE_WIDE_SOURCE_ANCHOR_SPAN';
    else if (record.classification === 'ADMIT_HORNER_PHRASE_SPAN' && !reviewedPhraseAdmissions.has(record.id)) record.classification = 'WITHHOLD_PHRASE_BOUNDARY_REVIEW';
    record.decisionSha256 = sha(JSON.stringify(record));
    results.push(record);
  }
}

if (APPLY) {
  const touched = new Set();
  for (const result of results.filter((item) => item.classification === 'ADMIT_HORNER_PHRASE_SPAN')) {
    const file = path.join(ROOT, 'data', result.gospel, result.chapter, `${result.verse}.json`);
    const data = files.get(file);
    const allocations = reviewedCellAllocations.get(result.id);
    if (allocations && allocations.length !== result.rowIndexes.length) throw new Error(`${result.id}: reviewed cell allocation does not cover the phrase span`);
    for (const [memberIndex, rowIndex] of result.rowIndexes.entries()) {
      const cell = data.rows[rowIndex]?.coptic;
      const existing = cell?.provenance?.hornerPhraseAdjudication229;
      if (existing?.decisionSha256 === result.decisionSha256 && (allocations ? cell.gloss?.gloss === allocations[memberIndex] && !cell.gloss?.spanId : cell.gloss?.spanId === result.id)) continue;
      if (cell?.gloss?.gloss) throw new Error(`${result.sourceReference}:${rowIndex}: phrase adjudication would overwrite existing English`);
      cell.gloss = allocations
        ? { gloss: allocations[memberIndex], source: 'Horner', tooltip: `George W. Horner · reviewed cell allocation within phrase-level source-order alignment · ${result.hornerUnitId}` }
        : { gloss: memberIndex === 0 ? result.phrase : '', source: 'Horner', tooltip: `George W. Horner · phrase-level source-order alignment corroborated by Scriptorium · ${result.hornerUnitId}`, spanId: result.id, spanRole: memberIndex === 0 ? 'start' : 'continuation' };
      cell.provenance.hornerPhraseAdjudication229 = { decisionSha256: result.decisionSha256, unitId: result.hornerUnitId, phraseUnitId: result.id, status: 'internally-adjudicated-not-independent-scholarly-review' };
      touched.add(file);
    }
  }
  for (const file of touched) fs.writeFileSync(file, `${JSON.stringify(files.get(file), null, 2)}\n`);
}

const counts = results.reduce((output, item) => ({ ...output, [item.classification]: (output[item.classification] ?? 0) + 1 }), {});
const admittedGroups = results.filter((item) => item.classification === 'ADMIT_HORNER_PHRASE_SPAN').reduce((sum, item) => sum + item.sourceTokens.length, 0);
const report = { generatedAt: new Date().toISOString(), applied: APPLY, sourceCohort: 215, phraseUnits: results.length, admittedGroups, counts, results };
fs.writeFileSync(path.join(ROOT, 'docs/audits', WIDE_NEIGHBORS ? 'coptic-horner-wide-source-anchor-adjudication.json' : 'coptic-horner-phrase-span-adjudication.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ applied: APPLY, sourceCohort: 215, phraseUnits: results.length, admittedGroups, counts }, null, 2));
