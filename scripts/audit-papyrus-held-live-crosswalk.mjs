import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const heldAuditPath = path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json');
const certified = fs.existsSync(heldAuditPath) ? new Set(JSON.parse(fs.readFileSync(heldAuditPath, 'utf8')).decisions.filter((item) => item.certified).map((item) => `${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`)) : new Set();
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
const totals = { heldSourceTokens: 0, alreadyCertified: 0, exactLiveAlignment: 0, approximateLiveAlignment: 0, noLiveAlignment: 0, exactLiveOrderBounded: 0, exactLiveOrderConflict: 0 };
const cases = [];

for (const sequence of sourceOrder.sequences) {
  const held = sequence.tokens.filter((token) => !token.targetRowId);
  if (!held.length) continue;
  const [chapter, verse] = sequence.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', sequence.gospel, chapter, `${verse}.json`), 'utf8'));
  const live = data.rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => row.papyrus?.type === 'extant' && row.papyrus.fragments?.some((fragment) => fragment.id === sequence.siglum));
  const operations = alignSequences(sequence.tokens.map((token) => normalize(token.diplomatic)), live.map(({ row }) => normalize(row.papyrus.text)));
  const bySource = new Map(operations.filter((operation) => operation.sourceIndex !== null && operation.displayIndex !== null).map((operation) => [operation.sourceIndex, operation]));
  for (const token of held) {
    totals.heldSourceTokens++;
    const key = `${sequence.gospel}|${sequence.reference}|${sequence.siglum}|${token.sourceIndex + 1}`;
    if (certified.has(key)) { totals.alreadyCertified++; continue; }
    const operation = bySource.get(token.sourceIndex);
    if (!operation) {
      totals.noLiveAlignment++;
      cases.push({ gospel: sequence.gospel, reference: sequence.reference, siglum: sequence.siglum, sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, priorClassification: token.classification, classification: 'no-live-alignment' });
      continue;
    }
    const liveItem = live[operation.displayIndex];
    const exact = normalize(token.diplomatic) === normalize(liveItem.row.papyrus.text);
    if (!exact) {
      totals.approximateLiveAlignment++;
      const before = sequence.tokens.slice(0, token.sourceIndex).filter((candidate) => candidate.targetRowId).at(-1);
      const after = sequence.tokens.slice(token.sourceIndex + 1).find((candidate) => candidate.targetRowId);
      const beforeIndex = before ? data.rows.findIndex((row) => row.id === before.targetRowId) : -1;
      const afterIndex = after ? data.rows.findIndex((row) => row.id === after.targetRowId) : data.rows.length;
      const bounded = beforeIndex < liveItem.rowIndex && liveItem.rowIndex < afterIndex;
      cases.push({ gospel: sequence.gospel, reference: sequence.reference, siglum: sequence.siglum, sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, priorClassification: token.classification, classification: 'approximate-live-alignment', rowId: liveItem.row.id, displayed: liveItem.row.papyrus.text, similarity: operation.similarity, bounded, before: before ? { sourceToken: before.sourceIndex + 1, rowId: before.targetRowId } : null, after: after ? { sourceToken: after.sourceIndex + 1, rowId: after.targetRowId } : null });
      continue;
    }
    totals.exactLiveAlignment++;
    const before = sequence.tokens.slice(0, token.sourceIndex).filter((candidate) => candidate.targetRowId).at(-1);
    const after = sequence.tokens.slice(token.sourceIndex + 1).find((candidate) => candidate.targetRowId);
    const beforeIndex = before ? data.rows.findIndex((row) => row.id === before.targetRowId) : -1;
    const afterIndex = after ? data.rows.findIndex((row) => row.id === after.targetRowId) : data.rows.length;
    const bounded = beforeIndex < liveItem.rowIndex && liveItem.rowIndex < afterIndex;
    totals[bounded ? 'exactLiveOrderBounded' : 'exactLiveOrderConflict']++;
    cases.push({ gospel: sequence.gospel, reference: sequence.reference, siglum: sequence.siglum, sourceToken: token.sourceIndex + 1, diplomatic: token.diplomatic, priorClassification: token.classification, classification: bounded ? 'exact-live-order-bounded' : 'exact-live-order-conflict', rowId: liveItem.row.id, before: before ? { sourceToken: before.sourceIndex + 1, rowId: before.targetRowId } : null, after: after ? { sourceToken: after.sourceIndex + 1, rowId: after.targetRowId } : null });
  }
}

const report = { status: 'read-only-held-live-crosswalk', generatedAt: new Date().toISOString(), totals, cases };
const output = path.join(ROOT, 'docs/audits/papyrus-held-live-crosswalk.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals, output: path.relative(ROOT, output) }, null, 2));
