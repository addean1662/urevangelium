import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHADOW = path.join(ROOT, 'docs/audits/sinaiticus-gospels');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const summary = JSON.parse(fs.readFileSync(path.join(SHADOW, 'summary.json'), 'utf8'));
if (summary.status !== 'shadow-review-only' || Object.values(summary.gospels).some((entry) => entry.invariantErrors.length)) throw new Error('Sinaiticus shadow is not certification-clean');

const totals = { versesApplied: 0, rowsWritten: 0, textCells: 0, omittedCells: 0, lacunaCells: 0, emptyCells: 0 };
for (const gospel of GOSPELS) {
  const artifact = JSON.parse(fs.readFileSync(path.join(SHADOW, `${gospel}.json`), 'utf8'));
  for (const verse of artifact.verses) {
    const [, localReference] = verse.reference.split(' ');
    const [chapter, number] = localReference.split(':').map(Number);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${number}.json`);
    const live = JSON.parse(fs.readFileSync(file, 'utf8'));
    live.rows = verse.proposedRows;
    live._sinaiticusCertification = {
      authority: 'CNTR Class 1 transcription of GA 01',
      readingLayer: 'base reading: original scribe including recorded first-scribe corrections; later a-c correctors excluded from display',
      cntrRevision: artifact.source.revision,
      sourceSha256: artifact.source.sha256,
      generatedAt: summary.generatedAt,
    };
    fs.writeFileSync(file, `${JSON.stringify(live, null, 2)}\n`);
    totals.versesApplied++;
    totals.rowsWritten += live.rows.length;
    for (const row of live.rows) {
      const type = row.sinaiticus?.type;
      if (type === 'text') totals.textCells++;
      else if (type === 'omitted') totals.omittedCells++;
      else if (type === 'lacuna') totals.lacunaCells++;
      else if (type === 'empty') totals.emptyCells++;
    }
  }
}

const report = { status: 'applied-awaiting-post-apply-certification', generatedAt: new Date().toISOString(), shadowGeneratedAt: summary.generatedAt, totals };
fs.writeFileSync(path.join(ROOT, 'docs/audits/sinaiticus-live-application.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
