import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const inputFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json');
const outputFile = path.join(ROOT, 'docs/audits/vulgate-expanded-row-placement-shadow.json');
const adjudication = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function parseReference(reference) {
  const match = /^(matthew|mark|luke|john) (\d+):(\d+)$/u.exec(reference);
  if (!match) throw new Error(`Invalid reference: ${reference}`);
  return { gospel: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
}

function loadDisplayRows(displayReferences) {
  const rows = [];
  for (const reference of displayReferences) {
    const { gospel, chapter, verse } = parseReference(reference);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.rows.forEach((row, rowIndex) => rows.push({ reference, rowIndex, row }));
  }
  return rows;
}

function latinIndexOf(cell) {
  if (cell?.type !== 'text') return null;
  const alignmentIndex = cell.provenance?.englishAlignment?.latinIndex;
  if (Number.isInteger(alignmentIndex)) return alignmentIndex;
  const sourceToken = cell.provenance?.sourceToken;
  return Number.isInteger(sourceToken) ? sourceToken - 1 : null;
}

// Lexicographic score: reuse as many rows as possible, then prefer placing an
// English token directly beside its already-admitted Latin owner.
function better(left, right) {
  if (!right) return left;
  if (!left) return right;
  if (left.used !== right.used) return left.used > right.used ? left : right;
  if (left.colocated !== right.colocated) return left.colocated > right.colocated ? left : right;
  return left;
}

function place(unit, displayRows) {
  const claims = new Map();
  for (const row of unit.rows) {
    if (row.action !== 'display') continue;
    for (const englishIndex of row.englishIndices ?? []) {
      const owners = claims.get(englishIndex) ?? new Set();
      owners.add(row.latinIndex);
      claims.set(englishIndex, owners);
    }
  }
  const rows = displayRows.map((entry) => ({
    ...entry,
    latinIndex: latinIndexOf(entry.row.vulgate),
    reusable: entry.row.vulgate?.type === 'empty',
  }));
  const E = unit.publishedEnglish.length;
  const R = rows.length;
  const dp = Array.from({ length: R + 1 }, () => Array(E + 1).fill(null));
  dp[0][0] = { used: 0, colocated: 0, from: null };
  for (let r = 0; r <= R; r++) {
    for (let e = 0; e <= E; e++) {
      const current = dp[r][e];
      if (!current) continue;
      if (r < R) {
        const candidate = { ...current, from: { r, e, action: 'skip-row' } };
        dp[r + 1][e] = better(candidate, dp[r + 1][e]);
      }
      if (e < E) {
        const candidate = { ...current, from: { r, e, action: 'insert-english' } };
        dp[r][e + 1] = better(candidate, dp[r][e + 1]);
      }
      if (r < R && e < E) {
        const owners = claims.get(e) ?? new Set();
        const colocated = rows[r].latinIndex !== null && owners.has(rows[r].latinIndex);
        if (rows[r].reusable || colocated) {
          const candidate = { used: current.used + 1, colocated: current.colocated + Number(colocated), from: { r, e, action: colocated ? 'source-row' : 'reused-empty-row' } };
          dp[r + 1][e + 1] = better(candidate, dp[r + 1][e + 1]);
        }
      }
    }
  }
  const placements = [];
  let r = R;
  let e = E;
  while (r > 0 || e > 0) {
    const state = dp[r][e];
    if (!state?.from) throw new Error(`${unit.sourceReference}: incomplete placement backtrack at ${r}:${e}`);
    const from = state.from;
    if (from.action === 'source-row' || from.action === 'reused-empty-row') {
      const target = rows[from.r];
      const owners = [...(claims.get(from.e) ?? [])];
      placements.push({
        englishIndex: from.e,
        english: unit.publishedEnglish[from.e],
        action: from.action,
        targetReference: target.reference,
        targetRowIndex: target.rowIndex,
        targetRowId: target.row.id,
        latinIndex: target.latinIndex,
        claimedLatinIndices: owners,
        alignmentGroupIds: owners.length ? owners.map((owner) => `${unit.sourceReference}:latin:${owner}`) : [`${unit.sourceReference}:english:${from.e}`],
      });
    } else if (from.action === 'insert-english') {
      const owners = [...(claims.get(from.e) ?? [])];
      placements.push({
        englishIndex: from.e,
        english: unit.publishedEnglish[from.e],
        action: 'new-translation-row',
        insertBeforeCombinedRow: from.r < rows.length ? { reference: rows[from.r].reference, rowIndex: rows[from.r].rowIndex, rowId: rows[from.r].row.id } : null,
        claimedLatinIndices: owners,
        alignmentGroupIds: owners.length ? owners.map((owner) => `${unit.sourceReference}:latin:${owner}`) : [`${unit.sourceReference}:english:${from.e}`],
      });
    }
    r = from.r;
    e = from.e;
  }
  placements.reverse();
  const placedIndices = placements.map((item) => item.englishIndex);
  if (placedIndices.length !== E || placedIndices.some((index, position) => index !== position)) {
    throw new Error(`${unit.sourceReference}: English source order or coverage failure`);
  }
  return { rows, placements };
}

const totals = {
  units: 0,
  displayVerses: 0,
  existingRows: 0,
  latinSourceRows: 0,
  existingEmptyVulgateRows: 0,
  englishTokens: 0,
  colocatedSourceRows: 0,
  reusedEmptyRows: 0,
  newTranslationRows: 0,
  finalRows: 0,
  latinRowsWithoutColocatedEnglish: 0,
  crossRowSemanticLinks: 0,
  errors: 0,
};
const units = [];
const errors = [];

for (const unit of adjudication.units) {
  try {
    const displayRows = loadDisplayRows(unit.displayReferences);
    const result = place(unit, displayRows);
    const colocated = result.placements.filter((item) => item.action === 'source-row').length;
    const reused = result.placements.filter((item) => item.action === 'reused-empty-row').length;
    const inserted = result.placements.filter((item) => item.action === 'new-translation-row').length;
    const latinRows = result.rows.filter((row) => row.latinIndex !== null).length;
    const emptyRows = result.rows.filter((row) => row.reusable).length;
    const crossRow = result.placements.filter((item) => item.action !== 'source-row' && item.claimedLatinIndices.length).length;
    totals.units++;
    totals.displayVerses += unit.displayReferences.length;
    totals.existingRows += result.rows.length;
    totals.latinSourceRows += latinRows;
    totals.existingEmptyVulgateRows += emptyRows;
    totals.englishTokens += unit.publishedEnglish.length;
    totals.colocatedSourceRows += colocated;
    totals.reusedEmptyRows += reused;
    totals.newTranslationRows += inserted;
    totals.finalRows += result.rows.length + inserted;
    totals.latinRowsWithoutColocatedEnglish += latinRows - colocated;
    totals.crossRowSemanticLinks += crossRow;
    units.push({
      sourceReference: unit.sourceReference,
      displayReferences: unit.displayReferences,
      existingRows: result.rows.length,
      latinSourceRows: latinRows,
      existingEmptyVulgateRows: emptyRows,
      englishTokens: unit.publishedEnglish.length,
      colocatedSourceRows: colocated,
      reusedEmptyRows: reused,
      newTranslationRows: inserted,
      finalRows: result.rows.length + inserted,
      crossRowSemanticLinks: crossRow,
      placements: result.placements,
    });
  } catch (error) {
    totals.errors++;
    errors.push({ sourceReference: unit.sourceReference, message: error.message });
  }
}

const report = {
  status: errors.length ? 'blocked-placement-errors' : 'shadow-only-order-preserving-row-placement',
  generatedAt: new Date().toISOString(),
  governingSources: ['Clementine Vulgate Latin', 'Douay-Rheims American Edition 1899'],
  corroboratingTraditions: ['Bezae Latin', 'Bezae Greek', 'Vaticanus', 'Byzantine', 'Sinaiticus'],
  rules: [
    'Every Latin and English token remains in its published source order and appears exactly once.',
    'A source Latin row receives English only when the existing adjudication assigns that exact Douay token to that Latin token.',
    'An existing empty Vulgate slot may carry a translation-only token; this is neither source text nor an omission.',
    'If no existing row is available without violating order, a new translation-expansion row is required.',
    'Semantic group identifiers preserve admitted correspondence when linked words occupy different physical rows.',
  ],
  inputAdjudicationSha256: adjudication.adjudicationSha256,
  totals,
  errors,
  largestNewRowRequirements: [...units].sort((a, b) => b.newTranslationRows - a.newTranslationRows).slice(0, 50).map(({ placements, ...unit }) => unit),
  units,
};
report.reportSha256 = sha256(JSON.stringify(report));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, errors, reportSha256: report.reportSha256, output: path.relative(ROOT, outputFile) }, null, 2));
