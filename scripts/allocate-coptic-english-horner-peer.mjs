import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
if (APPLY) throw new Error('Retired: same visual-row agreement is not a valid Sahidic word-allocation rule. Use source-token-order adjudication.');
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results
  .filter((item) => item.classification !== 'PUNCTUATION_CORRECTLY_HAS_NO_ENGLISH' && item.scriptoriumVerseTranslation);
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const unitByReference = new Map(ledger.units.map((unit) => [unit.sourceReference, unit]));
const witnesses = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
const leadingFunctionWords = new Set(['and', 'of', 'to', 'the', 'in', 'from', 'by', 'for', 'but']);
const archaicGroups = [new Set(['you', 'ye', 'thou', 'thee']), new Set(['your', 'thy', 'thine']), new Set(['are', 'art']), new Set(['have', 'hast']), new Set(['has', 'hath']), new Set(['will', 'wilt']), new Set(['shall', 'shalt'])];
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizeWord = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const tokenize = (text) => [...String(text ?? '').matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], word: normalizeWord(match[0]), start: match.index ?? 0, end: (match.index ?? 0) + match[0].length })).filter((token) => token.word);
const stem = (word) => word.length <= 4 ? word : word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
const equivalent = (left, right) => left === right || stem(left) === stem(right) || archaicGroups.some((group) => group.has(left) && group.has(right));
const variants = (gloss) => {
  const tokens = tokenize(gloss).map((token) => token.word);
  const output = [tokens];
  let core = [...tokens];
  while (core.length > 1 && leadingFunctionWords.has(core[0])) core = core.slice(1);
  if (core.length && core.length !== tokens.length) output.push(core);
  return output.filter((candidate) => candidate.length > 0 && candidate.length <= 6);
};
const matchesFor = (candidate, hornerTokens) => {
  const matches = [];
  for (let start = 0; start <= hornerTokens.length - candidate.length; start += 1) {
    if (candidate.every((word, index) => equivalent(word, hornerTokens[start + index].word))) matches.push({ start, end: start + candidate.length });
  }
  return matches;
};
const peerSpansForRow = (row, hornerTokens) => {
  const supportBySpan = new Map();
  for (const witness of witnesses) {
    const gloss = row?.[witness]?.gloss?.gloss;
    if (!gloss || gloss === '↳') continue;
    for (const candidate of variants(gloss)) {
      for (const match of matchesFor(candidate, hornerTokens)) {
        const key = `${match.start}:${match.end}`;
        const record = supportBySpan.get(key) ?? { ...match, witnesses: new Set(), peerGlosses: new Set() };
        record.witnesses.add(witness);
        record.peerGlosses.add(gloss);
        supportBySpan.set(key, record);
      }
    }
  }
  return [...supportBySpan.values()].filter((record) => record.witnesses.size >= 2);
};

const preliminary = [];
const files = new Map();
for (const item of diagnosis) {
  const unit = unitByReference.get(item.sourceReference);
  if (!unit) { preliminary.push({ ...item, classification: 'NO_BOUNDED_HORNER_UNIT' }); continue; }
  const [book, chapter, verse] = item.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  let data = files.get(file);
  if (!data) { data = JSON.parse(fs.readFileSync(file, 'utf8')); files.set(file, data); }
  const row = data.rows[item.rowIndex];
  const hornerTokens = tokenize(unit.english);
  const supported = peerSpansForRow(row, hornerTokens);
  supported.sort((left, right) => right.witnesses.size - left.witnesses.size || (right.end - right.start) - (left.end - left.start));
  const best = supported[0];
  const tied = best && supported.some((record, index) => index > 0 && record.witnesses.size === best.witnesses.size && (record.start !== best.start || record.end !== best.end));
  if (!best || tied) {
    preliminary.push({ ...item, peerEvidence: supported.map((record) => ({ ...record, witnesses: [...record.witnesses], peerGlosses: [...record.peerGlosses] })), classification: !best ? 'NO_TWO_WITNESS_HORNER_MATCH' : 'MULTIPLE_HORNER_SPANS_HAVE_EQUAL_PEER_SUPPORT' });
    continue;
  }
  const allocation = unit.english.slice(hornerTokens[best.start].start, hornerTokens[best.end - 1].end).replace(/\s+/g, ' ').trim();
  const record = { sourceReference: item.sourceReference, rowIndex: item.rowIndex, sourceToken: item.sourceToken, coptic: item.coptic, allocation, hornerUnitId: unit.id, span: { start: best.start, end: best.end }, corroboratingWitnesses: [...best.witnesses], peerGlosses: [...best.peerGlosses], classification: 'HORNER_PEER_ALLOCATION_CANDIDATE' };
  record.decisionSha256 = sha(JSON.stringify(record));
  preliminary.push(record);
}

