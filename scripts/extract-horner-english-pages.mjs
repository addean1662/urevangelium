import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const volumes = [
  { volume: 1, file: 'tmp/sources/horner/vol1-complete/copticversionofn01unse_djvu.txt', pages: 'tmp/sources/horner/vol1-complete/copticversionofn01unse_page_numbers.json', books: ['MATTHEW', 'MARK'], ranges: { MATTHEW: [3, 353], MARK: [355, 639] } },
  { volume: 2, file: 'tmp/sources/horner/vol2/copticversionofn02hornuoft_djvu.txt', pages: 'tmp/sources/horner/vol2/copticversionofn02hornuoft_page_numbers.json', books: ['LUKE'], ranges: { LUKE: [3, 479] } },
  { volume: 3, file: 'tmp/sources/horner/vol3/copticversionofn03hornuoft_djvu.txt', pages: 'tmp/sources/horner/vol3/copticversionofn03hornuoft_page_numbers.json', books: ['JOHN'], ranges: { JOHN: [3, 337] } },
];

const decodeEntities = (value) => value
  .replace(/&quot;/g, '"')
  .replace(/&apos;|&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));

const repairUtf8Mojibake = (value) => /[ÃÂÎÏ]/.test(value)
  ? Buffer.from(value, 'latin1').toString('utf8')
  : value;

const extractNarrativeBlock = (pageText) => {
  const blocks = pageText.split(/(?:\r?\n[ \t]*){3,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length < 2) return '';
  return repairUtf8Mojibake(blocks[1]).replace(/[ \t]+/g, ' ').trim();
};

const pages = [];
for (const source of volumes) {
  const ocr = fs.readFileSync(path.join(ROOT, source.file), 'utf8');
  const pageMap = JSON.parse(fs.readFileSync(path.join(ROOT, source.pages), 'utf8')).pages;
  const headingPattern = new RegExp(`^\\s*(${source.books.join('|')})\\s+([IVXLCDM]+)(?:\\s+([^\\n]{0,40}?))?\\s+(\\d+)\\s*$`, 'gm');
  const headings = [...ocr.matchAll(headingPattern)];
  for (const [index, heading] of headings.entries()) {
    const printedPage = heading[0].replace(/\s+/g, ' ').trim() === 'LUKE XIX 4-8 255' ? 355 : Number(heading[4]);
    if (printedPage % 2 === 0) continue;
    const [firstPage, lastPage] = source.ranges[heading[1].toUpperCase()];
    if (printedPage < firstPage || printedPage > lastPage) continue;
    const end = headings[index + 1]?.index ?? ocr.length;
    const text = decodeEntities(ocr.slice(heading.index, end)).replace(/[ \t]+/g, ' ').trim();
    const narrativeText = extractNarrativeBlock(text);
    const mapped = pageMap.find((page) => String(page.pageNumber).trim() === String(printedPage));
    const scanPage = mapped?.leafNum ?? null;
    const header = heading[0].replace(/\s+/g, ' ').trim().replace(/^LUKE XIX 4-8 255$/, 'LUKE XIX 4-8 355');
    pages.push({
      volume: source.volume,
      book: heading[1][0] + heading[1].slice(1).toLowerCase(),
      scanPage,
      printedPage,
      header,
      narrativeText,
      narrativeSha256: crypto.createHash('sha256').update(narrativeText).digest('hex'),
      ocrText: text,
      status: 'OCR_PAGE_CANDIDATE_REQUIRES_FACSIMILE_CONTROL',
      sourceFile: source.file,
    });
  }
}

const byBook = pages.reduce((counts, page) => {
  counts[page.book] = (counts[page.book] ?? 0) + 1;
  return counts;
}, {});
const expectedRanges = Object.fromEntries(volumes.flatMap((volume) => Object.entries(volume.ranges).map(([book, range]) => [book[0] + book.slice(1).toLowerCase(), range])));
const missingPrintedPages = Object.fromEntries(Object.entries(expectedRanges).map(([book, [first, last]]) => {
  const found = new Set(pages.filter((page) => page.book === book).map((page) => page.printedPage));
  const missing = [];
  for (let printedPage = first; printedPage <= last; printedPage += 2) if (!found.has(printedPage)) missing.push(printedPage);
  return [book, missing];
}));
const output = {
  generatedAt: new Date().toISOString(),
  source: 'George W. Horner, The Coptic Version of the New Testament in the Southern Dialect, volumes I-III',
  policy: 'OCR is acquisition evidence only. English remains Horner-authored; page candidates require facsimile control and Coptic applicability before display.',
  pageCount: pages.length,
  byBook,
  expectedRanges,
  missingPrintedPages,
  pages,
};
const outputPath = path.join(ROOT, 'data/sources/horner-english/page-candidates.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: 'extracted', pageCount: pages.length, byBook, outputPath: path.relative(ROOT, outputPath) }, null, 2));
