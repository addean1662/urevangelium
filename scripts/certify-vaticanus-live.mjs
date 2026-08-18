import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHADOW = path.join(ROOT, 'docs/audits/vaticanus-intf-cntr-shadow');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const summary = JSON.parse(fs.readFileSync(path.join(SHADOW, 'summary.json'), 'utf8'));
const failures = [];
const totals = { verses: 0, sourceTokens: 0, lexicalWords: 0, wordDivisionGroups: 0, dividedCells: 0, exactCorroborated: 0, normalizedCorroborated: 0, intfGoverningDisagreements: 0, omittedCells: 0, lacunaCells: 0, proposedNewRows: 0 };

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
    const liveCells = live.rows.filter((row) => row.vaticanus?.type === 'text').map((row) => row.vaticanus);
    const reconstructedSourceTokens = [];
    for (let i = 0; i < liveCells.length; i++) {
      const cell = liveCells[i];
      const division = cell.provenance?.wordDivision;
      if (!division) {
        reconstructedSourceTokens.push(cell.text);
        continue;
      }
      if (division.part !== 1 || !Number.isInteger(division.parts) || division.parts < 2) {
        failures.push(`${gospel} ${verse.reference}: malformed word-division start at lexical word ${i + 1}`);
        continue;
      }
      const group = liveCells.slice(i, i + division.parts);
      const valid = group.length === division.parts && group.every((part, index) => {
        const metadata = part.provenance?.wordDivision;
        return metadata?.sourceToken === division.sourceToken && metadata.part === index + 1 && metadata.parts === division.parts;
      });
      if (!valid) failures.push(`${gospel} ${verse.reference}: incomplete or unordered word-division group at lexical word ${i + 1}`);
      const reconstructed = group.map((part) => part.text).join('');
      if (reconstructed !== division.sourceToken) failures.push(`${gospel} ${verse.reference}: divided cells do not reconstruct INTF token ${division.sourceToken}`);
      reconstructedSourceTokens.push(reconstructed);
      totals.wordDivisionGroups++;
      totals.dividedCells += group.length;
      i += division.parts - 1;
    }
    const sourceWords = verse.sourceWords ?? [];
    totals.lexicalWords += liveCells.length;
    totals.sourceTokens += sourceWords.length;
    if (JSON.stringify(reconstructedSourceTokens) !== JSON.stringify(sourceWords)) failures.push(`${gospel} ${verse.reference}: reconstructed INTF coverage/order mismatch`);
    for (const row of live.rows) {
      if (row.vaticanus?.type === 'omitted') totals.omittedCells++;
      if (row.vaticanus?.type === 'lacuna') totals.lacunaCells++;
      if (row.vaticanus?.type === 'text' && row.vaticanus.provenance?.source !== 'INTF NTVMR transcription') failures.push(`${gospel} ${verse.reference} ${row.id}: missing INTF provenance`);
    }
  }
}
if (totals.sourceTokens !== 63511 || totals.lexicalWords !== 63546) failures.push(`expected 63,511 source tokens and 63,546 lexical words; source=${totals.sourceTokens}, lexical=${totals.lexicalWords}`);
if (totals.wordDivisionGroups !== 35 || totals.dividedCells !== 70) failures.push(`expected 35 word-division groups / 70 cells; groups=${totals.wordDivisionGroups}, cells=${totals.dividedCells}`);
if (totals.exactCorroborated + totals.normalizedCorroborated + totals.intfGoverningDisagreements !== totals.sourceTokens) failures.push('corroboration accounting does not cover every INTF source token');

const report = {
  status: failures.length ? 'fail' : 'certified-for-release', generatedAt: new Date().toISOString(),
  standard: 'INTF original-hand transcription governs; CNTR is an independent automated corroboration layer and disagreements are retained explicitly without changing INTF readings.',
  structuralRule: 'Existing shared rows are exhausted between monotonic source anchors before a new shared row is introduced.',
  totals, failures,
};
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-live-certification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
