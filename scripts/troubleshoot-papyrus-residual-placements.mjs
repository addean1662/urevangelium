import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const selection = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-selection-audit.json'), 'utf8'));
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const sequences = new Map(sourceOrder.sequences.map((item) => [`${item.gospel}|${item.reference}|${item.siglum}`, item]));
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');

function similarity(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const prior = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prior[0];
    prior[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prior[j];
      prior[j] = Math.min(prior[j] + 1, prior[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - prior[b.length] / Math.max(a.length, b.length);
}

const cases = [];
const totals = {};
const cleared = [];
for (const finding of selection.findings.filter((item) => item.classification === 'unsupported-placement')) {
  const [chapter, verse] = finding.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', finding.gospel, chapter, `${verse}.json`), 'utf8'));
  const row = data.rows.find((candidate) => candidate.id === finding.rowId);
  const displayed = normalize(finding.displayed);
  const evidence = [];
  for (const siglum of finding.sigla ?? []) {
    const sequence = sequences.get(`${finding.gospel}|${finding.reference}|${siglum}`);
    if (!sequence) { evidence.push({ siglum, status: 'no-source-sequence' }); continue; }
    const tokens = sequence.tokens;
    const heldExact = tokens.filter((token) => !token.targetRowId && normalize(token.diplomatic) === displayed);
    const mappedHere = tokens.filter((token) => token.targetRowId === finding.rowId);
    const contiguous = [];
    for (let start = 0; start < tokens.length; start++) for (let width = 2; width <= 3 && start + width <= tokens.length; width++) {
      const slice = tokens.slice(start, start + width);
      if (slice.map((token) => normalize(token.diplomatic)).join('') === displayed) contiguous.push(slice.map((token) => ({ sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, targetRowId: token.targetRowId })));
    }
    const nearest = tokens.map((token) => ({ sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, targetRowId: token.targetRowId, classification: token.classification, similarity: similarity(displayed, normalize(token.diplomatic)) })).sort((a, b) => b.similarity - a.similarity || a.sourceToken - b.sourceToken).slice(0, 3);
    evidence.push({ siglum, sourceTokens: tokens.length, mappedHere, heldExact, contiguous, nearest });
  }
  const guideMatches = ['vaticanus', 'sinaiticus', 'byzantine'].filter((column) => normalize(row?.[column]?.text) === displayed);
  const heldExact = evidence.flatMap((item) => item.heldExact ?? []);
  const contiguous = evidence.flatMap((item) => item.contiguous ?? []);
  const bestSimilarity = Math.max(0, ...evidence.flatMap((item) => item.nearest ?? []).map((item) => item.similarity));
  let classification;
  const currentRowIndex = data.rows.findIndex((candidate) => candidate.id === finding.rowId);
  const orderChecks = [];
  for (const item of evidence) for (const token of item.heldExact ?? []) {
    const sequence = sequences.get(`${finding.gospel}|${finding.reference}|${item.siglum}`);
    const sourcePosition = sequence.tokens.indexOf(token);
    const before = sequence.tokens.slice(0, sourcePosition).filter((candidate) => candidate.targetRowId).at(-1);
    const after = sequence.tokens.slice(sourcePosition + 1).find((candidate) => candidate.targetRowId);
    const beforeRowIndex = before ? data.rows.findIndex((candidate) => candidate.id === before.targetRowId) : -1;
    const afterRowIndex = after ? data.rows.findIndex((candidate) => candidate.id === after.targetRowId) : data.rows.length;
    orderChecks.push({ siglum: item.siglum, sourceToken: token.sourceIndex + 1, before: before ? { sourceToken: before.sourceIndex + 1, rowId: before.targetRowId } : null, after: after ? { sourceToken: after.sourceIndex + 1, rowId: after.targetRowId } : null, currentRowIndex, beforeRowIndex, afterRowIndex, ordered: beforeRowIndex < currentRowIndex && currentRowIndex < afterRowIndex });
  }
  if (heldExact.length && orderChecks.length && orderChecks.every((check) => check.ordered)) classification = 'exact-held-token-certified-by-source-order';
  else if (heldExact.length) classification = 'exact-source-token-held-order-conflict';
  else if (contiguous.length) classification = 'multiple-source-words-in-one-cell';
  else if (bestSimilarity >= 0.8) classification = 'near-source-form-review';
  else if (guideMatches.length) classification = 'guide-form-without-source-support';
  else classification = 'no-source-form-support';
  totals[classification] = (totals[classification] ?? 0) + 1;
  cases.push({ ...finding, classification, guideMatches, bestSimilarity, orderChecks, provenance: row?.papyrus?.provenance ?? null, evidence });
  if (write && ['guide-form-without-source-support', 'multiple-source-words-in-one-cell', 'near-source-form-review'].includes(classification)) {
    const previous = row.papyrus;
    row.papyrus = { type: 'lost' };
    fs.writeFileSync(path.join(ROOT, 'data', finding.gospel, chapter, `${verse}.json`), `${JSON.stringify(data, null, 2)}\n`);
    cleared.push({ gospel: finding.gospel, reference: finding.reference, rowId: finding.rowId, classification, previous, next: row.papyrus });
  }
}

const report = { status: write ? 'applied-residual-placement-cleanup' : 'read-only-residual-placement-troubleshooting', generatedAt: new Date().toISOString(), totals, cleared: cleared.length, cases };
const output = path.join(ROOT, 'docs/audits/papyrus-residual-placement-troubleshooting.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, cleared: cleared.length, output: path.relative(ROOT, output) }, null, 2));
