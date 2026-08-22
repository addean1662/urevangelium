import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'data/sources/peshitta/murdock-gospels.json');
const BOOKS = { matthew: 28, mark: 16, luke: 24, john: 21 };
const TITLE = { matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' };
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function decode(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"', nbsp: ' ' };
  return value
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<[^>]+>/gu, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (_, entity) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return named[entity.toLowerCase()] ?? `&${entity};`;
    })
    .replace(/\s+/gu, ' ')
    .trim();
}

function parseChapter(html, gospel, chapter) {
  const anchor = /<sup><a class="verse_ref Murdock"[^>]*>(\d+)<\/a><\/sup>/giu;
  const hits = [...html.matchAll(anchor)];
  const verses = [];
  for (let index = 0; index < hits.length; index += 1) {
    const verse = Number(hits[index][1]);
    const start = hits[index].index + hits[index][0].length;
    const end = index + 1 < hits.length ? hits[index + 1].index : html.indexOf('</div>', start);
    const english = decode(html.slice(start, end));
    if (!english) throw new Error(`${gospel} ${chapter}:${verse}: empty English`);
    verses.push({ reference: `${gospel} ${chapter}:${verse}`, english });
  }
  return verses;
}

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(value) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = ROMAN[value[index]] ?? 0;
    const next = ROMAN[value[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function parseIndependentBook(html, gospel) {
  const contentStart = html.indexOf('<div class="entry">');
  const contentEnd = html.indexOf('<div id="sidebar">', contentStart);
  const content = html.slice(contentStart, contentEnd > contentStart ? contentEnd : html.length);
  const header = /<font class="header">([IVXL]+)\.<\/font>/giu;
  const headers = [...content.matchAll(header)];
  const verses = [];
  for (let headerIndex = 0; headerIndex < headers.length; headerIndex += 1) {
    let chapter = romanToInt(headers[headerIndex][1]);
    const start = headers[headerIndex].index + headers[headerIndex][0].length;
    const end = headerIndex + 1 < headers.length ? headers[headerIndex + 1].index : content.length;
    const chapterHtml = content.slice(start, end);
    const verseAnchor = /<b[^>]*>(\d+)<\/b>/giu;
    const hits = [...chapterHtml.matchAll(verseAnchor)];
    let previousVerse = 0;
    for (let index = 0; index < hits.length; index += 1) {
      const verse = Number(hits[index][1]);
      if (verse <= previousVerse) chapter += 1;
      const verseStart = hits[index].index + hits[index][0].length;
      const verseEnd = index + 1 < hits.length ? hits[index + 1].index : chapterHtml.length;
      const english = decode(chapterHtml.slice(verseStart, verseEnd).split(/<br\s*\/?>/iu)[0]);
      if (english) verses.push({ reference: `${gospel} ${chapter}:${verse}`, english });
      previousVerse = verse;
    }
  }
  return verses;
}

function lexicalKey(value) {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/gu, ' ').trim();
}

const chapters = [];
for (const [gospel, chapterCount] of Object.entries(BOOKS)) {
  for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
    const url = `https://studybible.info/Murdock/${TITLE[gospel]}%20${chapter}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const html = await response.text();
    const verses = parseChapter(html, gospel, chapter);
    chapters.push({ gospel, chapter, url, htmlSha256: sha256(html), verses });
    process.stdout.write(`\r${gospel} ${chapter}/${chapterCount}`);
  }
}

const verseCount = chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0);
const independentBooks = [];
for (const gospel of Object.keys(BOOKS)) {
  const url = `https://www.hebrewaramaic.org/james_murdock/${gospel}.html`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  independentBooks.push({ gospel, url, htmlSha256: sha256(html), verses: parseIndependentBook(html, gospel) });
}
const primaryByReference = new Map(chapters.flatMap((chapter) => chapter.verses.map((verse) => [verse.reference, verse.english])));
const independentByReference = new Map(independentBooks.flatMap((book) => book.verses.map((verse) => [verse.reference, verse.english])));
const comparison = [...primaryByReference].map(([reference, english]) => ({
  reference,
  result: !independentByReference.has(reference) ? 'MISSING_INDEPENDENT' : lexicalKey(english) === lexicalKey(independentByReference.get(reference)) ? 'LEXICALLY_EXACT' : 'WORDING_DIFFERENCE',
  primary: english,
  independent: independentByReference.get(reference) ?? null,
}));
const comparisonTotals = Object.groupBy(comparison, (record) => record.result);
const output = {
  generatedAt: new Date().toISOString(),
  governingEdition: 'James Murdock, The New Testament: A Literal Translation from the Syriac Peshito Version (1851)',
  transcriptionSource: 'StudyBible.info Murdock verse-addressable transcription',
  license: 'Public domain',
  acquisitionRule: 'Whole published verses only; no proportional word extraction.',
  chapterCount: chapters.length,
  verseCount,
  chapters,
  independentTranscription: {
    source: 'HebrewAramaic.org James Murdock transcription',
    books: independentBooks,
  },
  comparisonTotals: Object.fromEntries(Object.entries(comparisonTotals).map(([key, records]) => [key, records.length])),
  comparison,
};
output.contentSha256 = sha256(JSON.stringify({ chapters, independentBooks }));
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`\n${JSON.stringify({ chapterCount: output.chapterCount, verseCount, contentSha256: output.contentSha256 }, null, 2)}`);
