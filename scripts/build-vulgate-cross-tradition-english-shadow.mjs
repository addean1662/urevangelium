import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const adjudication = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json'), 'utf8'));
const lexicalShadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vulgate-word-english-shadow.json'), 'utf8'));
const rowEvidence = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vulgate-cross-tradition-row-evidence.json'), 'utf8'));
const outputFile = path.join(ROOT, 'docs/audits/vulgate-cross-tradition-english-shadow.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[^A-Za-z]/gu, '').toLowerCase();
const stopwords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'that', 'this', 'these', 'those', 'he', 'she', 'it', 'they', 'we', 'you', 'i', 'me', 'him', 'her', 'them', 'his', 'their', 'our', 'your', 'not', 'no', 'be', 'is', 'are', 'was', 'were']);
const peerKeys = ['vaticanus', 'byzantine', 'sinaiticus'];
const englishForms = (word) => {
  const value = normalize(word);
  const forms = new Set([value]);
  if (value.endsWith('eth')) forms.add(value.slice(0, -3));
  if (value.endsWith('ed')) forms.add(value.slice(0, -2));
  if (value.endsWith('ing')) forms.add(value.slice(0, -3));
  if (value.endsWith('s') && value.length > 3) forms.add(value.slice(0, -1));
  return forms;
};

function peerVotes(evidence) {
  const votes = new Map();
  for (const key of peerKeys) {
    const words = String(evidence?.[key]?.english ?? '').match(/[A-Za-z]+/gu) ?? [];
    for (const word of new Set(words.map(normalize).filter((item) => item.length >= 3 && !stopwords.has(item)))) {
      const witnesses = votes.get(word) ?? new Set();
      witnesses.add(key);
      votes.set(word, witnesses);
    }
  }
  return votes;
}

const evidenceByKey = new Map(rowEvidence.decisions.map((item) => [`${item.sourceReference}:${item.latinIndex}`, item]));
const lexicalByReference = new Map(lexicalShadow.records.map((record) => [record.sourceReference, record]));
const totals = { unresolvedInput: 0, peerSupportedCandidates: 0, admittedUniqueLocal: 0, admittedUnowned: 0, admittedSharedTranslationUnit: 0, rejectedNoPeerAgreement: 0, rejectedNoUniqueDouayOccurrence: 0, rejectedCompetingLatinClaims: 0 };
const units = [];

for (const unit of adjudication.units) {
  const unresolved = unit.rows.filter((row) => row.action === 'blank-unresolved');
  totals.unresolvedInput += unresolved.length;
  if (!unresolved.length) continue;
  const pending = new Set(unit.pendingEnglishIndices);
  const existingOwner = new Map();
  for (const existing of unit.rows.filter((item) => item.action === 'display')) {
    for (const englishIndex of existing.englishIndices ?? []) existingOwner.set(englishIndex, existing.latinIndex);
  }
  const lexicalRecord = lexicalByReference.get(unit.sourceReference);
  const provisional = [];
  for (const row of unresolved) {
    const evidence = evidenceByKey.get(`${unit.sourceReference}:${row.latinIndex}`);
    const votes = peerVotes(evidence?.evidence);
    const supported = new Set([...votes].filter(([, witnesses]) => witnesses.size >= 2).map(([word]) => word));
    if (!supported.size) {
      totals.rejectedNoPeerAgreement++;
      continue;
    }
    totals.peerSupportedCandidates++;
    const prior = unit.rows.filter((item) => item.action === 'display' && item.latinIndex < row.latinIndex).flatMap((item) => item.englishIndices ?? []);
    const later = unit.rows.filter((item) => item.action === 'display' && item.latinIndex > row.latinIndex).flatMap((item) => item.englishIndices ?? []);
    const lower = prior.length ? Math.max(...prior) : -1;
    const upper = later.length ? Math.min(...later) : unit.publishedEnglish.length;
    const lexicalToken = lexicalRecord?.tokens?.[row.latinIndex];
    const dictionaryWords = new Set((lexicalToken?.whitakerEntries ?? []).flatMap((entry) => String(entry).match(/[A-Za-z]+/gu) ?? []).map(normalize));
    const locallyLexical = (word) => [...englishForms(word)].some((form) => dictionaryWords.has(form));
    const localIndices = unit.publishedEnglish.map((_, index) => index).filter((index) => index >= lower && index <= upper && locallyLexical(unit.publishedEnglish[index]) && supported.has(normalize(unit.publishedEnglish[index])));
    if (localIndices.length !== 1) {
      totals.rejectedNoUniqueDouayOccurrence++;
      continue;
    }
    const englishIndex = localIndices[0];
    provisional.push({
      latinIndex: row.latinIndex,
      latin: row.latin,
      englishIndex,
      english: unit.publishedEnglish[englishIndex],
      peerWitnesses: [...(votes.get(normalize(unit.publishedEnglish[englishIndex])) ?? [])],
      bezaeLatinClassification: evidence?.classification ?? 'NO_EVIDENCE_RECORD',
      priorOwnerLatinIndex: existingOwner.get(englishIndex) ?? null,
      proposedAction: pending.has(englishIndex) ? 'DISPLAY_UNOWNED_DOUAY_TOKEN' : 'CLASSIFY_SHARED_TRANSLATION_UNIT',
      rowId: evidence?.rowId ?? null,
      rule: 'UNIQUE_LOCAL_DOUAY_TOKEN_WITH_TWO_ALIGNED_GREEK_WITNESSES',
    });
  }
  const claims = new Map();
  for (const item of provisional) {
    const owners = claims.get(item.englishIndex) ?? [];
    owners.push(item);
    claims.set(item.englishIndex, owners);
  }
  const admitted = [];
  for (const items of claims.values()) {
    if (items.length !== 1) {
      totals.rejectedCompetingLatinClaims += items.length;
      continue;
    }
    admitted.push(items[0]);
    if (items[0].proposedAction === 'DISPLAY_UNOWNED_DOUAY_TOKEN') totals.admittedUnowned++;
    else totals.admittedSharedTranslationUnit++;
  }
  totals.admittedUniqueLocal += admitted.length;
  if (admitted.length) units.push({ sourceReference: unit.sourceReference, displayReferences: unit.displayReferences, decisions: admitted.sort((a, b) => a.latinIndex - b.latinIndex) });
}

const report = {
  status: 'shadow-only-cross-tradition-english-alignment-evidence',
  generatedAt: new Date().toISOString(),
  scope: 'The displayed token remains verbatim Douay-Rheims. Other traditions establish row correspondence only.',
  inputAdjudicationSha256: adjudication.adjudicationSha256,
  inputRowEvidenceSha256: rowEvidence.reportSha256,
  totals,
  units,
};
report.reportSha256 = sha256(JSON.stringify(report));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, reportSha256: report.reportSha256, output: path.relative(ROOT, outputFile) }, null, 2));
