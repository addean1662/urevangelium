import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const lookup = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/coptic/crum-lookup.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/applied-allocations.json'), 'utf8'));
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const stem = (word) => word.length <= 4 ? word : word.replace(/(?:eth|est|ing|edly|ed|es|s)$/u, '');
const words = (value) => normalize(value).split(/\s+/).filter(Boolean);
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
const cache = new Map();

function verseGroups(sourceFile, verseNumber) {
  const key = `${sourceFile}:${verseNumber}`;
  if (cache.has(key)) return cache.get(key);
  const text = fs.readFileSync(path.join(ROOT, 'data/sources/coptic-tt', sourceFile), 'utf8');
  const verse = text.match(new RegExp(`<verse_n verse_n="${verseNumber}"[^>]*>([\\s\\S]*?)(?=<verse_n verse_n="\\d+"|$)`));
  const groups = verse ? [...verse[1].matchAll(/<norm_group[^>]*norm_group="([^"]*)"[^>]*>([\s\S]*?)<\/norm_group>/g)].map((match) => ({
    surface: match[1],
    norms: [...match[2].matchAll(/<norm\s+[^>]*>/g)].map((norm) => ({ lemma: attr(norm[0], 'lemma'), pos: attr(norm[0], 'pos') })),
  })).filter((group) => !group.norms.length || !group.norms.every((norm) => norm.pos === 'PUNCT')) : [];
  cache.set(key, groups);
  return groups;
}

const results = [];
for (const record of ledger.records) {
  const [book, chapter, verse] = record.sourceReference.split('.');
  const gospel = book === 'Matt' ? 'matthew' : book.toLowerCase();
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, `${verse}.json`), 'utf8'));
  const cell = data.rows[record.rowIndex]?.coptic;
  const group = verseGroups(cell.provenance.sourceFile, Number(verse))[cell.provenance.sourceToken - 1];
  const lexicalEvidence = group?.norms.map((norm) => ({ ...norm, gloss: lookup[norm.lemma] ?? null })) ?? [];
  const lexicalWords = new Set(lexicalEvidence.flatMap((item) => words(item.gloss)));
  const allocationWords = words(record.allocation);
  const nameSupport = lexicalEvidence.some((item) => item.pos === 'NPROP');
  const supported = allocationWords.length > 0 && allocationWords.every((word) => [...lexicalWords].some((candidate) => candidate === word || stem(candidate) === stem(word)));
  results.push({ ...record, sourceToken: cell.provenance.sourceToken, sourceSurface: group?.surface ?? null, lexicalEvidence, classification: supported ? 'LEXICALLY_SUPPORTED' : nameSupport ? 'PROPER_NAME_REQUIRES_ENTITY_CHECK' : 'NOT_SUPPORTED_BY_COMPONENT_LEXICON' });
}
const counts = results.reduce((output, item) => ({ ...output, [item.classification]: (output[item.classification] ?? 0) + 1 }), {});
const report = { generatedAt: new Date().toISOString(), counts, results };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-horner-applied-lexical-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));
