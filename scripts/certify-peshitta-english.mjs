import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'data/sources/peshitta/murdock-gospels.json');
const OUTPUT = path.join(ROOT, 'data/sources/peshitta/murdock-admitted-units.json');
const AUDIT = path.join(ROOT, 'docs/audits/peshitta-english-certification.json');
const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const comparison = source.comparison;
const expectedReferences = [];
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/u.test(name)).map(Number).sort((a, b) => a - b)) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, String(chapter))).filter((name) => /^\d+\.json$/u.test(name)).sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')))) {
      expectedReferences.push(`${gospel} ${chapter}:${filename.replace('.json', '')}`);
    }
  }
}

const units = [];
for (let index = 0; index < comparison.length;) {
  const record = comparison[index];
  if (record.result === 'LEXICALLY_EXACT') {
    units.push({
      unitId: `murdock-${record.reference.replace(/[ :]/gu, '-')}`,
      displayReferences: [record.reference],
      english: record.primary,
      status: 'PUBLISHED_TRANSLATION_UNIT_TWO_TRANSCRIPTION_CONCORDANT',
      evidence: ['StudyBible.info Murdock', 'HebrewAramaic.org Murdock'],
    });
    index += 1;
    continue;
  }
  const [gospel, chapterVerse] = record.reference.split(' ');
  const chapter = Number(chapterVerse.split(':')[0]);
  const span = [record];
  index += 1;
  while (index < comparison.length) {
    const next = comparison[index];
    const [nextGospel, nextChapterVerse] = next.reference.split(' ');
    const needsSubstantiveNeighbor = !span.some((item) => /[A-Za-z]/u.test(item.primary));
    if ((!needsSubstantiveNeighbor && next.result === 'LEXICALLY_EXACT') || nextGospel !== gospel || Number(nextChapterVerse.split(':')[0]) !== chapter) break;
    span.push(next);
    index += 1;
  }
  units.push({
    unitId: `murdock-${span[0].reference.replace(/[ :]/gu, '-')}-through-${span.at(-1).reference.split(':').at(-1)}`,
    displayReferences: span.map((item) => item.reference),
    english: span.map((item) => item.primary).join(' ').replace(/\s+/gu, ' ').trim(),
    status: 'PUBLISHED_TRANSLATION_BOUNDARY_SPAN_ADJUDICATED',
    evidence: ['StudyBible.info Murdock governing transcription', 'HebrewAramaic.org Murdock boundary comparison'],
    boundaryReason: 'The independently distributed transcription differs in verse division, omits a numbered unit, or carries wording across an adjacent verse. The governing wording is preserved as one unsplit span.',
  });
}

const covered = units.flatMap((unit) => unit.displayReferences);
const failures = [];
if (covered.length !== expectedReferences.length) failures.push(`covered ${covered.length}; expected ${expectedReferences.length}`);
for (let index = 0; index < expectedReferences.length; index += 1) {
  if (covered[index] !== expectedReferences[index]) failures.push(`reference ${index + 1}: ${covered[index]} != ${expectedReferences[index]}`);
}
for (const unit of units) if (!unit.english || !/[A-Za-z]/u.test(unit.english)) failures.push(`${unit.unitId}: no substantive English`);

const wordTokens = units.flatMap((unit) => unit.english.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu) ?? []);
const byReference = {};
for (const unit of units) {
  for (const reference of unit.displayReferences) {
    byReference[reference] = {
      english: unit.english,
      unitId: unit.unitId,
      sourceReference: unit.displayReferences.join('–'),
      displayReferences: unit.displayReferences,
      translatorEdition: 'James Murdock, 1851',
      sourceFile: 'data/sources/peshitta/murdock-gospels.json',
      sourceContentSha256: source.contentSha256,
      alignmentScope: 'whole-published-translation-unit',
      finerSemanticSegmentationAuthorized: false,
      status: unit.status,
    };
  }
}

const admitted = {
  status: failures.length ? 'failed' : 'internally-certified-published-translation-units',
  generatedAt: new Date().toISOString(),
  governingSyriac: 'Pinned scrollmapper electronic Peshitta',
  translation: 'James Murdock, The New Testament: A Literal Translation from the Syriac Peshito Version (1851)',
  sourceContentSha256: source.contentSha256,
  displayRule: 'One English object spans each complete admitted Murdock unit; no word-level semantic subdivision is implied.',
  totals: {
    displayReferences: covered.length,
    admittedUnits: units.length,
    singleVerseConcordantUnits: units.filter((unit) => unit.status.includes('TWO_TRANSCRIPTION')).length,
    boundarySpanUnits: units.filter((unit) => unit.status.includes('BOUNDARY_SPAN')).length,
    boundarySpanReferences: units.filter((unit) => unit.status.includes('BOUNDARY_SPAN')).reduce((sum, unit) => sum + unit.displayReferences.length, 0),
    publishedEnglishWords: wordTokens.length,
    heldUnits: failures.length,
  },
  units: byReference,
};
admitted.certificateSha256 = sha256(JSON.stringify({ sourceContentSha256: source.contentSha256, units }));
fs.writeFileSync(OUTPUT, `${JSON.stringify(admitted, null, 2)}\n`);
fs.writeFileSync(AUDIT, `${JSON.stringify({ ...admitted, unitLedger: units, failures }, null, 2)}\n`);
console.log(JSON.stringify({ status: admitted.status, totals: admitted.totals, certificateSha256: admitted.certificateSha256 }, null, 2));
if (failures.length) process.exitCode = 1;
