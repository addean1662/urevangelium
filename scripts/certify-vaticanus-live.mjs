import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHADOW = path.join(ROOT, 'docs/audits/vaticanus-intf-cntr-shadow');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const summary = JSON.parse(fs.readFileSync(path.join(SHADOW, 'summary.json'), 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failures = [];
const totals = { verses: 0, sourceWords: 0, liveWords: 0, exactCorroborated: 0, normalizedCorroborated: 0, intfGoverningDisagreements: 0, omittedCells: 0, lacunaCells: 0, proposedNewRows: 0 };

if (summary.invariantErrors?.length) failures.push(...summary.invariantErrors.map((error) => `shadow: ${error}`));
for (const gospel of GOSPELS) {
  const artifact = JSON.parse(fs.readFileSync(path.join(SHADOW, `${gospel}.json`), 'utf8'));
  totals.exactCorroborated += artifact.totals.exactCorroborated;
  totals.normalizedCorroborated += artifact.totals.normalizedCorroborated;
  totals.intfGoverningDisagreements += artifact.totals.cntrDisagreement;
  totals.proposedNewRows += artifact.totals.newRowsProposed;
  for (const verse of artifact.verses) {
    totals.verses++;
    const [chapter, number] = verse.reference.split(':').map(Number);
    const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, String(chapter), `${number}.json`), 'utf8'));
    if (hash(live.rows) !== hash(verse.proposedRows)) failures.push(`${gospel} ${verse.reference}: live/shadow mismatch`);
    const liveWords = live.rows.filter((row) => row.vaticanus?.type === 'text').map((row) => row.vaticanus.text);
    const sourceWords = verse.sourceWords ?? [];
    totals.liveWords += liveWords.length;
    totals.sourceWords += sourceWords.length;
    if (JSON.stringify(liveWords) !== JSON.stringify(sourceWords)) failures.push(`${gospel} ${verse.reference}: INTF coverage/order mismatch`);
    for (const row of live.rows) {
      if (row.vaticanus?.type === 'omitted') totals.omittedCells++;
      if (row.vaticanus?.type === 'lacuna') totals.lacunaCells++;
      if (row.vaticanus?.type === 'text' && row.vaticanus.provenance?.source !== 'INTF NTVMR transcription') failures.push(`${gospel} ${verse.reference} ${row.id}: missing INTF provenance`);
    }
  }
}
if (totals.sourceWords !== 63511 || totals.liveWords !== 63511) failures.push(`expected 63,511 words; source=${totals.sourceWords}, live=${totals.liveWords}`);
if (totals.exactCorroborated + totals.normalizedCorroborated + totals.intfGoverningDisagreements !== totals.sourceWords) failures.push('corroboration accounting does not cover every INTF word');

const report = {
  status: failures.length ? 'fail' : 'certified-for-release', generatedAt: new Date().toISOString(),
  standard: 'INTF original-hand transcription governs; CNTR is an independent automated corroboration layer and disagreements are retained explicitly without changing INTF readings.',
  structuralRule: 'Existing shared rows are exhausted between monotonic source anchors before a new shared row is introduced.',
  totals, failures,
};
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-live-certification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
