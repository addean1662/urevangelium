import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(ROOT, 'data/sources/horner-english/page-candidates.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const romanToNumber = (roman) => {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  return [...roman.toUpperCase()].reduceRight((total, letter, index, letters) => {
    const value = values[letter] ?? 0;
    const next = values[letters[index + 1]] ?? 0;
    return total + (value < next ? -value : value);
  }, 0);
};

const parseHeaderRange = (header) => {
  const normalized = header.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  const crossChapter = normalized.match(/^([A-Z]+)\s+([IVXLCDM]+)\s+(\d+)\s*-\s*([IVXLCDM]+)\s+(\d+)\s+\d+$/);
  if (crossChapter) return {
    book: crossChapter[1],
    startChapter: romanToNumber(crossChapter[2]),
    startVerse: Number(crossChapter[3]),
    endChapter: romanToNumber(crossChapter[4]),
    endVerse: Number(crossChapter[5]),
    crossChapter: true,
  };
  const sameChapter = normalized.match(/^([A-Z]+)\s+([IVXLCDM]+)\s+(\d+)\s*-\s*(\d+)\s+\d+$/);
  if (sameChapter) return {
    book: sameChapter[1],
    startChapter: romanToNumber(sameChapter[2]),
    startVerse: Number(sameChapter[3]),
    endChapter: romanToNumber(sameChapter[2]),
    endVerse: Number(sameChapter[4]),
    crossChapter: false,
  };
  return null;
};

const cleanArabicMarkers = (text) => [...text.matchAll(/(?:^|[\s.;!?])([1-9]\d?)(?=\s*[A-Z\[])/gm)].map((match) => ({
  value: Number(match[1]),
  offset: (match.index ?? 0) + match[0].lastIndexOf(match[1]),
}));

const results = source.pages.map((page) => {
  const range = parseHeaderRange(page.header);
  if (!range) return { book: page.book, printedPage: page.printedPage, header: page.header, classification: 'HEADER_RANGE_UNRESOLVED' };
  if (range.crossChapter) return { book: page.book, printedPage: page.printedPage, header: page.header, range, classification: 'CROSS_CHAPTER_PAGE_REQUIRES_REVIEW' };
  const expected = Array.from({ length: range.endVerse - range.startVerse + 1 }, (_, index) => range.startVerse + index);
  const observed = cleanArabicMarkers(page.narrativeText);
  const exactObserved = observed.filter((marker) => expected.includes(marker.value));
  const exactSequence = exactObserved.length === expected.length && exactObserved.every((marker, index) => marker.value === expected[index]);
  return {
    book: page.book,
    printedPage: page.printedPage,
    scanPage: page.scanPage,
    header: page.header,
    range,
    expectedMarkers: expected,
    observedArabicMarkers: observed,
    narrativeSha256: page.narrativeSha256,
    classification: exactSequence ? 'ARABIC_VERSE_SEQUENCE_EXACT' : 'VERSE_MARKERS_REQUIRE_TYPOGRAPHIC_RECOVERY',
  };
});

const counts = results.reduce((output, result) => {
  output[result.classification] = (output[result.classification] ?? 0) + 1;
  return output;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  method: 'Horner English page-header range checked against Arabic verse markers preserved in the Internet Archive full-text representation.',
  admissionRule: 'This audit locates candidates only. No English is admitted until boundary agreement, Coptic applicability, and facsimile control all pass.',
  totalPages: results.length,
  counts,
  results,
};
const outputPath = path.join(ROOT, 'docs/audits/horner-english-verse-boundaries.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'audited', totalPages: results.length, counts }, null, 2));
