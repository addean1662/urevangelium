import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const finalLedgerFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication-final.json');
const ledgerFile = fs.existsSync(finalLedgerFile) ? finalLedgerFile : path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json');
const outputFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-application.json');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fileFor(reference) {
  const match = reference.match(/^(matthew|mark|luke|john)\s+(\d+):(\d+)$/u);
  if (!match) throw new Error(`Unsupported display reference: ${reference}`);
  return path.join(ROOT, 'data', match[1], match[2], `${match[3]}.json`);
}

const pending = new Map();
const errors = [];
const totals = { units: ledger.units.length, latinCells: 0, displayedRows: 0, blankCompressedRows: 0, blankReorderedRows: 0, blankUnexpressedRows: 0, blankTranslationUnitRows: 0, blankUnresolvedRows: 0, arrowsRemaining: 0, filesChanged: 0 };

for (const unit of ledger.units) {
  const files = unit.displayReferences.map((reference) => {
    const filename = fileFor(reference);
    const data = pending.get(filename) ?? JSON.parse(fs.readFileSync(filename, 'utf8'));
    pending.set(filename, data);
    return data;
  });
  const cells = files.flatMap((data) => data.rows.filter((row) => row.vulgate?.type === 'text').map((row) => row.vulgate));
  if (cells.length !== unit.rows.length) { errors.push(`${unit.sourceReference}: expected ${unit.rows.length} Latin cells, found ${cells.length}`); continue; }
  unit.rows.forEach((decision, index) => {
    const cell = cells[index];
    if (cell.text !== decision.latin) errors.push(`${unit.sourceReference}: Latin coordinate mismatch at ${index}`);
    delete cell.gloss;
    cell.provenance ??= {};
    cell.provenance.englishAlignment = {
      authority: 'Douay-Rheims American Edition of 1899 (Challoner tradition)',
      sourceReference: unit.sourceReference,
      scope: 'lexical-row-ownership',
      latinIndex: decision.latinIndex,
      action: decision.action,
      englishIndices: decision.englishIndices ?? [],
      anchorEnglishIndex: decision.anchorEnglishIndex ?? null,
      evidence: decision.evidence,
      translationUnit: decision.translationUnit ?? null,
      adjudicationSha256: ledger.adjudicationSha256,
      status: 'internally-adjudicated-not-independent-scholarly-review',
    };
    if (decision.action === 'display') {
      cell.gloss = { gloss: decision.english, source: 'DouayRheims', tooltip: `Douay-Rheims 1899 · Latin: ${decision.latin} · English: ${decision.anchorEnglish}` };
      totals.displayedRows++;
    } else if (decision.action === 'blank-compressed') totals.blankCompressedRows++;
    else if (decision.action === 'blank-reordered') totals.blankReorderedRows++;
    else if (decision.action === 'blank-unexpressed') totals.blankUnexpressedRows++;
    else if (decision.action === 'blank-unit-member') totals.blankTranslationUnitRows++;
    else totals.blankUnresolvedRows++;
    totals.latinCells++;
  });
}

if (errors.length) throw new Error(`Refusing to apply: ${errors.length} coordinate errors. ${errors.slice(0, 5).join('; ')}`);
if (APPLY) for (const [filename, data] of pending) { fs.writeFileSync(filename, `${JSON.stringify(data, null, 2)}\n`); totals.filesChanged++; }
const ARROW_RE = /[←→↔↕↑↓⇄⇆⟷⟶⟵↳]/u;
for (const data of pending.values()) for (const row of data.rows) {
  if (ARROW_RE.test(row.vulgate?.gloss?.gloss ?? '') || ARROW_RE.test(row.vulgate?.gloss?.tooltip ?? '')) totals.arrowsRemaining++;
}
const appliedStatus = totals.blankUnresolvedRows === 0
  ? 'applied-complete-latin-row-classification-with-phrase-level-english'
  : 'applied-partial-internal-lexical-row-alignment';
const report = { status: APPLY ? appliedStatus : 'dry-run', generatedAt: new Date().toISOString(), totals, adjudicationSha256: ledger.adjudicationSha256, errors };
report.reportSha256 = sha256(JSON.stringify({ totals, errors }));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (totals.arrowsRemaining) process.exitCode = 1;
