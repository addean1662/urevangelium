import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/crosswire-copsahhorner/gospel-verses.json'), 'utf8')).verses;
const books = [
  { gospel: 'matthew', prefix: '40_Matthew_', osis: 'Matt' },
  { gospel: 'mark', prefix: '41_Mark_', osis: 'Mark' },
  { gospel: 'luke', prefix: '42_Luke_', osis: 'Luke' },
  { gospel: 'john', prefix: '43_John_', osis: 'John' },
];

const stripMarkup = (value) => value.replace(/<[^>]+>/g, ' ');
const normalize = (value) => stripMarkup(value)
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .normalize('NFC')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '');

const expandNominaSacra = (value) => {
  const tokens = stripMarkup(value).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').split(/\s+/u);
  const map = new Map([
    ['\u2c93\u2ca5', '\u2c93\u2c8f\u2ca5\u2c9f\u2ca9\u2ca5'],
    ['\u2cad\u2ca5', '\u2cad\u2ca3\u2c93\u2ca5\u2ca7\u2c9f\u2ca5'],
    ['\u2ca1\u2c9b\u2c81', '\u2ca1\u2c9b\u2c89\u2ca9\u2c99\u2c81'],
    ['\u2c95\u2ca5', '\u2c95\u2ca9\u2ca3\u2c93\u2c9f\u2ca5'],
    ['\u2c91\u2ca5', '\u2c91\u2c89\u2c9f\u2ca5'],
    ['\u2ca5\u2ca7\u2ca5', '\u2ca5\u2ca7\u2c81\u2ca9\u2ca3\u2c9f\u2ca5'],
  ]);
  return tokens.map((token) => {
    let expanded = token;
    for (const [abbreviation, fullForm] of map) {
      expanded = expanded.replaceAll(abbreviation, fullForm);
    }
    return expanded;
  }).join(' ');
};

const results = [];
for (const book of books) {
  const dir = path.join(ROOT, 'data/sources/coptic-tt');
  const files = fs.readdirSync(dir).filter((name) => name.startsWith(book.prefix) && name.endsWith('.tt')).sort();
  for (const filename of files) {
    const chapter = Number(filename.match(/_(\d+)\.tt$/)?.[1]);
    const tt = fs.readFileSync(path.join(dir, filename), 'utf8');
    const matches = [...tt.matchAll(/<verse_n verse_n="(\d+)"[^>]*>([\s\S]*?)(?=<verse_n verse_n="\d+"|$)/g)];
    for (const match of matches) {
      const verse = Number(match[1]);
      const groups = [...match[2].matchAll(/<norm_group[^>]*norm_group="([^"]*)"/g)].map((item) => item[1]);
      const sahidica = groups.join(' ');
      const key = `${book.osis}.${chapter}.${verse}`;
      const horner = source[key] ?? '';
      const exactNormalized = normalize(horner) === normalize(sahidica);
      const nsExpandedNormalized = normalize(expandNominaSacra(horner)) === normalize(sahidica);
      const classification = !horner
        ? 'HORNER_SOURCE_MISSING'
        : exactNormalized
          ? 'TEXT_EXACT_AFTER_NONLEXICAL_NORMALIZATION'
          : nsExpandedNormalized
            ? 'NOMINA_SACRA_EXPANSION_EXACT'
            : 'TEXTUAL_OR_ORTHOGRAPHIC_DIFFERENCE';
      const result = { gospel: book.gospel, chapter, verse, key, sourceFile: filename, sourceGroups: groups.length, classification };
      if (classification === 'TEXTUAL_OR_ORTHOGRAPHIC_DIFFERENCE') {
        result.hornerComparisonForm = normalize(horner);
        result.sahidicaComparisonForm = normalize(sahidica);
      }
      results.push(result);
    }
  }
}

const counts = results.reduce((out, item) => {
  out[item.classification] = (out[item.classification] ?? 0) + 1;
  return out;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  method: 'CrossWire Horner Coptic comparison candidate against pinned Sahidica 4.1.0; facsimile remains authoritative',
  totalVerses: results.length,
  counts,
  results,
};
fs.writeFileSync(path.join(ROOT, 'docs/audits/horner-coptic-applicability.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'audited', totalVerses: results.length, counts }, null, 2));
