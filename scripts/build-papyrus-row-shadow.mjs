import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-row-alignment.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const dates = Object.fromEntries(index.papyri.map((item) => [item.siglum, item.date]));
const NON_PAPYRUS = ['coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
const ns = { ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω' };
function greek(text) { const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου').replace(/[^α-ω]/g, ''); return ns[value] ?? value; }
function projection(text) { const value = text.replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου'); return value.endsWith('σ') ? `${value.slice(0, -1)}ς` : value; }
function dateKey(siglum) { return Number((dates[siglum] ?? '').match(/\d{3,4}/)?.[0] ?? 9999); }
function siglumKey(siglum) { return Number(siglum.match(/\d+/)?.[0] ?? 9999); }
function earlier(a, b) { return dateKey(a) - dateKey(b) || siglumKey(a) - siglumKey(b); }
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function otherProjection(rows) { return rows.filter((row) => !String(row.id).startsWith('pap-')).map((row) => Object.fromEntries(NON_PAPYRUS.map((column) => [column, row[column] ?? null]))); }

const grouped = new Map();
for (const decision of ledger.decisions) { const key = `${decision.gospel}:${decision.reference}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(decision); }
const summary = { status: 'rejected-method-do-not-apply', rejectionReason: 'The proposed new rows were inferred from lexical gaps rather than demonstrated absence of semantic counterparts across traditions.', generatedAt: new Date().toISOString(), sourceLedger: 'docs/audits/papyrus-row-alignment.json', totals: { affectedVerses: 0, existingRowsPopulated: 0, existingRowsBadgesAdded: 0, existingRowsAlreadyRepresented: 0, earlierReadingsSelected: 0, dissentingReadingsPreserved: 0, newRowsCreated: 0, ambiguousPreserved: 0 }, invariantErrors: [], gospels: {} };
const outDir = path.join(ROOT, 'docs/audits/papyrus-row-shadow'); fs.mkdirSync(outDir, { recursive: true });

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const verses = [];
  for (const [key, decisions] of grouped) {
    if (!key.startsWith(`${gospel}:`)) continue;
    const reference = key.slice(gospel.length + 1), [chapter, verse] = reference.split(':').map(Number);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`), live = JSON.parse(fs.readFileSync(file, 'utf8')), proposedRows = structuredClone(live.rows), evidence = [];

    for (const decision of decisions.filter((item) => item.classification === 'align-existing-propositional-row')) {
      const targetId = decision.evidence[0].rowId, row = proposedRows.find((item) => item.id === targetId), text = projection(decision.diplomatic), fragment = { id: decision.siglum, date: dates[decision.siglum] ?? 'date unavailable' };
      if (!row) { summary.invariantErrors.push(`${gospel} ${reference}: missing ${targetId}`); continue; }
      if (row.papyrus?.type !== 'extant') { row.papyrus = { type: 'extant', fragments: [fragment], text }; summary.totals.existingRowsPopulated++; }
      else if (greek(row.papyrus.text) === greek(text)) { if (!row.papyrus.fragments.some((item) => item.id === decision.siglum)) { row.papyrus.fragments.push(fragment); row.papyrus.fragments.sort((a, b) => earlier(a.id, b.id)); summary.totals.existingRowsBadgesAdded++; } else summary.totals.existingRowsAlreadyRepresented++; }
      else {
        const currentFirst = [...row.papyrus.fragments].sort((a, b) => earlier(a.id, b.id))[0]?.id;
        if (!currentFirst || earlier(decision.siglum, currentFirst) < 0) { evidence.push({ rowId: targetId, status: 'displaced-later-reading', previous: row.papyrus }); row.papyrus = { type: 'extant', fragments: [fragment], text }; summary.totals.earlierReadingsSelected++; }
        else { evidence.push({ rowId: targetId, status: 'dissenting-reading', siglum: decision.siglum, diplomatic: decision.diplomatic, authority: decision.authority }); summary.totals.dissentingReadingsPreserved++; }
      }
      evidence.push(decision);
    }

    const own = decisions.filter((item) => item.classification === 'create-own-propositional-row').sort((a, b) => (a.insertAfterRowId ?? '').localeCompare(b.insertAfterRowId ?? '') || a.selected.sourceWord - b.selected.sourceWord);
    const offsets = new Map();
    for (const decision of own) {
      const anchor = decision.insertAfterRowId ?? 'start', offset = offsets.get(anchor) ?? 0;
      let insertAt = 0;
      if (decision.insertAfterRowId) { const anchorIndex = proposedRows.findIndex((row) => row.id === decision.insertAfterRowId); insertAt = anchorIndex < 0 ? 0 : anchorIndex + 1 + offset; }
      const id = `pap-${gospel}-${chapter}-${verse}-${decision.selected.siglum.replace(/[^A-Za-z0-9]/g, '')}-${decision.selected.sourceWord}`;
      proposedRows.splice(insertAt, 0, { id, papyrus: { type: 'extant', fragments: decision.agreeingSigla.map((siglum) => ({ id: siglum, date: dates[siglum] ?? 'date unavailable' })).sort((a, b) => earlier(a.id, b.id)), text: projection(decision.selected.diplomatic) }, coptic: { type: 'empty' }, vaticanus: { type: 'empty' }, sinaiticus: { type: 'empty' }, bezae: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' } });
      offsets.set(anchor, offset + 1); summary.totals.newRowsCreated++; evidence.push({ ...decision, proposedRowId: id });
    }
    for (const decision of decisions.filter((item) => item.classification === 'ambiguous-semantic-placement')) { summary.totals.ambiguousPreserved++; evidence.push(decision); }
    if (hash(otherProjection(live.rows)) !== hash(otherProjection(proposedRows))) summary.invariantErrors.push(`${gospel} ${reference}: existing non-papyrus mutation`);
    verses.push({ reference: `${gospel} ${reference}`, proposedRows, architecturalEvidence: evidence }); summary.totals.affectedVerses++;
  }
  const out = path.join(outDir, `${gospel}.json`); fs.writeFileSync(out, JSON.stringify({ status: summary.status, generatedAt: summary.generatedAt, gospel, verses }, null, 2) + '\n'); summary.gospels[gospel] = { affectedVerses: verses.length, artifact: path.relative(ROOT, out).replaceAll('\\', '/') };
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const t = summary.totals;
fs.writeFileSync(path.join(outDir, 'summary.md'), ['# Papyrus Architectural Row Shadow', '', '> **REJECTED METHOD — DO NOT APPLY.** The proposed inserted rows are not approved. This shadow predates the structural-guide and transposition rule and is retained only as an audit trail.', '', `Generated: ${summary.generatedAt}`, '', '**Shadow only. No live Gospel data was modified.**', '', `- Affected verses: ${t.affectedVerses}`, `- Previously empty/lost existing rows populated: ${t.existingRowsPopulated}`, `- Agreeing badges added to existing rows: ${t.existingRowsBadgesAdded}`, `- Existing rows already representing the witness: ${t.existingRowsAlreadyRepresented}`, `- Earlier readings selected on occupied rows: ${t.earlierReadingsSelected}`, `- Later dissenting readings retained in evidence: ${t.dissentingReadingsPreserved}`, `- New one-word rows created: ${t.newRowsCreated}`, `- Ambiguous semantic placements retained: ${t.ambiguousPreserved}`, `- Preservation invariant errors: ${summary.invariantErrors.length}`, '', 'Every inserted row contains exactly one papyrus word and empty cells in every other column. No placement was inferred by morphology or word-count balancing.', ''].join('\n'));
console.log(JSON.stringify({ totals: summary.totals, invariantErrors: summary.invariantErrors }, null, 2));
if (summary.invariantErrors.length) process.exitCode = 1;
