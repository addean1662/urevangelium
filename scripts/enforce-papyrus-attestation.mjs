import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { admitPapyrusVerse, papyrusWordEvidence } from '../lib/sources/papyrusEvidence.mjs';
import { loadPapyrusSourceIndex } from '../lib/sources/papyrusSourceIndex.mjs';

const root = path.resolve(import.meta.dirname, '..');
const index = loadPapyrusSourceIndex();
const write = process.argv.includes('--write');
const plans = [];
const report = { generatedAt: new Date().toISOString(), applied: write, scope: 'All saved Gospel verses; evidence from pinned transcriptions, not a claim of completed manuscript-image review.', totals: { verses: 0, changedVerses: 0, changedCells: 0, removedFullySuppliedCells: 0, partialCells: 0, governingWitnessChanges: 0, preservedSourceCoordinates: 0 }, priorSelectedEvidence: {}, byBook: {}, changes: [] };
const priorCounts = report.priorSelectedEvidence;
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const book = report.byBook[gospel] = { removedFullySuppliedCells: 0, partialCells: 0, governingWitnessChanges: 0 };
  for (const chapter of fs.readdirSync(path.join(root, 'data', gospel)).filter(n => /^\d+$/.test(n)).sort((a,b)=>+a-+b)) {
    for (const name of fs.readdirSync(path.join(root, 'data', gospel, chapter)).filter(n => /^\d+\.json$/.test(n)).sort((a,b)=>parseInt(a)-parseInt(b))) {
      const file = path.join(root, 'data', gospel, chapter, name), original = fs.readFileSync(file, 'utf8'), data = JSON.parse(original);
      const next = admitPapyrusVerse(data, index), ref = `${gospel} ${data.chapter}:${data.verse}`;
      report.totals.verses++;
      for (let i = 0; i < data.rows.length; i++) {
        const before = data.rows[i].papyrus ?? {}, after = next.rows[i].papyrus ?? {};
        if (JSON.stringify({ ...data.rows[i], papyrus: null }) !== JSON.stringify({ ...next.rows[i], papyrus: null })) throw new Error(`Other column changed: ${ref}`);
        const coords = before.provenance?.sourceAttestations ?? [];
        if (coords.length !== (after.provenance?.sourceAttestations?.length ?? 0)) throw new Error(`Source coordinate loss: ${ref}`);
        report.totals.preservedSourceCoordinates += coords.length;
        if (before.type === 'extant') {
          const states = coords.filter(a => a.siglum === before.provenance?.governingSiglum).map(a => papyrusWordEvidence(index.words.get(`${ref} ${a.siglum}`)[a.sourceToken - 1]).status);
          if (states.length) { const state = states.every(s => s === 'fully-supplied') ? 'fully-supplied' : states.every(s => s === 'attested') ? 'attested' : 'partial'; priorCounts[state] = (priorCounts[state] ?? 0) + 1; }
        }
        if (before.type === 'extant' && after.type === 'lost') { report.totals.removedFullySuppliedCells++; book.removedFullySuppliedCells++; }
        if (after.condition?.partial) { report.totals.partialCells++; book.partialCells++; }
        if (before.type === 'extant' && after.type === 'extant' && before.provenance?.governingSiglum !== after.provenance?.governingSiglum) { report.totals.governingWitnessChanges++; book.governingWitnessChanges++; }
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          report.totals.changedCells++;
          if (before.text !== after.text || before.type !== after.type || before.provenance?.governingSiglum !== after.provenance?.governingSiglum) report.changes.push({ ref, rowId: data.rows[i].id, before: { type: before.type, text: before.text, witness: before.provenance?.governingSiglum, condition: before.condition }, after: { type: after.type, text: after.text, witness: after.provenance?.governingSiglum, condition: after.condition } });
        }
      }
      if (JSON.stringify(data) !== JSON.stringify(next)) { report.totals.changedVerses++; plans.push({ file, original, data: next }); }
    }
  }
}
// Finish every source-coordinate and non-papyrus check before modifying any verse.
const outDir = path.join(root, 'docs/audits/verse-review/source-checks');
if (write) {
  const backup = path.join(outDir, 'papyrus-attestation-original-cells.json');
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(plans.map(p => ({ file: path.relative(root, p.file), sha256: crypto.createHash('sha256').update(p.original).digest('hex'), cells: JSON.parse(p.original).rows.map(r => ({ id: r.id, papyrus: r.papyrus })) }))) + '\n');
  for (const p of plans) fs.writeFileSync(p.file, JSON.stringify(p.data, null, 2) + '\n');
  if (plans.length) fs.writeFileSync(path.join(root, 'data/papyrus-attestation-summary.json'), JSON.stringify({ generatedAt: report.generatedAt, scope: report.scope, totals: report.totals, priorSelectedEvidence: report.priorSelectedEvidence, byBook: report.byBook }, null, 2) + '\n');
}
fs.writeFileSync(path.join(outDir, `papyrus-attestation-${write ? 'applied' : 'preview'}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, changes: `${report.changes.length} details saved in the audit report` }, null, 2));
