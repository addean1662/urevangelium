import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const runsAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-contextual-alignment-runs.json'), 'utf8'));
const heldPath = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
const held = JSON.parse(fs.readFileSync(heldPath, 'utf8'));
const groups = new Map();

for (const run of runsAudit.runs.filter((item) => item.classification === 'source-longer-than-row-interval' && item.intervalRows.length === 0)) {
  const key = `${run.gospel}|${run.reference}|${run.before?.rowId ?? 'START'}|${run.after?.rowId ?? 'END'}`;
  const group = groups.get(key) ?? { key, gospel: run.gospel, reference: run.reference, beforeRowId: run.before?.rowId ?? null, afterRowId: run.after?.rowId ?? null, runs: [] };
  group.runs.push(run);
  groups.set(key, group);
}

const emptyRow = (id) => ({ id, papyrus: { type: 'lost' }, vaticanus: { type: 'empty' }, sinaiticus: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' }, bezae: { type: 'empty' }, coptic: { type: 'empty' } });
const priorKeys = new Set(held.decisions.map((item) => `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`));
const decisions = [];
let rowsCreated = 0;

for (const group of groups.values()) {
  const [chapter, verse] = group.reference.split(':');
  const file = path.join(ROOT, 'data', group.gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const width = Math.max(...group.runs.map((run) => run.words.length));
  const stem = crypto.createHash('sha256').update(group.key).digest('hex').slice(0, 10);
  const rowIds = Array.from({ length: width }, (_, index) => `pap-src-${stem}-${index + 1}`);
  const missing = rowIds.filter((id) => !data.rows.some((row) => row.id === id));
  if (missing.length) {
    let insertion = group.afterRowId ? data.rows.findIndex((row) => row.id === group.afterRowId) : data.rows.length;
    if (insertion < 0 && group.beforeRowId) insertion = data.rows.findIndex((row) => row.id === group.beforeRowId) + 1;
    if (insertion < 0) throw new Error(`${group.key}: cannot locate insertion boundary`);
    data.rows.splice(insertion, 0, ...rowIds.map(emptyRow));
    rowsCreated += rowIds.length;
    if (write) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }
  for (const run of group.runs) {
    for (let index = 0; index < run.words.length; index++) {
      const word = run.words[index];
      const key = `${run.gospel}|${run.reference}|${run.siglum}|${word.sourceWord}`;
      if (priorKeys.has(key)) continue;
      decisions.push({ gospel: run.gospel, reference: run.reference, siglum: run.siglum, sourceToken: word.sourceWord, sourceIndex: word.sourceWord - 1, diplomatic: word.diplomatic, priorClassification: word.priorClassification, targetRowId: rowIds[index], certified: true, adjudication: 'source-attested-papyrus-specific-row-between-certified-contextual-anchors', conditions: word.conditions ?? [], supplied: word.supplied ?? null, contextualBounds: { before: run.before, after: run.after }, comparisonAgreementRequired: false });
    }
  }
}

if (write && decisions.length) {
  held.decisions.push(...decisions);
  held.generatedAt = new Date().toISOString();
  held.status = 'certified-with-papyrus-specific-source-rows';
  held.totals.certifiedSourceTokens = held.decisions.filter((item) => item.certified).length;
  held.totals.explicitAdjudications = held.decisions.filter((item) => item.certified && item.adjudication !== 'bounded-by-immediate-source-neighbors').length;
  held.totals.newRows = (held.totals.newRows ?? 0) + rowsCreated;
  fs.writeFileSync(heldPath, `${JSON.stringify(held, null, 2)}\n`);
}

console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', contextualGroups: groups.size, sourceWordsAdjudicated: decisions.length, papyrusSpecificRowsCreated: rowsCreated }, null, 2));
