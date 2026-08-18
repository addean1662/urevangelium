import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const selection = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-selection-audit.json'), 'utf8'));
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const sequences = new Map(sourceOrder.sequences.map((item) => [`${item.gospel}|${item.reference}|${item.siglum}`, item]));
const clean = new Set(['unique-guide-row', 'contextual-repeated-guide-row', 'certified-orthographic-existing-row']);
const conditioned = new Set(['conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
const sameForm = (token, displayed) => normalize(token.diplomatic) === normalize(displayed) || normalize(token.form) === normalize(displayed);
const admissible = (token) => clean.has(token.classification) || (conditioned.has(token.classification) && ((token.supplied === 'editor' || token.supplied === 'vid') || token.conditions?.some((item) => item.kind === 'missing') || (!token.supplied && token.conditions?.length > 0 && token.conditions.every((item) => item.kind === 'damaged'))));
const withoutPapyrus = (rows) => rows.map(({ papyrus: _papyrus, ...rest }) => rest);

const cases = [];
const totals = {};
for (const finding of selection.findings.filter((item) => item.classification === 'unsupported-placement')) {
  const evidence = [];
  for (const siglum of finding.sigla ?? []) {
    const sequence = sequences.get(`${finding.gospel}|${finding.reference}|${siglum}`);
    if (!sequence) { evidence.push({ siglum, classification: 'no-source-sequence' }); continue; }
    const formMatches = sequence.tokens.filter((token) => sameForm(token, finding.displayed));
    const current = formMatches.filter((token) => token.targetRowId === finding.rowId);
    const elsewhere = formMatches.filter((token) => token.targetRowId && token.targetRowId !== finding.rowId);
    evidence.push({ siglum, current, elsewhere, held: formMatches.filter((token) => !token.targetRowId) });
  }
  const hasCurrent = evidence.some((item) => item.current?.length);
  const admissibleElsewhere = evidence.flatMap((item) => item.elsewhere ?? []).filter(admissible);
  const held = evidence.flatMap((item) => item.held ?? []);
  const anyElsewhere = evidence.some((item) => item.elsewhere?.length);
  let adjudication;
  if (hasCurrent) adjudication = 'retain-source-order-supported';
  else if (admissibleElsewhere.length) adjudication = 'clear-stale-row-after-source-qualified-relocation';
  else if (held.length) adjudication = 'retain-for-held-token-review';
  else if (anyElsewhere) adjudication = 'clear-stale-conditioned-or-supplied-form';
  else adjudication = 'retain-unexplained-for-source-review';
  totals[adjudication] = (totals[adjudication] ?? 0) + 1;
  cases.push({ ...finding, adjudication, evidence });
}

const changed = [];
for (const item of cases.filter((entry) => ['clear-stale-row-after-source-qualified-relocation', 'clear-stale-conditioned-or-supplied-form'].includes(entry.adjudication))) {
  const [chapter, verse] = item.reference.split(':');
  const file = path.join(ROOT, 'data', item.gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const beforeOther = hash(withoutPapyrus(data.rows));
  const row = data.rows.find((candidate) => candidate.id === item.rowId);
  if (row?.papyrus?.type !== 'extant') throw new Error(`Expected extant cell at ${item.gospel} ${item.reference} ${item.rowId}`);
  const previous = row.papyrus;
  row.papyrus = { type: 'lost' };
  if (hash(withoutPapyrus(data.rows)) !== beforeOther) throw new Error(`Non-papyrus mutation at ${item.gospel} ${item.reference}`);
  changed.push({ gospel: item.gospel, reference: item.reference, rowId: item.rowId, previous, next: row.papyrus, relocatedEvidence: item.evidence.flatMap((entry) => entry.elsewhere ?? []).filter(admissible) });
  if (write) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const report = { status: write ? 'applied' : 'read-only', generatedAt: new Date().toISOString(), policy: 'Clear a live papyrus cell when no cited source maps that form to the current row and the same source form is mapped elsewhere. Source-qualified forms are retained at the mapped row, including CNTR damaged-readable text, explicit editorial supplies, and identified Greek letters bearing the MES missing-character condition.', totals, changed: changed.length, invariantErrors: [], cases };
const output = path.join(ROOT, 'docs/audits/papyrus-unsupported-placement-adjudication.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, changed: changed.length, output: path.relative(ROOT, output) }, null, 2));