for (const result of preliminary.filter((item) => item.classification === 'MULTIPLE_HORNER_SPANS_HAVE_EQUAL_PEER_SUPPORT')) {
  const unit = unitByReference.get(result.sourceReference);
  const [book, chapter, verse] = result.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = files.get(file);
  const hornerTokens = tokenize(unit.english);
  let lower = -1;
  for (let index = result.rowIndex - 1; index >= 0; index -= 1) {
    const spans = peerSpansForRow(data.rows[index], hornerTokens);
    if (spans.length === 1) { lower = spans[0].end; break; }
  }
  let upper = hornerTokens.length + 1;
  for (let index = result.rowIndex + 1; index < data.rows.length; index += 1) {
    const spans = peerSpansForRow(data.rows[index], hornerTokens);
    if (spans.length === 1) { upper = spans[0].start; break; }
  }
  const maximumSupport = Math.max(...result.peerEvidence.map((span) => span.witnesses.length));
  const ordered = result.peerEvidence.filter((span) => span.witnesses.length === maximumSupport && span.start >= lower && span.end <= upper);
  if (ordered.length !== 1) continue;
  const best = ordered[0];
  result.allocation = unit.english.slice(hornerTokens[best.start].start, hornerTokens[best.end - 1].end).replace(/\s+/g, ' ').trim();
  result.hornerUnitId = unit.id;
  result.span = { start: best.start, end: best.end };
  result.corroboratingWitnesses = best.witnesses;
  result.peerGlosses = best.peerGlosses;
  result.orderBounds = { lower, upper };
  result.classification = 'HORNER_PEER_ALLOCATION_CANDIDATE';
  result.decisionSha256 = sha(JSON.stringify({ sourceReference: result.sourceReference, rowIndex: result.rowIndex, sourceToken: result.sourceToken, coptic: result.coptic, allocation: result.allocation, hornerUnitId: result.hornerUnitId, span: result.span, corroboratingWitnesses: result.corroboratingWitnesses, peerGlosses: result.peerGlosses, orderBounds: result.orderBounds }));
}

const spanOwners = new Map();
for (const result of preliminary.filter((item) => item.classification === 'HORNER_PEER_ALLOCATION_CANDIDATE')) {
  for (let token = result.span.start; token < result.span.end; token += 1) {
    const key = `${result.sourceReference}:${token}`;
    const owners = spanOwners.get(key) ?? [];
    owners.push(result);
    spanOwners.set(key, owners);
  }
}
for (const result of preliminary.filter((item) => item.classification === 'HORNER_PEER_ALLOCATION_CANDIDATE')) {
  const collision = [...Array(result.span.end - result.span.start)].some((_, offset) => (spanOwners.get(`${result.sourceReference}:${result.span.start + offset}`) ?? []).length > 1);
  result.classification = collision ? 'HORNER_TOKEN_OWNERSHIP_COLLISION' : 'HORNER_PEER_ALLOCATION_ADMITTED';
}

if (APPLY) {
  for (const result of preliminary.filter((item) => item.classification === 'HORNER_PEER_ALLOCATION_ADMITTED')) {
    const [book, chapter, verse] = result.sourceReference.split('.');
    const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    const data = files.get(file);
    const cell = data.rows[result.rowIndex]?.coptic;
    if (cell?.type !== 'text' || cell.gloss?.gloss || cell.provenance?.sourceToken !== result.sourceToken) throw new Error(`${result.sourceReference} row ${result.rowIndex}: live cell does not match peer allocation evidence`);
    cell.gloss = { gloss: result.allocation, source: 'Horner', tooltip: `George W. Horner · same-row comparative corroboration: ${result.corroboratingWitnesses.join(', ')} · ${result.hornerUnitId}` };
    cell.provenance.hornerPeerAllocation = { unitId: result.hornerUnitId, decisionSha256: result.decisionSha256, status: 'internally-adjudicated-not-independent-scholarly-review' };
  }
  for (const [file, data] of files) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
const counts = preliminary.reduce((output, item) => { output[item.classification] = (output[item.classification] ?? 0) + 1; return output; }, {});
const report = { generatedAt: new Date().toISOString(), applied: APPLY, eligibleRows: diagnosis.length, counts, results: preliminary };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-horner-peer-allocations.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: APPLY ? 'applied' : 'audited', eligibleRows: diagnosis.length, counts }, null, 2));
