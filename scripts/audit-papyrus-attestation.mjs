import fs from 'node:fs';
import path from 'node:path';
import { parseMesLine } from '../lib/sources/cntrMes.js';

const root = path.resolve(import.meta.dirname, '..');
const books = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const sources = new Map();
const clean = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('ς', 'σ').replaceAll('¯', 'ν').replaceAll('ϗ', 'και').replaceAll('ϫ', 'τρ').replaceAll('\ue001', 'μου');
for (const name of fs.readdirSync(path.join(root, 'data/sources/earliest-papyrus')).filter(n => /^P\d+\.txt$/.test(n))) {
  const siglum = name === 'P64.txt' ? 'P64+P67' : name.slice(0, -4);
  for (const line of fs.readFileSync(path.join(root, 'data/sources/earliest-papyrus', name), 'utf8').split(/\r?\n/)) {
    if (!/^\d{8} /.test(line) || line.includes('[stub')) continue;
    const parsed = parseMesLine(line), ref = parsed.reference;
    if (books[ref.book]) sources.set(`${books[ref.book]} ${ref.chapter}:${ref.verse} ${siglum}`, parsed.baseWords.filter(w => w.presence !== 'absent'));
  }
}
const totals = {}, examples = {}, findings = [];
const add = (key, detail) => { totals[key] = (totals[key] ?? 0) + 1; (examples[key] ??= []).length < 4 && examples[key].push(detail); };
for (const gospel of Object.values(books)) for (const chapter of fs.readdirSync(path.join(root, 'data', gospel)).filter(n => /^\d+$/.test(n))) {
  for (const name of fs.readdirSync(path.join(root, 'data', gospel, chapter)).filter(n => /^\d+\.json$/.test(n))) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data', gospel, chapter, name), 'utf8'));
    const ref = `${gospel} ${data.chapter}:${data.verse}`;
    for (const row of data.rows) {
      const cell = row.papyrus;
      if (cell?.type !== 'extant') continue;
      add('extantCells', ref);
      const resolved = [];
      for (const a of cell.provenance?.sourceAttestations ?? []) {
        const word = sources.get(`${ref} ${a.siglum}`)?.[a.sourceToken - 1];
        if (!word || clean(word.diplomatic) !== clean(a.diplomatic)) { add('unresolvedCoordinates', { ref, rowId: row.id, a, actual: word?.diplomatic }); continue; }
        const missing = new Set(word.conditions.filter(c => c.kind === 'missing').map(c => c.after - 1));
        const supplied = Boolean(word.supplied || word.presence === 'present');
        const remaining = [...word.diplomatic].filter((c, i) => !missing.has(i) && /[\p{L}]/u.test(c)).length;
        const state = supplied && !missing.size || !remaining ? 'fullySupplied' : missing.size ? 'partial' : 'readable';
        resolved.push({ siglum: a.siglum, sourceToken: a.sourceToken, raw: word.raw, text: word.diplomatic, state, supplied, presence: word.presence });
      }
      const detail = { ref, rowId: row.id, text: cell.text, condition: cell.condition, resolved };
      if (!resolved.length) add('cellsWithoutResolvedEvidence', detail);
      const attested = resolved.filter(x => x.state !== 'fullySupplied');
      if (resolved.length && !attested.length) add('onlyFullySuppliedEvidence', detail);
      if (cell.condition?.supplied) {
        add('selectedSupplied', detail);
        if (attested.length) add('selectedSuppliedWithSurvivingEvidence', detail);
      }
      if (resolved.some(x => x.presence === 'present')) add('cellsWithVidMarker', detail);
      if (resolved.some(x => x.state !== 'readable') || !resolved.length) findings.push(detail);
    }
  }
}
const output = path.join(root, 'docs/audits/verse-review/source-checks/papyrus-attestation-audit.json');
fs.writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Source-markup audit; not image certification. Coordinates must match the pinned transcription.', totals, examples, findings }, null, 2) + '\n');
console.log(JSON.stringify({ totals, examples: { unresolvedCoordinates: examples.unresolvedCoordinates, cellsWithoutResolvedEvidence: examples.cellsWithoutResolvedEvidence, selectedSuppliedWithSurvivingEvidence: examples.selectedSuppliedWithSurvivingEvidence }, output }, null, 2));
