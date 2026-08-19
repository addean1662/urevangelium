import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const SOURCE_ROOT = path.join(ROOT, 'data', 'sources', 'vulgate-english');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function cleanUsfm(value) {
  return value
    .replace(/\\f\s[\s\S]*?\\f\*/gu, ' ')
    .replace(/\\x\s[\s\S]*?\\x\*/gu, ' ')
    .replace(/\\w\s+([^|\\]+?)(?:\|[^\\]*?)?\\w\*/gu, '$1')
    .replace(/\\[a-z0-9+]+\*?(?:\s+)?/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function parseUsfm(gospel, folder) {
  const file = path.join(SOURCE_ROOT, folder, `${gospel}.usfm`);
  const raw = fs.readFileSync(file, 'utf8');
  const verses = new Map();
  let chapter = null;
  for (const line of raw.split(/\r?\n/u)) {
    const chapterMatch = line.match(/^\\c\s+(\d+)/u);
    if (chapterMatch) chapter = Number(chapterMatch[1]);
    const verseMatch = line.match(/^\\v\s+([^\s]+)\s+(.+)$/u);
    if (!verseMatch || chapter === null) continue;
    const text = cleanUsfm(verseMatch[2]);
    for (const verse of verseMatch[1].split('-')) verses.set(`${gospel} ${chapter}:${Number(verse)}`, text);
  }
  return { file: path.relative(ROOT, file).replaceAll('\\', '/'), sha256: sha256(raw), verses };
}

function parseRheims(gospel) {
  const file = path.join(SOURCE_ROOT, 'rheims-1582', `${gospel}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const verses = new Map();
  for (const chapter of data.chapters) {
    for (const verse of chapter.verses) {
      const text = verse.text.replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim();
      verses.set(`${gospel} ${chapter.chapter}:${verse.verse}`, text);
    }
  }
  return { file: path.relative(ROOT, file).replaceAll('\\', '/'), sha256: sha256(raw), verses };
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<[^>]+>/gu, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/gu, ' ')
    .trim();
}

function parseGutenberg(gospel) {
  const file = path.join(SOURCE_ROOT, 'challoner-gutenberg', 'pg1582-images.html');
  const raw = fs.readFileSync(file, 'utf8');
  const names = { matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' };
  const next = { matthew: 'Mark', mark: 'Luke', luke: 'John', john: 'Acts' };
  const start = raw.indexOf(`>${names[gospel]} Chapter 1<`);
  const end = raw.indexOf(`>${next[gospel]} Chapter 1<`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Cannot locate Gutenberg ${gospel} boundaries`);
  const verses = new Map();
  for (const match of raw.slice(start, end).matchAll(/<p\b[^>]*>\s*(\d+):(\d+)\.\s*([\s\S]*?)<\/p>/giu)) {
    verses.set(`${gospel} ${Number(match[1])}:${Number(match[2])}`, decodeHtml(match[3]));
  }
  return { file: path.relative(ROOT, file).replaceAll('\\', '/'), sha256: sha256(raw), verses };
}

function liveVulgateUnits() {
  const units = new Map();
  let textCells = 0;
  for (const gospel of GOSPELS) {
    const gospelDir = path.join(ROOT, 'data', gospel);
    for (const chapter of fs.readdirSync(gospelDir)) {
      const chapterDir = path.join(gospelDir, chapter);
      if (!fs.statSync(chapterDir).isDirectory()) continue;
      for (const file of fs.readdirSync(chapterDir).filter((name) => name.endsWith('.json'))) {
        const displayReference = `${gospel} ${Number(chapter)}:${Number(file.slice(0, -5))}`;
        const data = JSON.parse(fs.readFileSync(path.join(chapterDir, file), 'utf8'));
        for (const row of data.rows ?? []) {
          if (row.vulgate?.type !== 'text') continue;
          textCells++;
          const sourceReference = row.vulgate.provenance?.sourceReference;
          if (!sourceReference) throw new Error(`${displayReference} ${row.id}: missing Vulgate sourceReference`);
          const unit = units.get(sourceReference) ?? { sourceReference, displayReferences: new Set(), latinTokens: [] };
          unit.displayReferences.add(displayReference);
          unit.latinTokens.push(row.vulgate.text);
          units.set(sourceReference, unit);
        }
      }
    }
  }
  return { units, textCells };
}

function resolveTranslationUnit(verses, sourceReference) {
  const direct = verses.get(sourceReference);
  if (direct) return { text: direct, componentReferences: [sourceReference] };
  const range = sourceReference.match(/^(\w+)\s+(\d+):(\d+)[–-](\d+)$/u);
  if (!range) return { text: null, componentReferences: [] };
  const [, gospel, chapter, start, end] = range;
  const componentReferences = [];
  const parts = [];
  for (let verse = Number(start); verse <= Number(end); verse++) {
    const reference = `${gospel} ${Number(chapter)}:${verse}`;
    const text = verses.get(reference);
    if (!text) return { text: null, componentReferences: [] };
    componentReferences.push(reference);
    parts.push(text);
  }
  return { text: parts.join(' '), componentReferences };
}

const live = liveVulgateUnits();
const records = [];
const totals = { liveLatinCells: live.textCells, liveLatinSourceUnits: live.units.size, challonerUnitsPresent: 0, independentChallonerUnitsPresent: 0, gutenbergChallonerUnitsPresent: 0, rheimsUnitsPresent: 0, allFourEnglishWitnessesPresent: 0, independentChallonerExact: 0, independentChallonerTypographicEquivalent: 0, independentChallonerWordingDifference: 0, threeWayPrimaryMajority: 0, threeWayBibleCorpsMajority: 0, threeWayGutenbergMajority: 0, threeWayNoMajority: 0, displayAdmitted: 0, missingChalloner: 0, missingIndependentChalloner: 0, missingGutenbergChalloner: 0, missingRheims: 0 };
const sourceManifests = [];

function comparisonForm(value) {
  return value.normalize('NFC').toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu)?.join(' ') ?? '';
}

for (const gospel of GOSPELS) {
  const challoner = parseUsfm(gospel, 'challoner-1899');
  const independentChalloner = parseUsfm(gospel, 'challoner-1750-biblecorps');
  const gutenbergChalloner = parseGutenberg(gospel);
  const rheims = parseRheims(gospel);
  sourceManifests.push({ gospel, challoner: { file: challoner.file, sha256: challoner.sha256, units: challoner.verses.size }, independentChalloner: { file: independentChalloner.file, sha256: independentChalloner.sha256, units: independentChalloner.verses.size }, gutenbergChalloner: { file: gutenbergChalloner.file, sha256: gutenbergChalloner.sha256, units: gutenbergChalloner.verses.size }, rheims: { file: rheims.file, sha256: rheims.sha256, units: rheims.verses.size } });
  for (const unit of [...live.units.values()].filter((item) => item.sourceReference.startsWith(`${gospel} `))) {
    const challonerUnit = resolveTranslationUnit(challoner.verses, unit.sourceReference);
    const independentChallonerUnit = resolveTranslationUnit(independentChalloner.verses, unit.sourceReference);
    const gutenbergChallonerUnit = resolveTranslationUnit(gutenbergChalloner.verses, unit.sourceReference);
    const rheimsUnit = resolveTranslationUnit(rheims.verses, unit.sourceReference);
    const challonerEnglish = challonerUnit.text;
    const independentChallonerEnglish = independentChallonerUnit.text;
    const gutenbergChallonerEnglish = gutenbergChallonerUnit.text;
    const rheimsEnglish = rheimsUnit.text;
    if (challonerEnglish) totals.challonerUnitsPresent++; else totals.missingChalloner++;
    if (independentChallonerEnglish) totals.independentChallonerUnitsPresent++; else totals.missingIndependentChalloner++;
    if (gutenbergChallonerEnglish) totals.gutenbergChallonerUnitsPresent++; else totals.missingGutenbergChalloner++;
    if (rheimsEnglish) totals.rheimsUnitsPresent++; else totals.missingRheims++;
    if (challonerEnglish && independentChallonerEnglish && gutenbergChallonerEnglish && rheimsEnglish) totals.allFourEnglishWitnessesPresent++;
    let digitalAgreement = 'UNAVAILABLE';
    if (challonerEnglish && independentChallonerEnglish) {
      if (challonerEnglish === independentChallonerEnglish) {
        digitalAgreement = 'EXACT_CHARACTERS';
        totals.independentChallonerExact++;
      } else if (comparisonForm(challonerEnglish) === comparisonForm(independentChallonerEnglish)) {
        digitalAgreement = 'TYPOGRAPHIC_EQUIVALENCE';
        totals.independentChallonerTypographicEquivalent++;
      } else {
        digitalAgreement = 'WORDING_DIFFERENCE';
        totals.independentChallonerWordingDifference++;
      }
    }
    const forms = [challonerEnglish, independentChallonerEnglish, gutenbergChallonerEnglish].map((text) => text ? comparisonForm(text) : null);
    let threeWayResult = 'NO_MAJORITY';
    if (forms[0] && forms[0] === forms[1] || forms[0] && forms[0] === forms[2]) threeWayResult = 'PRIMARY_MAJORITY';
    else if (forms[1] && forms[1] === forms[2]) threeWayResult = 'BIBLECORPS_GUTENBERG_MAJORITY';
    if (threeWayResult === 'PRIMARY_MAJORITY') totals.threeWayPrimaryMajority++;
    else if (threeWayResult === 'BIBLECORPS_GUTENBERG_MAJORITY') totals.threeWayBibleCorpsMajority++;
    else totals.threeWayNoMajority++;
    records.push({ sourceReference: unit.sourceReference, displayReferences: [...unit.displayReferences], latin: unit.latinTokens.join(' '), challoner1899: challonerEnglish, challonerComponentReferences: challonerUnit.componentReferences, independentChalloner1750: independentChallonerEnglish, independentChallonerComponentReferences: independentChallonerUnit.componentReferences, gutenbergChalloner: gutenbergChallonerEnglish, gutenbergComponentReferences: gutenbergChallonerUnit.componentReferences, digitalAgreement, threeWayResult, originalRheims1582: rheimsEnglish, rheimsComponentReferences: rheimsUnit.componentReferences, status: threeWayResult === 'PRIMARY_MAJORITY' ? 'DIGITAL_TRANSCRIPTION_CONCORDANT_APPLICABILITY_UNREVIEWED' : challonerEnglish ? 'SOURCE_ACQUIRED_REQUIRES_ADJUDICATION' : 'NO_PRIMARY_TRANSLATION_UNIT', displayAdmitted: false, reason: 'Digital agreement validates wording acquisition only; it does not create a finer English-to-Latin semantic alignment.' });
  }
}

records.sort((a, b) => a.sourceReference.localeCompare(b.sourceReference, 'en', { numeric: true }));
const report = {
  status: 'developmental-shadow-not-certified',
  generatedAt: new Date().toISOString(),
  policy: {
    governingLatin: 'Pinned Clementine Vulgate source units already certified in the live column.',
    primaryEnglish: 'Douay-Rheims American Edition of 1899 (Challoner tradition), eBible engDRA.',
    independentDigitalWitness: 'BibleCorps DRC1750 public-domain PSFM/USFM electronic edition.',
    thirdDigitalWitness: 'Project Gutenberg ebook 1582, Challoner revised Douay-Rheims New Testament.',
    secondaryEnglish: 'Original Rheims New Testament (1582), janvier-s structured CC0 transcription.',
    invariant: 'No English is displayed merely because it shares a verse number. Published wording remains a translation unit; Urevangelium may align but may not translate or invent finer semantic segmentation.',
    prohibited: ['Whitaker lexical output as contextual translation', 'cross-column English', 'AI or OCR-generated English', 'automatic word-level division of published English', 'silent harmonization between the two English witnesses'],
  },
  totals,
  sourceManifests,
  records,
};
report.ledgerSha256 = sha256(JSON.stringify(report.records));
const output = path.join(ROOT, 'docs', 'audits', 'vulgate-english-source-shadow.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, ledgerSha256: report.ledgerSha256, output: path.relative(ROOT, output) }, null, 2));
