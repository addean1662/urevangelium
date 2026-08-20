import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8'));
const shadowDir = path.join(ROOT, 'tmp/horner-ocr-shadow');
const stopwords = new Set(['a', 'an', 'the', 'to', 'of']);
const archaic = new Map([
  ['you', ['ye', 'thou', 'thee']], ['your', ['thy', 'thine']], ['yours', ['thine']],
  ['are', ['art']], ['have', ['hast']], ['has', ['hath']], ['will', ['wilt']],
  ['shall', ['shalt']], ['do', ['dost']], ['does', ['doth']], ['were', ['wast']],
]);

const normalizeWord = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const words = (text) => [...text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => normalizeWord(match[0])).filter(Boolean);
const wordSet = (text) => new Set(words(text));
const stem = (word) => {
  if (word.length <= 4) return word;
  return word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
};
const alternatives = (gloss) => gloss
  .replace(/\([^)]*\)/g, ' ')
  .split(/[,;/]|\bor\b/iu)
  .map((part) => words(part).filter((word) => !stopwords.has(word)))
  .filter((part) => part.length > 0);
const exactSupported = (candidate, horner) => candidate.every((word) => horner.has(word) || (archaic.get(word) ?? []).some((variant) => horner.has(variant)));
const inflectionSupported = (candidate, horner) => {
  const stems = new Set([...horner].map(stem));
  return candidate.every((word) => stems.has(stem(word)) || (archaic.get(word) ?? []).some((variant) => stems.has(stem(variant))));
};

const results = [];
for (const unit of ledger.units) {
  const gospel = unit.book.toLowerCase();
  const versePath = path.join(ROOT, 'data', gospel, String(unit.chapter), `${unit.verse}.json`);
  if (!fs.existsSync(versePath)) continue;
  const verse = JSON.parse(fs.readFileSync(versePath, 'utf8'));
  const hornerWords = wordSet(unit.english);
  const shadowWords = new Set();
  for (const printedPage of unit.printedPages) {
    const shadowPath = path.join(shadowDir, `${gospel}-${printedPage}.json`);
    if (!fs.existsSync(shadowPath)) continue;
    const shadow = JSON.parse(fs.readFileSync(shadowPath, 'utf8'));
    for (const word of words(shadow.text.slice(0, 2400))) shadowWords.add(word);
  }
  for (const [rowIndex, row] of verse.rows.entries()) {
    if (row.coptic?.type !== 'text') continue;
    const gloss = row.coptic.gloss?.gloss?.trim() ?? '';
    const source = row.coptic.gloss?.source ?? null;
    if (!gloss) {
      results.push({ sourceReference: unit.sourceReference, rowIndex, coptic: row.coptic.text, gloss: null, source, classification: 'NO_CURRENT_ENGLISH' });
      continue;
    }
    const candidates = alternatives(gloss);
    const exact = candidates.some((candidate) => exactSupported(candidate, hornerWords));
    const inflectional = !exact && candidates.some((candidate) => inflectionSupported(candidate, hornerWords));
    const shadowOnly = !exact && !inflectional && candidates.some((candidate) => exactSupported(candidate, shadowWords) || inflectionSupported(candidate, shadowWords));
    const classification = exact
      ? 'HORNER_EXACT_SUPPORT'
      : inflectional
        ? 'HORNER_RECORDED_INFLECTIONAL_SUPPORT'
        : shadowOnly
          ? 'OCR_SHADOW_SUPPORT_REQUIRES_TRANSCRIPTION_ADJUDICATION'
          : source === 'Crum'
            ? 'HORNER_NO_SELECTION_FROM_LEXICAL_RANGE'
            : 'HORNER_DISAGREEMENT_REQUIRES_TROUBLESHOOTING';
    results.push({
      sourceReference: unit.sourceReference,
      hornerUnitId: unit.id,
      hornerStatus: unit.status,
      rowIndex,
      coptic: row.coptic.text,
      gloss,
      source,
      classification,
    });
  }
}

const counts = results.reduce((output, result) => {
  output[result.classification] = (output[result.classification] ?? 0) + 1;
  return output;
}, {});
const bySource = results.reduce((output, result) => {
  const source = result.source ?? 'none';
  output[source] ??= {};
  output[source][result.classification] = (output[source][result.classification] ?? 0) + 1;
  return output;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  method: 'Existing Coptic English candidates checked against bounded Horner English units. Exact and explicitly recorded archaic/inflectional normalization may support; shadow-only matches and disagreements fail closed.',
  mutationApplied: false,
  coveredHornerUnits: ledger.units.length,
  evaluatedCopticRows: results.length,
  counts,
  bySource,
  results,
};
const outputPath = path.join(ROOT, 'docs/audits/coptic-english-horner-crosscheck.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'audited', coveredHornerUnits: ledger.units.length, evaluatedCopticRows: results.length, counts }, null, 2));
