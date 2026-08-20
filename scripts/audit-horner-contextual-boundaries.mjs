import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/page-candidates.json'), 'utf8')).pages;
const boundaryAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/horner-english-verse-boundaries.json'), 'utf8')).results;
const boundaryByPage = new Map(boundaryAudit.map((item) => [`${item.book}:${item.printedPage}`, item]));
const columns = ['vaticanus', 'sinaiticus', 'byzantine', 'vulgate', 'bezae', 'peshitta'];

const normalizeWord = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const tokenize = (text) => [...text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)].map((match) => ({ raw: match[0], word: normalizeWord(match[0]), offset: match.index ?? 0 })).filter((token) => token.word);
const lcsLength = (left, right) => {
  const row = new Array(right.length + 1).fill(0);
  for (const a of left) {
    let diagonal = 0;
    for (let index = 1; index <= right.length; index += 1) {
      const previous = row[index];
      row[index] = a === right[index - 1] ? diagonal + 1 : Math.max(row[index], row[index - 1]);
      diagonal = previous;
    }
  }
  return row[right.length];
};

const referencesForVerse = (book, chapter, verse) => {
  const file = path.join(ROOT, 'data', book.toLowerCase(), String(chapter), `${verse}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return columns.map((column) => ({ column, text: data.rows.map((row) => row[column]?.gloss?.gloss).filter(Boolean).join(' ') }))
    .map(({ column, text }) => ({ column, tokens: tokenize(text).map((token) => token.word) }))
    .filter((reference) => reference.tokens.length >= 2);
};

const markerAnchorBefore = (text, token, bodyTokens) => {
  const start = Math.max(0, token.offset - 28);
  const prefix = text.slice(start, token.offset);
  const matches = [...prefix.matchAll(/[0-9©°*†‡]|[\u0370-\u03ff]/gu)];
  const marker = matches.at(-1);
  if (!marker) return null;
  const markerOffset = start + (marker.index ?? 0);
  const boundaryPosition = bodyTokens.findIndex((candidate) => candidate.offset > markerOffset);
  return boundaryPosition >= 0 ? { marker: marker[0], markerOffset, boundaryPosition, boundaryWord: bodyTokens[boundaryPosition].raw } : null;
};

const scoreAt = (bodyTokens, position, references) => {
  const bodyWindow = bodyTokens.slice(position, position + 22).map((token) => token.word);
  let best = { score: 0, source: null };
  for (const referenceRecord of references) {
    const reference = referenceRecord.tokens.slice(0, 16);
    const denominator = Math.min(12, reference.length);
    const ordered = lcsLength(reference.slice(0, denominator), bodyWindow);
    const firstMatch = reference[0] === bodyWindow[0] ? 0.16 : 0;
    const secondMatch = reference[1] === bodyWindow[1] ? 0.08 : 0;
    const score = ordered / denominator + firstMatch + secondMatch;
    if (score > best.score) best = { score, source: referenceRecord.column };
  }
  return best;
};

const results = [];
for (const page of pages) {
  const boundary = boundaryByPage.get(`${page.book}:${page.printedPage}`);
  if (!boundary?.range || boundary.range.crossChapter || !page.narrativeText) continue;
  const bodyTokens = tokenize(page.narrativeText);
  let floor = 0;
  const verseCandidates = [];
  for (const verse of boundary.expectedMarkers) {
    const references = referencesForVerse(page.book, boundary.range.startChapter, verse);
    const scored = [];
    for (let position = floor; position < bodyTokens.length; position += 1) {
      const score = scoreAt(bodyTokens, position, references);
      if (score.score > 0) {
        const markerAnchor = markerAnchorBefore(page.narrativeText, bodyTokens[position], bodyTokens);
        scored.push({ position, offset: bodyTokens[position].offset, word: bodyTokens[position].raw, markerEvidence: Boolean(markerAnchor), markerAnchor, ...score });
      }
    }
    scored.sort((left, right) => (right.score + (right.markerEvidence ? 0.12 : 0)) - (left.score + (left.markerEvidence ? 0.12 : 0)));
    const best = scored[0] ?? null;
    const runnerUp = scored[1] ?? null;
    const margin = best ? best.score - (runnerUp?.score ?? 0) : 0;
    const admitted = Boolean(best && best.score >= 0.72 && margin >= 0.06 && best.markerEvidence);
    verseCandidates.push({ verse, best, margin, classification: admitted ? 'CONTEXT_AND_MARKER_BOUNDARY_CANDIDATE' : 'CONTEXT_BOUNDARY_UNRESOLVED' });
    if (best) floor = best.position + 1;
  }
  results.push({ book: page.book, chapter: boundary.range.startChapter, printedPage: page.printedPage, scanPage: page.scanPage, header: page.header, verseCandidates });
}

const candidates = results.flatMap((page) => page.verseCandidates);
const counts = candidates.reduce((output, item) => {
  output[item.classification] = (output[item.classification] ?? 0) + 1;
  return output;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  method: 'Horner boundary candidates located by ordered lexical overlap with existing non-Coptic tradition English, then gated by an independent OCR marker at the same location.',
  prohibition: 'Context traditions locate boundaries only. Their English is never copied into or used to rewrite Horner English.',
  admissionStatus: 'candidate-only',
  pages: results.length,
  counts,
  results,
};
const outputPath = path.join(ROOT, 'docs/audits/horner-contextual-boundaries.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'audited', pages: results.length, counts }, null, 2));
