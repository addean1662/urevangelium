import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INPUT = path.join(ROOT, 'docs/audits/vulgate-english-adjudication.json');
const OUTPUT = path.join(ROOT, 'data/sources/vulgate-english/admitted-units.json');

const audit = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
if (audit.held?.length || audit.totals?.heldUnits !== 0) throw new Error('Vulgate English still has held units.');

const units = {};
for (const unit of audit.admitted) {
  if (!unit.displayEligible || !unit.english) throw new Error(`${unit.sourceReference}: unit is not display eligible`);
  for (const reference of unit.displayReferences) {
    if (units[reference]) throw new Error(`${reference}: duplicate Vulgate English unit`);
    units[reference] = {
      english: unit.english,
      sourceReference: unit.sourceReference,
      displayReferences: unit.displayReferences,
      translatorEdition: unit.translatorEdition,
      sourceFile: unit.sourceFile,
      alignmentScope: unit.alignmentScope,
      finerSemanticSegmentationAuthorized: false,
      status: unit.status,
    };
  }
}

const output = {
  status: 'internally-certified-published-translation-units',
  generatedAt: new Date().toISOString(),
  governingLatin: 'Clementine Vulgate',
  translation: 'Douay-Rheims American Edition of 1899 (Challoner tradition)',
  unitCount: audit.admitted.length,
  displayReferenceCount: Object.keys(units).length,
  adjudicationSha256: audit.adjudicationSha256,
  displayRule: 'One published English object spans the complete Vulgate translation unit; no word-level semantic subdivision is implied.',
  units,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), unitCount: output.unitCount, displayReferenceCount: output.displayReferenceCount, held: audit.totals.heldUnits }, null, 2));
