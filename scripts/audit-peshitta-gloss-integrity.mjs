/** Independent, read-only audit. Source fidelity and semantic review are separate outcomes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const englishPath = 'data/sources/peshitta/murdock-admitted-units.json';
const sedraPath = 'data/sources/peshitta/sedra-inserted-token-evidence.json';
const morphologyPath = 'docs/audits/peshitta-etcbc-morphology-concordance.json';
const source = read(englishPath);
const sedra = new Map(read(sedraPath).records.map(record => [record.token, record]));
const morphology = new Map(read(morphologyPath).records.map(record => [record.reference, record.mappedTokens]));
const tokens = text => text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu) ?? [];
const failures = [];
const packets = [];
const reviewedExamples = [];
const counts = { verses: 0, displayedEnglishWords: 0, translationFailures: 0, semanticReviewCandidates: 0, candidateVerses: 0 };
const grammaticalWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'his', 'her', 'their', 'its', 'of', 'to', 'from', 'in', 'on', 'at', 'with']);

for (const [reference, unit] of Object.entries(source.units)) {
  const [gospel, chapter, verse] = reference.split(/[ :]/u);
  const document = read(`data/${gospel}/${chapter}/${verse}.json`);
  const expected = tokens(unit.english);
  const used = Array(expected.length).fill(0);
  const candidates = [];
  const cells = document.rows.filter(row => ['text', 'translation'].includes(row.peshitta?.type))
    .map(row => ({ rowId: row.id, ...row.peshitta }));
  const textCells = cells.filter(cell => cell.type === 'text').sort((a, b) => a.provenance.sourceToken - b.provenance.sourceToken);
  const failuresBefore = failures.length;
  for (const cell of cells) {
    const indices = cell.type === 'translation' ? [cell.provenance?.englishIndex] : cell.provenance?.englishAlignment?.englishIndices ?? [];
    const actual = tokens(cell.gloss?.gloss ?? '');
    const promised = indices.map(index => expected[index]);
    if (JSON.stringify(actual) !== JSON.stringify(promised)) failures.push({ reference, rowId: cell.rowId, issue: 'DISPLAYED_WORDING_DIFFERS_FROM_PUBLISHED_INDICES', actual, promised, indices });
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= expected.length) failures.push({ reference, rowId: cell.rowId, issue: 'INVALID_PUBLISHED_WORD_INDEX', index });
      else used[index] += 1;
    }
    counts.displayedEnglishWords += actual.length;
    if (cell.type !== 'text') continue;
    const lexical = sedra.get(cell.text)?.analyses ?? [];
    const proper = lexical.filter(a => a.category === 'proper noun');
    if (proper.length && proper.length === lexical.length && actual.length && actual.every(word => grammaticalWords.has(word.toLowerCase()))) {
      candidates.push({ rowId: cell.rowId, sourceToken: cell.provenance.sourceToken, issue: 'PROPER_NAME_RECEIVES_ONLY_GRAMMATICAL_ENGLISH', severity: 'review', syriac: cell.text, english: cell.gloss.gloss,
        lexicalEvidence: [...new Set(proper.flatMap(a => a.englishGlosses ?? []))] });
    }
    for (let i = 1; i < actual.length; i += 1) {
      if (actual[i].toLowerCase() !== actual[i - 1].toLowerCase()) continue;
      candidates.push({ rowId: cell.rowId, sourceToken: cell.provenance.sourceToken, issue: 'REPEATED_ENGLISH_OCCURRENCES_ON_ONE_SOURCE_TOKEN', severity: 'review', syriac: cell.text, english: cell.gloss.gloss, indices,
        limitation: 'A candidate for contextual review, not proof of an error: source idioms may legitimately expand or repeat in translation.' });
    }
  }
  if (used.some(n => n !== 1)) failures.push({ reference, issue: 'PUBLISHED_WORDS_NOT_ACCOUNTED_FOR_ONCE', occurrences: used });
  const fidelity = failures.length === failuresBefore ? 'pass-lexical-wording-and-occurrence-accounting' : 'fail';
  if (candidates.length || failures.length > failuresBefore || /^matthew 1:[234]$/u.test(reference)) {
    const packet = {
      reference, translationFidelity: fidelity, semanticAlignment: 'not-certified-pending-independent-review',
      authority: unit.translatorEdition, publishedEnglish: unit.english, publishedEnglishWords: expected,
      sourceFile: 'data/sources/peshitta/Peshitta.txt', candidates,
      rows: textCells.map(cell => ({ rowId: cell.rowId, sourceToken: cell.provenance.sourceToken, syriac: cell.text, english: cell.gloss?.gloss,
        englishIndices: cell.provenance.englishAlignment?.englishIndices,
        allocationEvidence: cell.provenance.englishAlignment?.evidence,
        dictionary: (sedra.get(cell.text)?.analyses ?? []).map(a => ({ category: a.category, stem: a.stem, englishGlosses: a.englishGlosses })),
        morphology: morphology.get(reference)?.find(token => token.sourceToken === cell.provenance.sourceToken)?.morphology ?? null })),
    };
    packets.push(packet);
    if (/^matthew 1:[234]$/u.test(reference)) reviewedExamples.push(packet);
  }
  counts.verses += 1;
  counts.semanticReviewCandidates += candidates.length;
  if (candidates.length) counts.candidateVerses += 1;
}
counts.translationFailures = failures.length;
const report = {
  scope: 'All stored Peshitta Gospel glosses. Translation fidelity checks lexical spelling, capitalization and per-occurrence attribution to the admitted Murdock text; punctuation and edition acquisition are outside this check. Semantic heuristics only prioritize independent review; unflagged verses are not thereby certified.',
  sourceHashes: Object.fromEntries([englishPath, sedraPath, morphologyPath].map(name => [name, hash(name)])),
  criteria: {
    translationFidelity: 'Displayed English must be drawn from the declared published translation at the recorded occurrence indices, with no dropped or duplicated English occurrences.',
    semanticAlignment: 'Independently inspect the source-language word, morphology and whole verse. Repeated names must be assigned to their distinct occurrences. Phrase-level English may span multiple morphemes. Do not infer equivalence from shared comparison rows or a previous allocation certificate.',
    aiReview: 'An AI reviewer receives the published verse, every source token in source order, current English occurrence indices, dictionary evidence and morphology. It records pass, fail or unresolved separately for each criterion, with cited evidence. It must not invent replacement translations, automatically harmonize traditions, or certify a guess. This command makes no external model calls and changes no corpus data.',
  },
  counts, failures, reviewedExamples, packets,
};
const output = path.join(root, 'docs/audits/verse-review/source-checks/peshitta-gloss-integrity.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, counts, examples: reviewedExamples.map(p => ({ reference: p.reference, translationFidelity: p.translationFidelity, semanticCandidates: p.candidates })) }, null, 2));
if (failures.length) process.exitCode = 1;
