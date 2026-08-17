import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHADOW = path.join(ROOT, 'docs/audits/vaticanus-intf-cntr-shadow');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const summary = JSON.parse(fs.readFileSync(path.join(SHADOW, 'summary.json'), 'utf8'));
if (summary.status !== 'shadow-only' || summary.invariantErrors?.length) throw new Error('Vaticanus shadow is not certification-clean');

const totals = { versesApplied: 0, rowsWritten: 0, textCells: 0, omittedCells: 0, lacunaCells: 0, emptyCells: 0 };
for (const gospel of GOSPELS) {
  const artifact = JSON.parse(fs.readFileSync(path.join(SHADOW, `${gospel}.json`), 'utf8'));
  for (const verse of artifact.verses) {
    const [chapter, number] = verse.reference.split(':').map(Number);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${number}.json`);
    const live = JSON.parse(fs.readFileSync(file, 'utf8'));
    live.rows = verse.proposedRows;
    live._vaticanusCertification = {
      authority: 'INTF NTVMR GA 03 document 20003, original hand',
      corroboration: `CNTR ${artifact.sources.cntr.revision}`,
      intfSha256: artifact.sources.intf.sha256,
      generatedAt: summary.generatedAt,
    };
    fs.writeFileSync(file, `${JSON.stringify(live, null, 2)}\n`);
    totals.versesApplied++;
    totals.rowsWritten += live.rows.length;
    for (const row of live.rows) {
      const type = row.vaticanus?.type;
      if (type === 'text') totals.textCells++;
      else if (type === 'omitted') totals.omittedCells++;
      else if (type === 'lacuna') totals.lacunaCells++;
      else if (type === 'empty') totals.emptyCells++;
    }
  }
}

const report = { status: 'applied-awaiting-post-apply-certification', generatedAt: new Date().toISOString(), shadowGeneratedAt: summary.generatedAt, totals };
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-live-application.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
