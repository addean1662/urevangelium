import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const held = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json'), 'utf8'));
const orthographic = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-orthographic-adjudication.json'), 'utf8'));
const accepted = new Set(['unique-guide-row', 'contextual-repeated-guide-row', 'conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const overrides = new Map();
for (const decision of [...held.decisions, ...orthographic.decisions].filter((item) => item.certified)) {
  overrides.set(`${decision.gospel}:${decision.reference}:${decision.siglum}:${decision.sourceToken - 1}`, decision.targetRowId);
}

const runs = [];
const totals = { unresolvedSourceWords: 0, contextualRuns: 0, equalCardinalityRuns: 0, sourceLongerRuns: 0, rowLongerRuns: 0, invertedAnchorRuns: 0, boundaryRuns: 0 };
for (const sequence of source.sequences) {
  const [chapter, verse] = sequence.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', sequence.gospel, chapter, `${verse}.json`), 'utf8'));
  const rowIndex = new Map(data.rows.map((row, index) => [row.id, index]));
  const placements = sequence.tokens.map((token) => {
    const key = `${sequence.gospel}:${sequence.reference}:${sequence.siglum}:${token.sourceIndex}`;
    return overrides.get(key) ?? (accepted.has(token.classification) ? token.targetRowId : null);
  });
  for (let start = 0; start < placements.length;) {
    if (placements[start]) { start++; continue; }
    let end = start;
    while (end + 1 < placements.length && !placements[end + 1]) end++;
    const previousSourceIndex = [...placements.slice(0, start).keys()].reverse().find((index) => placements[index]) ?? null;
    const followingOffset = placements.slice(end + 1).findIndex(Boolean);
    const nextSourceIndex = followingOffset < 0 ? null : end + 1 + followingOffset;
    const beforeRowId = previousSourceIndex === null ? null : placements[previousSourceIndex];
    const afterRowId = nextSourceIndex === null ? null : placements[nextSourceIndex];
    const lower = beforeRowId ? rowIndex.get(beforeRowId) : -1;
    const upper = afterRowId ? rowIndex.get(afterRowId) : data.rows.length;
    const inverted = lower >= upper;
    const intervalRows = inverted ? [] : data.rows.slice(lower + 1, upper).map((row) => ({ rowId: row.id, papyrus: row.papyrus, comparison: Object.fromEntries(['vaticanus', 'sinaiticus', 'byzantine', 'bezae', 'vulgate', 'peshitta', 'coptic'].map((column) => [column, row[column] ?? null])) }));
    const words = sequence.tokens.slice(start, end + 1).map((token) => ({ sourceWord: token.sourceIndex + 1, diplomatic: token.diplomatic, conditions: token.conditions ?? [], supplied: token.supplied ?? null, priorClassification: token.classification }));
    let classification = inverted ? 'inverted-anchors' : words.length === intervalRows.length ? 'equal-cardinality-context' : words.length > intervalRows.length ? 'source-longer-than-row-interval' : 'row-interval-longer-than-source';
    if (beforeRowId === null || afterRowId === null) totals.boundaryRuns++;
    totals.unresolvedSourceWords += words.length;
    totals.contextualRuns++;
    if (classification === 'equal-cardinality-context') totals.equalCardinalityRuns++;
    else if (classification === 'source-longer-than-row-interval') totals.sourceLongerRuns++;
    else if (classification === 'row-interval-longer-than-source') totals.rowLongerRuns++;
    else totals.invertedAnchorRuns++;
    runs.push({ gospel: sequence.gospel, reference: sequence.reference, siglum: sequence.siglum, sourceRange: [start + 1, end + 1], before: beforeRowId ? { sourceWord: previousSourceIndex + 1, rowId: beforeRowId } : null, after: afterRowId ? { sourceWord: nextSourceIndex + 1, rowId: afterRowId } : null, classification, words, intervalRows });
    start = end + 1;
  }
}

const report = { status: 'read-only-contextual-alignment-runs', generatedAt: new Date().toISOString(), rule: 'Every unresolved source word is retained. Runs are bounded only by already certified source-order anchors; comparison rows are placement candidates, never admission evidence.', totals, runs };
const output = path.join(ROOT, 'docs/audits/papyrus-contextual-alignment-runs.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...totals, output: path.relative(ROOT, output) }, null, 2));
