import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/page-candidates.json'), 'utf8')).pages;
const pageByKey = new Map(pages.map((page) => [`${page.book}:${page.printedPage}`, page]));
const contextual = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/horner-contextual-boundaries.json'), 'utf8')).results;
const coptic = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/horner-coptic-applicability.json'), 'utf8')).results;
const copticByKey = new Map(coptic.map((verse) => [verse.key, verse.classification]));
const shadowDir = path.join(ROOT, 'tmp/horner-ocr-shadow');

const normalizeWord = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const tokenize = (text) => [...text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], word: normalizeWord(match[0]), offset: match.index ?? 0 })).filter((token) => token.word);
const markerBefore = (text, token) => /[0-9©°*†‡]|[\u0370-\u03ff]/u.test(text.slice(Math.max(0, token.offset - 30), token.offset));

const agreementAt = (sourceTokens, sourcePosition, shadowText) => {
  const phrase = sourceTokens.slice(sourcePosition, sourcePosition + 7).map((token) => token.word);
  const shadowTokens = tokenize(shadowText).slice(0, sourceTokens.length + 40);
  const matches = [];
  for (let position = 0; position <= shadowTokens.length - Math.min(3, phrase.length); position += 1) {
    const window = shadowTokens.slice(position, position + phrase.length).map((token) => token.word);
    let equal = 0;
    for (let index = 0; index < phrase.length; index += 1) if (phrase[index] === window[index]) equal += 1;
    const score = equal / phrase.length;
    if (score > 0) matches.push({ position, score, markerEvidence: markerBefore(shadowText, shadowTokens[position]), word: shadowTokens[position].raw, offset: shadowTokens[position].offset });
  }
  matches.sort((left, right) => (right.score + (right.markerEvidence ? 0.08 : 0)) - (left.score + (left.markerEvidence ? 0.08 : 0)));
  const best = matches[0] ?? null;
  const margin = best ? best.score - (matches[1]?.score ?? 0) : 0;
  return { phrase, best, margin, agreed: Boolean(best && best.score >= 0.71 && margin >= 0.14 && best.markerEvidence) };
};

const results = [];
for (const pageResult of contextual) {
  const page = pageByKey.get(`${pageResult.book}:${pageResult.printedPage}`);
  const shadowPath = path.join(shadowDir, `${pageResult.book.toLowerCase()}-${pageResult.printedPage}.json`);
  if (!page || !fs.existsSync(shadowPath)) continue;
  const shadow = JSON.parse(fs.readFileSync(shadowPath, 'utf8'));
  const sourceTokens = tokenize(page.narrativeText);
  for (const candidate of pageResult.verseCandidates) {
    const sourcePosition = candidate.best?.markerAnchor?.boundaryPosition;
    if (candidate.classification !== 'CONTEXT_AND_MARKER_BOUNDARY_CANDIDATE' || !Number.isInteger(sourcePosition)) continue;
    const agreement = agreementAt(sourceTokens, sourcePosition, shadow.text);
    const key = `${pageResult.book === 'Matthew' ? 'Matt' : pageResult.book}.${pageResult.chapter}.${candidate.verse}`;
    const copticClassification = copticByKey.get(key) ?? 'HORNER_SOURCE_MISSING';
    const copticApplicable = ['TEXT_EXACT_AFTER_NONLEXICAL_NORMALIZATION', 'NOMINA_SACRA_EXPANSION_EXACT'].includes(copticClassification);
    const classification = agreement.agreed && copticApplicable
      ? 'DUAL_OCR_BOUNDARY_AND_COPTIC_EXACT_PASS'
      : agreement.agreed
        ? 'DUAL_OCR_BOUNDARY_PASS_COPTIC_VARIANT_ADJUDICATION'
        : 'SHADOW_BOUNDARY_UNRESOLVED';
    results.push({
      key,
      book: pageResult.book,
      chapter: pageResult.chapter,
      verse: candidate.verse,
      printedPage: pageResult.printedPage,
      pdfPage: pageResult.scanPage,
      sourceBoundary: candidate.best,
      shadowAgreement: agreement,
      copticClassification,
      classification,
    });
  }
}

const counts = results.reduce((output, result) => {
  output[result.classification] = (output[result.classification] ?? 0) + 1;
  return output;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  method: 'Internet Archive full-text boundary + parallel-tradition contextual location + independent local Tesseract shadow + Horner-Coptic/Sahidica applicability.',
  scope: 'Boundary admission and Coptic relationship classification. Horner remains adjudicative evidence when its Coptic differs; additions, omissions, and non-corresponding readings must be resolved at translation-unit level.',
  counts,
  results,
};
const outputPath = path.join(ROOT, 'docs/audits/horner-dual-ocr-admission.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'audited', candidates: results.length, counts }, null, 2));
