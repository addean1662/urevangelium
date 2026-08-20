import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const inputFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json');
const outputFile = path.join(ROOT, 'docs/audits/vulgate-expanded-row-shadow.json');
const adjudication = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function longestIncreasingPairs(pairs) {
  const sorted = [...pairs].sort((a, b) => a.englishIndex - b.englishIndex || a.latinIndex - b.latinIndex);
  const length = Array(sorted.length).fill(1);
  const previous = Array(sorted.length).fill(-1);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      if (sorted[j].latinIndex >= sorted[i].latinIndex || sorted[j].englishIndex >= sorted[i].englishIndex) continue;
      if (length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        previous[i] = j;
      }
    }
  }
  if (!sorted.length) return [];
  let cursor = length.indexOf(Math.max(...length));
  const result = [];
  while (cursor >= 0) {
    result.push(sorted[cursor]);
    cursor = previous[cursor];
  }
  return result.reverse();
}

const totals = {
  units: 0,
  latinTokens: 0,
  englishTokens: 0,
  sharedPhysicalRows: 0,
  latinOnlyRows: 0,
  englishOnlyRows: 0,
  expandedRows: 0,
  semanticLinksOffRow: 0,
  duplicateEnglishOwnershipErrors: 0,
};
const units = [];

for (const unit of adjudication.units) {
  totals.units++;
  totals.latinTokens += unit.latin.length;
  totals.englishTokens += unit.publishedEnglish.length;
  const claims = new Map();
  for (const row of unit.rows) {
    if (row.action !== 'display') continue;
    for (const englishIndex of row.englishIndices ?? []) {
      const owners = claims.get(englishIndex) ?? [];
      owners.push(row.latinIndex);
      claims.set(englishIndex, owners);
    }
  }
  for (const owners of claims.values()) if (new Set(owners).size > 1) totals.duplicateEnglishOwnershipErrors++;

  // Only uniquely owned published words may share a physical row. The LIS is
  // the largest subset that preserves both Latin and Douay source order.
  const uniquePairs = [...claims]
    .filter(([, owners]) => new Set(owners).size === 1)
    .map(([englishIndex, owners]) => ({ englishIndex, latinIndex: owners[0] }));
  const onePerLatin = [];
  const seenLatin = new Set();
  for (const pair of uniquePairs.sort((a, b) => a.englishIndex - b.englishIndex)) {
    if (seenLatin.has(pair.latinIndex)) continue;
    seenLatin.add(pair.latinIndex);
    onePerLatin.push(pair);
  }
  const shared = longestIncreasingPairs(onePerLatin);
  const sharedKeys = new Set(shared.map((pair) => `${pair.latinIndex}:${pair.englishIndex}`));
  const semanticLinksOffRow = uniquePairs.filter((pair) => !sharedKeys.has(`${pair.latinIndex}:${pair.englishIndex}`)).length;
  const latinOnlyRows = unit.latin.length - shared.length;
  const englishOnlyRows = unit.publishedEnglish.length - shared.length;
  const expandedRows = unit.latin.length + unit.publishedEnglish.length - shared.length;
  totals.sharedPhysicalRows += shared.length;
  totals.latinOnlyRows += latinOnlyRows;
  totals.englishOnlyRows += englishOnlyRows;
  totals.expandedRows += expandedRows;
  totals.semanticLinksOffRow += semanticLinksOffRow;
  units.push({
    sourceReference: unit.sourceReference,
    displayReferences: unit.displayReferences,
    latinTokens: unit.latin.length,
    englishTokens: unit.publishedEnglish.length,
    currentRows: unit.latin.length,
    proposedRows: expandedRows,
    rowsAdded: expandedRows - unit.latin.length,
    sharedPhysicalRows: shared.length,
    latinOnlyRows,
    englishOnlyRows,
    semanticLinksOffRow,
    shared,
  });
}

const report = {
  status: totals.duplicateEnglishOwnershipErrors ? 'blocked-duplicate-english-ownership' : 'shadow-only-expanded-row-measurement',
  generatedAt: new Date().toISOString(),
  policy: [
    'Every Vulgate Latin token and every published Douay token appears exactly once and retains source order.',
    'A Latin token and Douay token share a physical row only when their admitted relationship belongs to the maximum monotonic one-to-one subset.',
    'Other semantic relationships remain explicit alignment-group links across rows.',
    'English-only rows are translation expansion, not source omission or manuscript loss.',
  ],
  inputAdjudicationSha256: adjudication.adjudicationSha256,
  totals,
  largestExpansions: [...units].sort((a, b) => b.rowsAdded - a.rowsAdded).slice(0, 50),
  units,
};
report.reportSha256 = sha256(JSON.stringify(report));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, reportSha256: report.reportSha256, output: path.relative(ROOT, outputFile) }, null, 2));
