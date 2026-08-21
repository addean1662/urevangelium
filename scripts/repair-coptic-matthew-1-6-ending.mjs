import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const file = path.join(ROOT, 'data/matthew/1/6.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const targetRows = new Map([['r15', 10], ['r16', 11], ['r18', 12]]);
const cellsByToken = new Map();

for (const row of data.rows) {
  const token = row.coptic?.provenance?.sourceToken;
  if ([10, 11, 12].includes(token)) {
    if (cellsByToken.has(token)) throw new Error(`Duplicate Sahidica source token ${token}`);
    cellsByToken.set(token, row.coptic);
    row.coptic = { type: 'empty' };
  }
}

for (const [rowId, token] of targetRows) {
  const row = data.rows.find((candidate) => candidate.id === rowId);
  const cell = cellsByToken.get(token);
  if (!row || !cell) throw new Error(`Cannot place Sahidica token ${token} at ${rowId}`);
  if (row.coptic?.type !== 'empty') throw new Error(`Target ${rowId} is not empty`);
  cell.provenance.placementMethod = 'source-order-and-lexical-alignment-reviewed';
  row.coptic = cell;
}

const ordered = data.rows
  .map((row) => row.coptic?.provenance?.sourceToken)
  .filter(Number.isInteger);
if (ordered.some((token, index) => index > 0 && token <= ordered[index - 1])) {
  throw new Error(`Sahidica source order remains invalid: ${ordered.join(', ')}`);
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ status: 'repaired', reference: 'matthew 1:6', placements: Object.fromEntries(targetRows), sourceOrder: ordered }, null, 2));
