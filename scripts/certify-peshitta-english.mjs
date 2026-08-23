import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'data/sources/peshitta/murdock-gospels.json');
const OUTPUT = path.join(ROOT, 'data/sources/peshitta/murdock-admitted-units.json');
const AUDIT = path.join(ROOT, 'docs/audits/peshitta-english-certification.json');
const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Seven verse markers are visibly embedded in the preceding StudyBible text
// instead of exposed as machine-readable anchors. Preserve Murdock's wording
// while restoring the published verse boundary explicitly.
const boundaryCorrections = new Map(Object.entries({
  'matthew 26:30': { from: 'matthew 26:29', english: 'And they sang praises, and went forth to the mount of Olives.' },
  'matthew 26:45': { from: 'matthew 26:46', english: 'Then he came to his disciples, and said to them: Sleep on now, and take rest. Behold, the hour is come: and the Son of man is betrayed into the hands of sinners.' },
  'mark 4:10': { from: 'mark 4:9', english: 'And when they were by themselves, those with him, together with the twelve, asked him concerning this similitude.' },
  'mark 8:19': { from: 'mark 8:18', english: 'When I broke the five loaves to five thousand, how many baskets full of the fragments took ye up? They say to him: Twelve.' },
  'mark 9:31': { from: 'mark 9:30', english: 'For he taught his disciples, and said to them: The Son of man is delivered into the hands of men, and they will kill him; and when he is killed, on the third day, he will rise.' },
  'mark 11:19': { from: 'mark 11:18', english: 'And when it was evening, they went out from the city.' },
  'luke 18:35': { from: 'luke 18:34', english: 'And as they came near to Jericho, a blind man was sitting by the side of the way, begging.' },
}));

const governing = new Map(source.comparison.map((record) => [record.reference, { ...record }]));
for (const [reference, correction] of boundaryCorrections) {
  const target = governing.get(reference);
  const donor = governing.get(correction.from);
  if (!target || !donor || !donor.primary.includes(correction.english)) throw new Error(`${reference}: boundary correction no longer matches governing source`);
  target.primary = correction.english;
  target.result = 'GOVERNING_BOUNDARY_CORRECTED';
  donor.primary = donor.primary.replace(correction.english, '').replace(/(?:\([0-9l]+\)|[0-9]+\))\s*$/iu, '').replace(/\s+/gu, ' ').trim();
  donor.result = 'GOVERNING_BOUNDARY_CORRECTED';
}

const comparison = [...governing.values()];
const expectedReferences = [];
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/u.test(name)).map(Number).sort((a, b) => a - b)) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, String(chapter))).filter((name) => /^\d+\.json$/u.test(name)).sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')))) {
      expectedReferences.push(`${gospel} ${chapter}:${filename.replace('.json', '')}`);
    }
  }
}

const units = [];
for (const record of comparison) {
  if (!record.primary || !/[A-Za-z]/u.test(record.primary)) throw new Error(`${record.reference}: governing Murdock verse has no substantive English`);
  units.push({
    unitId: `murdock-${record.reference.replace(/[ :]/gu, '-')}`,
    displayReferences: [record.reference],
    english: record.primary,
    status: record.result === 'LEXICALLY_EXACT'
      ? 'PUBLISHED_TRANSLATION_UNIT_TWO_TRANSCRIPTION_CONCORDANT'
      : 'PUBLISHED_TRANSLATION_UNIT_GOVERNING_TRANSCRIPTION_ONLY',
    evidence: record.result === 'LEXICALLY_EXACT'
      ? ['StudyBible.info Murdock', 'HebrewAramaic.org Murdock']
      : ['StudyBible.info Murdock governing verse transcription'],
    comparisonResult: record.result,
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
  displayRule: 'Every governing Murdock verse remains an independent source unit. Secondary-transcription absence or disagreement never authorizes merging adjacent verses.',
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
