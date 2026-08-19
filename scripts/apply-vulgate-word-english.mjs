import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ledgerFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-adjudication.json');
const reportFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-application.json');
const apply = process.argv.includes('--apply');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function parseReference(reference) {
  const match = reference.match(/^(matthew|mark|luke|john)\s+(\d+):(\d+)$/u);
  if (!match) throw new Error(`Unsupported display reference: ${reference}`);
  return { gospel: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
}

function fileFor(reference) {
  const { gospel, chapter, verse } = parseReference(reference);
  return path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
}

const totals = { units: ledger.admitted.length, matchedUnits: 0, mismatchedUnits: 0, latinCells: 0, glossStarts: 0, glossContinuations: 0, filesChanged: 0 };
const mismatches = [];
const pendingFiles = new Map();

for (const unit of ledger.admitted) {
  const files = unit.displayReferences.map((reference) => {
    const filename = fileFor(reference);
    const data = pendingFiles.get(filename) ?? JSON.parse(fs.readFileSync(filename, 'utf8'));
    pendingFiles.set(filename, data);
    return { filename, data };
  });
  const cells = files.flatMap(({ data }) => data.rows
    .filter((row) => row.vulgate?.type === 'text')
    .map((row) => ({ row, cell: row.vulgate })));
  const latinCount = Math.max(...unit.groups.flatMap((group) => group.latinIndices)) + 1;
  if (cells.length !== latinCount) {
    totals.mismatchedUnits += 1;
    mismatches.push({ sourceReference: unit.sourceReference, displayReferences: unit.displayReferences, expectedLatinTokens: latinCount, liveLatinCells: cells.length });
    continue;
  }
  totals.matchedUnits += 1;
  totals.latinCells += cells.length;
  for (const group of unit.groups) {
    const groupId = `${unit.sourceReference}#${group.groupIndex}`;
    group.latinIndices.forEach((latinIndex, memberIndex) => {
      const cell = cells[latinIndex].cell;
      cell.gloss = {
        gloss: memberIndex === 0 ? group.english : '↳',
        source: 'DouayRheims',
        tooltip: memberIndex === 0
          ? `Douay-Rheims 1899 · Urevangelium ${group.scope === 'single-latin-token' ? 'word-row alignment' : 'phrase-span alignment'} · ${group.latin}`
          : `Shares the Douay-Rheims 1899 phrase “${group.english}” with ${group.latin}`,
        spanId: groupId,
        spanRole: memberIndex === 0 ? 'start' : 'continuation',
      };
      cell.provenance ??= {};
      cell.provenance.englishAlignment = {
        authority: 'Douay-Rheims American Edition of 1899 (Challoner tradition)',
        sourceReference: unit.sourceReference,
        groupId,
        scope: group.scope,
        latinIndices: group.latinIndices,
        englishIndices: group.englishIndices,
        evidence: group.evidence,
        adjudicationSha256: ledger.adjudicationSha256,
        status: 'internally-adjudicated-not-independent-scholarly-review',
      };
      if (memberIndex === 0) totals.glossStarts += 1;
      else totals.glossContinuations += 1;
    });
  }
}

if (apply && mismatches.length) throw new Error(`Refusing to apply: ${mismatches.length} source units do not match the live Latin cell count.`);
if (apply) {
  for (const [filename, data] of pendingFiles) {
    fs.writeFileSync(filename, `${JSON.stringify(data, null, 2)}\n`);
    totals.filesChanged += 1;
  }
}

const report = {
  status: apply ? 'applied-internally-adjudicated-row-span-english' : 'dry-run-no-live-changes',
  generatedAt: new Date().toISOString(),
  totals,
  adjudicationSha256: ledger.adjudicationSha256,
  mismatches,
};
report.reportSha256 = sha256(JSON.stringify({ totals, mismatches }));
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, reportSha256: report.reportSha256, report: path.relative(ROOT, reportFile) }, null, 2));
