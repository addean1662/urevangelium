import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const phrase = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-phrase-span-adjudication.json'), 'utf8'));
const diagnosis = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json'), 'utf8')).results;
const diagnosisByKey = new Map(diagnosis.map((item) => [`${item.sourceReference}:${item.rowIndex}`, item]));
const wordLedger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-229-adjudication.json'), 'utf8'));
const wordByKey = new Map(wordLedger.decisions.map((item) => [item.key, item]));
const horner = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const hornerByReference = new Map(horner.units.map((unit) => [unit.sourceReference, unit]));
const crum = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/coptic/crum-lookup.json'), 'utf8'));
const witnesses = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value) => normalize(value).split(/\s+/).filter(Boolean);
const functionWords = new Set(['a', 'an', 'and', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'he', 'her', 'him', 'his', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'she', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'us', 'we', 'who', 'you', 'your']);
const withheldUnits = phrase.results.filter((item) => item.classification !== 'ADMIT_HORNER_PHRASE_SPAN');
const records = [];

for (const unit of withheldUnits) {
  const [book, chapter, verse] = unit.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, `${verse}.json`), 'utf8'));
  const hornerUnit = hornerByReference.get(unit.sourceReference);
  for (const [index, rowIndex] of unit.rowIndexes.entries()) {
    const key = `${unit.sourceReference}:${rowIndex}`;
    const detail = diagnosisByKey.get(key);
    const row = data.rows[rowIndex];
    const lexicalEvidence = (detail?.norms ?? []).map((norm) => ({ lemma: norm.lemma, pos: norm.pos, gloss: crum[norm.lemma] ?? null }));
    const lexicalWords = new Set(lexicalEvidence.flatMap((item) => words(item.gloss)));
    const hornerWords = new Set(words(hornerUnit?.english));
    const scriptoriumWords = new Set(words(detail?.scriptoriumVerseTranslation));
    const sharedLexicalWords = [...lexicalWords].filter((word) => !functionWords.has(word) && hornerWords.has(word) && scriptoriumWords.has(word));
    const peerRows = [row, data.rows[rowIndex - 1], data.rows[rowIndex + 1]].filter(Boolean);
    const peerEvidence = Object.fromEntries(witnesses.map((witness) => [witness, [...new Set(peerRows.map((candidate) => candidate[witness]?.gloss?.gloss).filter((value) => value && value !== '↳'))]]).filter(([, values]) => values.length));
    const wordDecision = wordByKey.get(key);
    records.push({
      key,
      sourceReference: unit.sourceReference,
      rowIndex,
      sourceToken: unit.sourceTokens[index],
      coptic: row?.coptic?.text ?? unit.coptic[index],
      hornerEnglish: hornerUnit?.english ?? null,
      scriptoriumEnglish: detail?.scriptoriumVerseTranslation ?? null,
      lexicalEvidence,
      sharedLexicalWords,
      peerEvidence,
      priorWordWithholdReason: wordDecision?.withholdReason ?? null,
      phraseWithholdReason: unit.classification,
    });
  }
}

const summary = {
  remainingGroups: records.length,
  hornerVerseEnglishAvailable: records.filter((item) => item.hornerEnglish).length,
  scriptoriumVerseEnglishAvailable: records.filter((item) => item.scriptoriumEnglish).length,
  bothVerseEnglishSourcesAvailable: records.filter((item) => item.hornerEnglish && item.scriptoriumEnglish).length,
  kelliaComponentGlossAvailable: records.filter((item) => item.lexicalEvidence.some((evidence) => evidence.gloss)).length,
  substantiveKelliaWordSharedByHornerAndScriptorium: records.filter((item) => item.sharedLexicalWords.length).length,
  comparativeTraditionEvidenceSameOrAdjacentRow: records.filter((item) => Object.keys(item.peerEvidence).length).length,
  atLeastTwoComparativeTraditionsSameOrAdjacentRow: records.filter((item) => Object.keys(item.peerEvidence).length >= 2).length,
};
const report = { generatedAt: new Date().toISOString(), summary, records };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-203-other-source-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
