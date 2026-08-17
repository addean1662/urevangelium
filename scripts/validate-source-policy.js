// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'lib', 'sourceManifest.ts');
const REQUIRED_IDS = ['earliest-papyri', 'sahidic', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
const REQUIRED_FILES = [
  'data/sources/earliest-papyrus/coverage-index.json',
  'data/sources/coptic-tt/40_Matthew_01.tt',
  'data/sources/vaticanus/03.txt',
  'data/sources/vaticanus/intf/matthew.xml',
  'data/sources/vaticanus/intf/mark.xml',
  'data/sources/vaticanus/intf/luke.xml',
  'data/sources/vaticanus/intf/john.xml',
  'data/sources/sinaiticus/01.txt',
  'data/sources/vulgate/VulgClementine.txt',
  'data/sources/bezae/Bezae-Greek.xml',
  'data/sources/bezae/Bezae-Latin.xml',
  'data/sources/peshitta/Peshitta.txt',
  'data/sources/byzantine/MAT.csv',
  'data/sources/byzantine/MAR.csv',
  'data/sources/byzantine/LUK.csv',
  'data/sources/byzantine/JOH.csv',
];

const errors = [];
const warnings = [];
if (!fs.existsSync(MANIFEST)) errors.push('Missing lib/sourceManifest.ts');
const manifestText = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
for (const id of REQUIRED_IDS) if (!manifestText.includes(`id: '${id}'`)) errors.push(`Manifest is missing column: ${id}`);
for (const rel of REQUIRED_FILES) if (!fs.existsSync(path.join(ROOT, rel))) errors.push(`Required source file is missing: ${rel}`);

const generator = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-verses.js'), 'utf8');
if (generator.includes("vaticanus:  { type: 'text', text: w.greek")) warnings.push('Vaticanus legacy generator still substitutes TAGNT Greek; manifest requires rebuild.');
if (generator.includes('const sinaText = w.spellingWH ?? w.greek')) warnings.push('Sinaiticus legacy generator still substitutes Westcott–Hort/TAGNT; manifest requires rebuild.');
if (generator.includes('const byzText = byzFromCsv ?? w.spellingByz ?? w.greek')) warnings.push('Byzantine legacy generator still permits silent TAGNT fallback; manifest prohibits it.');

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir)) {
    const chapterDir = path.join(gospelDir, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/.test(name))) {
      const verse = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      for (const row of verse.rows ?? []) {
        const cell = row.bezae;
        if (cell?.type === 'text' && !cell.greek && !cell.latin) errors.push(`${gospel} ${chapter}:${filename.replace('.json', '')} ${row.id}: Bezae text cell has no Greek or Latin text`);
      }
    }
  }
}

console.log('Source policy validation');
for (const warning of warnings) console.log(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
console.log(`${errors.length} error(s), ${warnings.length} known blocker warning(s)`);
process.exit(errors.length ? 1 : 0);
