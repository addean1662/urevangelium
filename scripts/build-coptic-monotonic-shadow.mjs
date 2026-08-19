import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const COMPARISON_COLUMNS = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'peshitta', 'byzantine', 'bezae'];
const outputFile = path.join(ROOT, 'docs', 'audits', 'coptic-monotonic-shadow.json');

function isComparisonSlot(row) {
  return COMPARISON_COLUMNS.some((column) => {
    const cell = row[column];
    return cell && cell.type !== 'empty';
  });
}

function longestIncreasingAnchors(candidates) {
  if (candidates.length === 0) return [];
  const lengths = Array(candidates.length).fill(1);
  const prior = Array(candidates.length).fill(-1);
  let best = 0;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < i; j++) {
      if (candidates[j].token < candidates[i].token && lengths[j] + 1 > lengths[i]) {
        lengths[i] = lengths[j] + 1;
        prior[i] = j;
      }
    }
    if (lengths[i] > lengths[best]) best = i;
  }
  const result = [];
  for (let at = best; at >= 0; at = prior[at]) {
    result.push(candidates[at]);
    if (prior[at] === -1) break;
  }
  return result.reverse();
}

function distribute(tokens, slots) {
  if (tokens.length === 0) return { assignments: [], unresolved: [] };
  if (slots.length === 0) return { assignments: [], unresolved: tokens };
  const assignments = [];
  if (tokens.length <= slots.length) {
    let previous = -1;
    for (let i = 0; i < tokens.length; i++) {
      let slotIndex = Math.round(((i + 1) * (slots.length + 1)) / (tokens.length + 1)) - 1;
      slotIndex = Math.max(previous + 1, Math.min(slotIndex, slots.length - (tokens.length - i)));
      assignments.push({ rowIndex: slots[slotIndex], tokens: [tokens[i]], method: 'monotonic-positional' });
      previous = slotIndex;
    }
    return { assignments, unresolved: [] };
  }

  for (let i = 0; i < slots.length; i++) {
    const start = Math.floor((i * tokens.length) / slots.length);
    const end = Math.floor(((i + 1) * tokens.length) / slots.length);
    assignments.push({ rowIndex: slots[i], tokens: tokens.slice(start, end), method: 'monotonic-grouped' });
  }
  return { assignments, unresolved: [] };
}

const report = {
  status: 'shadow-only',
  generatedAt: new Date().toISOString(),
  method: 'retain a longest source-order subsequence of non-draft anchors; distribute remaining source tokens monotonically between anchors',
  warning: 'Monotonic placement is a structural prerequisite, not contextual or scholarly alignment certification.',
  totals: {
    verses: 0, sourceTokens: 0, candidateAnchors: 0, retainedAnchors: 0,
    crossingAnchorsRejected: 0, changedPlacements: 0, groupedTokens: 0,
    copticOnlyRowsRemovedFromGrid: 0, unresolvedTokens: 0, proposedOrderBreaks: 0,
  },
  gospels: {},
  reviewCases: [],
};

for (const gospel of GOSPELS) {
  const totals = Object.fromEntries(Object.keys(report.totals).map((key) => [key, 0]));
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => /^\d+\.json$/.test(name))) {
      const document = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter.name, filename), 'utf8'));
      const tokens = document.rows.flatMap((row, rowIndex) => row.coptic?.type === 'text' && row.coptic.provenance?.sourceToken
        ? [{ token: row.coptic.provenance.sourceToken, text: row.coptic.text, currentRowIndex: rowIndex, currentRowId: row.id, draft: row._copticDraft === true }]
        : []).sort((a, b) => a.token - b.token);
      if (tokens.length === 0) continue;

      const comparisonRows = document.rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => isComparisonSlot(row));
      const gridIndex = new Map(comparisonRows.map(({ rowIndex }, index) => [rowIndex, index]));
      const candidates = tokens.filter((token) => !token.draft && gridIndex.has(token.currentRowIndex))
        .map((token) => ({ token: token.token, rowIndex: gridIndex.get(token.currentRowIndex), currentRowId: token.currentRowId }))
        .sort((a, b) => a.rowIndex - b.rowIndex);
      const anchors = longestIncreasingAnchors(candidates);
      const anchorTokens = new Set(anchors.map((anchor) => anchor.token));
      const assignments = anchors.map((anchor) => ({ rowIndex: anchor.rowIndex, tokens: [tokens.find((token) => token.token === anchor.token)], method: 'retained-anchor' }));
      const unresolved = [];
      const boundaries = [
        { token: 0, rowIndex: -1 },
        ...anchors,
        { token: tokens.at(-1).token + 1, rowIndex: comparisonRows.length },
      ];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const left = boundaries[i];
        const right = boundaries[i + 1];
        const segmentTokens = tokens.filter((token) => token.token > left.token && token.token < right.token && !anchorTokens.has(token.token));
        const slots = [];
        for (let rowIndex = left.rowIndex + 1; rowIndex < right.rowIndex; rowIndex++) slots.push(rowIndex);
        const distributed = distribute(segmentTokens, slots);
        assignments.push(...distributed.assignments);
        unresolved.push(...distributed.unresolved);
      }
      assignments.sort((a, b) => a.rowIndex - b.rowIndex);
      const proposedOrder = assignments.flatMap((assignment) => assignment.tokens.map((token) => token.token));
      let proposedOrderBreaks = 0;
      for (let i = 1; i < proposedOrder.length; i++) if (proposedOrder[i] <= proposedOrder[i - 1]) proposedOrderBreaks++;
      const changed = assignments.flatMap((assignment) => assignment.tokens.map((token) => ({ token, target: comparisonRows[assignment.rowIndex]?.row.id })))
        .filter(({ token, target }) => token.currentRowId !== target);
      const copticOnly = document.rows.filter((row) => row.coptic?.type === 'text' && !isComparisonSlot(row)).length;
      const grouped = assignments.filter((assignment) => assignment.tokens.length > 1).reduce((sum, assignment) => sum + assignment.tokens.length, 0);

      const verseTotals = {
        verses: 1, sourceTokens: tokens.length, candidateAnchors: candidates.length, retainedAnchors: anchors.length,
        crossingAnchorsRejected: candidates.length - anchors.length, changedPlacements: changed.length,
        groupedTokens: grouped, copticOnlyRowsRemovedFromGrid: copticOnly, unresolvedTokens: unresolved.length,
        proposedOrderBreaks,
      };
      for (const [key, value] of Object.entries(verseTotals)) totals[key] += value;
      if ((changed.length || copticOnly || unresolved.length) && report.reviewCases.length < 250) {
        report.reviewCases.push({ gospel, reference: `${chapter.name}:${filename.slice(0, -5)}`, ...verseTotals,
          rejectedAnchors: candidates.filter((candidate) => !anchors.some((anchor) => anchor.token === candidate.token)),
          unresolved: unresolved.map(({ token, text }) => ({ token, text })),
        });
      }
    }
  }
  report.gospels[gospel] = totals;
  for (const [key, value] of Object.entries(totals)) report.totals[key] += value;
}

fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
