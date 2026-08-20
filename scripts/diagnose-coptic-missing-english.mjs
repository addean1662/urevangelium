import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-horner-crosscheck.json'), 'utf8'));
const missing = audit.results.filter((result) => result.classification === 'NO_CURRENT_ENGLISH');
const attribute = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
const cache = new Map();

const verseGroups = (sourceFile, chapterNumber, verseNumber) => {
  const key = `${sourceFile}:${chapterNumber}:${verseNumber}`;
  if (cache.has(key)) return cache.get(key);
  const text = fs.readFileSync(path.join(ROOT, 'data/sources/coptic-tt', sourceFile), 'utf8');
  const matches = [...text.matchAll(new RegExp(`<verse_n verse_n="${verseNumber}"[^>]*>([\\s\\S]*?)(?=<verse_n verse_n="\\d+"|$)`, 'g'))];
  const verse = sourceFile === '43_John_07.tt' && chapterNumber === 8 ? matches.at(-1) : matches[0];
  if (!verse) return null;
  const opening = text.slice(verse.index, verse.index + text.slice(verse.index).indexOf('>') + 1);
  const translation = attribute(opening, 'translation');
  const groups = [...verse[1].matchAll(/<norm_group[^>]*norm_group="([^"]*)"[^>]*>([\s\S]*?)<\/norm_group>/g)].map((match) => ({
    surface: match[1],
    norms: [...match[2].matchAll(/<norm\s+[^>]*>/g)].map((norm) => ({
      surface: attribute(norm[0], 'norm'),
      lemma: attribute(norm[0], 'lemma'),
      pos: attribute(norm[0], 'pos'),
      func: attribute(norm[0], 'func'),
      lang: attribute(norm[0], 'lang'),
    })),
  })).filter((group) => !group.norms.length || !group.norms.every((norm) => norm.pos === 'PUNCT'));
  const value = { translation, groups };
  cache.set(key, value);
  return value;
};

const classifications = [];
for (const item of missing) {
  const [book, chapter, verse] = item.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const verseData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, `${verse}.json`), 'utf8'));
  const coptic = verseData.rows[item.rowIndex]?.coptic;
  const sourceFile = coptic?.provenance?.sourceFile;
  const sourceToken = Number(coptic?.provenance?.sourceToken);
  const source = sourceFile ? verseGroups(sourceFile, Number(chapter), Number(verse)) : null;
  const group = source?.groups[sourceToken - 1] ?? null;
  const poses = group?.norms.map((norm) => norm.pos).filter(Boolean) ?? [];
  const hasProperName = group?.norms.some((norm) => norm.pos === 'NPROP') ?? false;
  const multiMorpheme = (group?.norms.length ?? 0) > 1;
  const punctuationOnly = poses.length > 0 && poses.every((pos) => pos === 'PUNCT');
  const onlyFunctionMorphology = poses.length > 0 && poses.every((pos) => ['ART', 'PREP', 'PPERS', 'PPERO', 'PPOS', 'COP', 'PTC', 'CCIRC', 'APREC', 'APST', 'ANY'].includes(pos));
  const classification = !source
    ? 'SOURCE_VERSE_NOT_RESOLVED'
    : !group
      ? 'SOURCE_TOKEN_INDEX_NOT_RESOLVED'
      : punctuationOnly
        ? 'PUNCTUATION_CORRECTLY_HAS_NO_ENGLISH'
        : hasProperName
        ? 'PROPER_NAME_WITHOUT_GROUP_GLOSS'
        : multiMorpheme
          ? 'MULTI_MORPHEME_GROUP_WITHOUT_COMPOSED_GLOSS'
          : onlyFunctionMorphology
            ? 'FUNCTION_MORPHEME_WITHOUT_STANDALONE_GLOSS'
            : 'CONTENT_LEMMA_NOT_FOUND_IN_CURRENT_LEXICAL_PIPELINE';
  classifications.push({ ...item, sourceFile, sourceToken, sourceSurface: group?.surface ?? null, norms: group?.norms ?? [], scriptoriumVerseTranslation: source?.translation ?? null, classification });
}

const counts = classifications.reduce((output, item) => {
  output[item.classification] = (output[item.classification] ?? 0) + 1;
  return output;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  finding: 'These rows lack a current per-group gloss; they do not generally lack verse-level English in the pinned Scriptorium source.',
  total: classifications.length,
  counts,
  results: classifications,
};
const outputPath = path.join(ROOT, 'docs/audits/coptic-missing-english-diagnosis.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'diagnosed', total: classifications.length, counts }, null, 2));
