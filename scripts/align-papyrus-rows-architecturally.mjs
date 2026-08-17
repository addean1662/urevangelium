import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-completeness-audit.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const dates = Object.fromEntries(index.papyri.map((item) => [item.siglum, item.date]));
async function load(relativePath) { const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8'); return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`); }
const { similarity } = await load('lib/alignment/sequenceAlign.js');

const ns = { ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω', πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ' };
function greek(text) { const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου').replace(/[^α-ω]/g, ''); return ns[value] ?? value; }
function dateKey(siglum) { return Number((dates[siglum] ?? '').match(/\d{3,4}/)?.[0] ?? 9999); }
function siglumKey(siglum) { return Number(siglum.match(/\d+/)?.[0] ?? 9999); }
function rank(a, b) { return dateKey(a.siglum) - dateKey(b.siglum) || siglumKey(a.siglum) - siglumKey(b.siglum); }

const candidates = audit.findings.filter((item) => item.classification === 'unplaced-source-word');
const byVerse = new Map();
for (const item of candidates) { const key = `${item.gospel}:${item.reference}`; if (!byVerse.has(key)) byVerse.set(key, []); byVerse.get(key).push(item); }
const totals = { candidates: candidates.length, alignedExistingExact: 0, alignedExistingOrthographic: 0, ownRowGroups: 0, ownRowWords: 0, ambiguousSemanticPlacement: 0 };
const decisions = [];

for (const [key, items] of byVerse) {
  const [gospel, chapterText, verseText] = key.split(':'), chapter = Number(chapterText), verse = Number(verseText), reference = `${chapter}:${verse}`;
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`), 'utf8'));
  const rowIndex = new Map(data.rows.map((row, position) => [row.id, position]));
  const pendingOwn = [];

  for (const item of items) {
    const after = item.insertAfterRowId ? rowIndex.get(item.insertAfterRowId) : -1;
    const before = item.insertBeforeRowId ? rowIndex.get(item.insertBeforeRowId) : data.rows.length;
    const lower = after ?? -1, upper = before ?? data.rows.length;
    const sourceForm = greek(item.diplomatic);
    const possible = [];
    for (let position = lower + 1; position < upper; position++) {
      const row = data.rows[position];
      for (const column of ['papyrus', 'vaticanus', 'sinaiticus', 'byzantine']) {
        const cell = row[column];
        const text = cell?.type === 'extant' || cell?.type === 'text' ? cell.text : null;
        if (!text) continue;
        const form = greek(text), likeness = similarity(sourceForm, form);
        if (likeness === 1 || (Math.min(sourceForm.length, form.length) >= 4 && likeness >= 0.8)) possible.push({ rowId: row.id, column, text, likeness });
      }
    }
    possible.sort((a, b) => b.likeness - a.likeness || rowIndex.get(a.rowId) - rowIndex.get(b.rowId));
    if (possible.length && possible[0].likeness === 1) { totals.alignedExistingExact++; decisions.push({ ...item, classification: 'align-existing-propositional-row', confidence: 'high', evidence: possible.filter((match) => match.likeness === 1), decision: `Place ${item.siglum} on ${possible[0].rowId}; the same Greek contribution already occupies that row.` }); }
    else if (possible.length) { totals.alignedExistingOrthographic++; decisions.push({ ...item, classification: 'align-existing-propositional-row', confidence: 'medium', evidence: possible, decision: `Place ${item.siglum} on ${possible[0].rowId} under declared orthographic normalization.` }); }
    else if (upper === lower + 1) pendingOwn.push({ ...item, sourceForm, slot: `${item.insertAfterRowId ?? 'start'}|${item.insertBeforeRowId ?? 'end'}` });
    else { totals.ambiguousSemanticPlacement++; decisions.push({ ...item, classification: 'ambiguous-semantic-placement', confidence: 'unresolved', intervalRows: data.rows.slice(lower + 1, upper).map((row) => row.id), decision: 'Do not place automatically; the anchor interval contains multiple propositional rows and no lexical correspondence.' }); }
  }

  const ownGroups = new Map();
  for (const item of pendingOwn) { const groupKey = `${item.slot}|${item.sourceForm}`; if (!ownGroups.has(groupKey)) ownGroups.set(groupKey, []); ownGroups.get(groupKey).push(item); }
  for (const group of ownGroups.values()) {
    group.sort(rank); const selected = group[0];
    totals.ownRowGroups++; totals.ownRowWords += group.length;
    decisions.push({ gospel, reference, classification: 'create-own-propositional-row', confidence: 'architectural', insertAfterRowId: selected.insertAfterRowId, insertBeforeRowId: selected.insertBeforeRowId, selected: { siglum: selected.siglum, sourceWord: selected.sourceWord, diplomatic: selected.diplomatic, authority: selected.authority }, agreeingSigla: group.filter((item) => item.sourceForm === selected.sourceForm).map((item) => item.siglum), decision: 'Create one new row: every source word gets a row, and no existing row occupies this adjacent propositional slot. All non-papyrus cells are empty.' });
  }
}

const report = { status: 'rejected-method-do-not-apply', rejectionReason: 'A missing lexical match inside an open papyrus-anchor interval does not establish that no semantic counterpart exists across the other witness traditions.', generatedAt: new Date().toISOString(), rules: ['Align by propositional content, not morphology.', 'Every source word occupies exactly one row.', 'Equivalent contributions share a row.', 'A word without a counterpart receives its own row with every other column empty.', 'Lost and empty remain distinct.'], totals, decisions };
const outDir = path.join(ROOT, 'docs/audits'); fs.writeFileSync(path.join(outDir, 'papyrus-row-alignment.json'), JSON.stringify(report, null, 2) + '\n');
const t = totals;
fs.writeFileSync(path.join(outDir, 'papyrus-row-alignment.md'), ['# Papyrus Architectural Row Alignment', '', '> **REJECTED METHOD — DO NOT APPLY.** This report treated unmatched surface forms as evidence for papyrus-only rows without first resolving semantic correspondence and transposition against the guide hierarchy. It is retained only as an audit trail.', '', `Generated: ${report.generatedAt}`, '', '**Decision ledger only. No live data was modified.**', '', `- Unplaced source-word candidates: ${t.candidates}`, `- Existing propositional rows, exact Greek evidence: ${t.alignedExistingExact}`, `- Existing propositional rows, declared orthographic evidence: ${t.alignedExistingOrthographic}`, `- New own-row groups: ${t.ownRowGroups} (${t.ownRowWords} witness words)`, `- Ambiguous semantic placements retained: ${t.ambiguousSemanticPlacement}`, '', 'No candidate was aligned by morphology or word-count balancing. Wider intervals without a lexical correspondence remain unresolved.', ''].join('\n'));
console.log(JSON.stringify(totals, null, 2));
