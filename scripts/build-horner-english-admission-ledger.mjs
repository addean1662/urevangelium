import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/page-candidates.json'), 'utf8')).pages;
const pageByKey = new Map(pages.map((page) => [`${page.book}:${page.printedPage}`, page]));
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/horner-dual-ocr-admission.json'), 'utf8')).results;
const passing = audit.filter((result) => [
  'DUAL_OCR_BOUNDARY_AND_COPTIC_EXACT_PASS',
  'DUAL_OCR_BOUNDARY_PASS_COPTIC_VARIANT_ADJUDICATION',
].includes(result.classification));
const passingByKey = new Map(passing.map((result) => [result.key, result]));

const tokenOffsets = (text) => [...text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => match.index ?? 0);
const boundaryOffset = (result, page) => {
  const position = result.sourceBoundary?.markerAnchor?.boundaryPosition;
  return Number.isInteger(position) ? tokenOffsets(page.narrativeText)[position] : null;
};
const cleanText = (text) => text.replace(/\s+/g, ' ').trim();
const bookKey = (book) => book === 'Matthew' ? 'Matt' : book;

const units = [];
for (const current of passing) {
  const nextKey = `${bookKey(current.book)}.${current.chapter}.${current.verse + 1}`;
  const next = passingByKey.get(nextKey);
  if (!next) continue;
  const currentPage = pageByKey.get(`${current.book}:${current.printedPage}`);
  const nextPage = pageByKey.get(`${next.book}:${next.printedPage}`);
  if (!currentPage || !nextPage) continue;
  if (next.printedPage !== current.printedPage && next.printedPage !== current.printedPage + 2) continue;
  const start = boundaryOffset(current, currentPage);
  const end = boundaryOffset(next, nextPage);
  if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
  let english;
  if (current.printedPage === next.printedPage) {
    english = currentPage.narrativeText.slice(start, next.sourceBoundary.markerAnchor.markerOffset);
  } else {
    english = `${currentPage.narrativeText.slice(start)} ${nextPage.narrativeText.slice(0, next.sourceBoundary.markerAnchor.markerOffset)}`;
  }
  english = cleanText(english);
  if (!english || english.length < 2) continue;
  const unit = {
    id: `horner-${current.key.toLowerCase().replaceAll('.', '-')}`,
    sourceReference: current.key,
    book: current.book,
    chapter: current.chapter,
    verse: current.verse,
    printedPages: current.printedPage === next.printedPage ? [current.printedPage] : [current.printedPage, next.printedPage],
    pdfPages: current.printedPage === next.printedPage ? [current.pdfPage] : [current.pdfPage, next.pdfPage],
    english,
    englishSha256: crypto.createHash('sha256').update(english).digest('hex'),
    translator: 'George W. Horner',
    transcriptionLayer: 'Internet Archive full text, bounded by independent local Tesseract shadow',
    copticApplicability: current.copticClassification,
    status: current.copticClassification === 'TEXTUAL_OR_ORTHOGRAPHIC_DIFFERENCE'
      ? 'HORNER_ADJUDICATION_UNIT_COPTIC_VARIANT_REQUIRES_READING_LEVEL_RESOLUTION'
      : 'INTERNALLY_ADMITTED_OCR_TRANSCRIPTION_PENDING_WORDING_FACSIMILE_REVIEW',
  };
  units.push(unit);
}

const byBook = units.reduce((output, unit) => {
  output[unit.book] = (output[unit.book] ?? 0) + 1;
  return output;
}, {});
const ledger = {
  generatedAt: new Date().toISOString(),
  policy: 'Units require two admitted boundaries and independent OCR boundary agreement. Horner-Coptic differences remain adjudicative evidence and are resolved at reading level rather than disqualifying the passage.',
  displayAuthorized: false,
  unitCount: units.length,
  byBook,
  units,
};
const outputPath = path.join(ROOT, 'data/sources/horner-english/admission-ledger.json');
fs.writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: 'built', unitCount: units.length, byBook, displayAuthorized: false }, null, 2));
