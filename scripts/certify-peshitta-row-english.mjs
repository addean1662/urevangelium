import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/peshitta-row-english-adjudication.json'), 'utf8'));
const files = new Map();
const failures = [];
const totals = { units: 0, groups: 0, syriacRows: 0, englishWords: 0, populatedEnglishCells: 0, blankEnglishCells: 0, mergedCells: 0, continuationCells: 0, arrowGlyphs: 0, failures: 0 };
const ARROW_RE = /[←→↔↕↑↓⇄⇆⟷⟶⟵↳]/u;

function documentFor(reference) {
  if (files.has(reference)) return files.get(reference);
  const match = reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u);
  if (!match) throw new Error(`Invalid reference: ${reference}`);
  const document = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', match[1], match[2], `${match[3]}.json`), 'utf8'));
  files.set(reference, document);
  return document;
}

for (const unit of ledger.decisions) {
  totals.units += 1;
  const unitRows = unit.displayReferences.flatMap((reference) => documentFor(reference).rows
    .filter((row) => row.peshitta?.type === 'text')
    .map((row) => ({ reference, row })));
  const byId = new Map(unitRows.map((item) => [`${item.reference}#${item.row.id}`, item.row.peshitta]));
  const seenRows = new Set();
  const seenEnglish = [];
  for (const group of unit.groups) {
    totals.groups += 1;
    if (group.syriacRowIds.length === 0 || group.rowAllocations?.length !== group.syriacRowIds.length) failures.push({ unitId: unit.unitId, groupId: group.groupId, issue: 'ROW_ALLOCATION_COUNT' });
    for (const allocation of group.rowAllocations ?? []) {
      const key = allocation.rowKey;
      const cell = byId.get(key);
      seenRows.add(key);
      seenEnglish.push(...allocation.englishIndices);
      totals.syriacRows += 1;
      totals.englishWords += allocation.englishIndices.length;
      if (!cell) failures.push({ unitId: unit.unitId, groupId: group.groupId, rowKey: key, issue: 'MISSING_SYRIAC_ROW' });
      else if (cell.gloss?.source !== 'Murdock') failures.push({ unitId: unit.unitId, groupId: group.groupId, rowKey: key, issue: 'WRONG_GLOSS_SOURCE' });
      else if (cell.gloss.gloss !== allocation.english) failures.push({ unitId: unit.unitId, groupId: group.groupId, rowKey: key, issue: 'ROW_GLOSS_MISMATCH' });
      else if (cell.gloss.spanId || cell.gloss.spanRole) failures.push({ unitId: unit.unitId, groupId: group.groupId, rowKey: key, issue: 'FORBIDDEN_SPAN_METADATA' });
      else if (cell.provenance?.englishAlignment?.groupId !== group.groupId || cell.provenance?.englishAlignment?.adjudicationSha256 !== ledger.adjudicationSha256 || JSON.stringify(cell.provenance?.englishAlignment?.englishIndices) !== JSON.stringify(allocation.englishIndices)) failures.push({ unitId: unit.unitId, groupId: group.groupId, rowKey: key, issue: 'PROVENANCE_MISMATCH' });
      if (ARROW_RE.test(cell.gloss?.gloss ?? '') || ARROW_RE.test(cell.gloss?.tooltip ?? '')) totals.arrowGlyphs += 1;
      if (cell.gloss?.spanId) totals.mergedCells += 1;
      if (cell.gloss?.spanRole === 'continuation') totals.continuationCells += 1;
      if (allocation.english) totals.populatedEnglishCells += 1;
      else totals.blankEnglishCells += 1;
    }
  }
  const expectedEnglish = Array.from({ length: unit.englishWords }, (_, index) => index);
  if (seenRows.size !== unitRows.length) failures.push({ unitId: unit.unitId, issue: 'SYRIAC_ROW_ACCOUNTING', expected: unitRows.length, actual: seenRows.size });
  if (seenEnglish.length !== expectedEnglish.length || seenEnglish.some((index, position) => index !== expectedEnglish[position])) failures.push({ unitId: unit.unitId, issue: 'ENGLISH_WORD_ACCOUNTING' });
}

if (totals.populatedEnglishCells + totals.blankEnglishCells !== totals.syriacRows || totals.mergedCells !== 0 || totals.continuationCells !== 0 || totals.arrowGlyphs !== 0) {
  failures.push({ issue: 'DISPLAY_CELL_ACCOUNTING', populatedEnglishCells: totals.populatedEnglishCells, blankEnglishCells: totals.blankEnglishCells, mergedCells: totals.mergedCells, continuationCells: totals.continuationCells, arrowGlyphs: totals.arrowGlyphs, syriacRows: totals.syriacRows });
}
totals.failures = failures.length;
const passed = failures.length === 0
  && totals.units === ledger.totals.units
  && totals.groups === ledger.totals.groups
  && totals.syriacRows === ledger.totals.syriacRows
  && totals.englishWords === ledger.totals.englishWords;
console.log(JSON.stringify({ status: passed ? 'CERTIFIED' : 'FAILED', adjudicationSha256: ledger.adjudicationSha256, totals, failures: failures.slice(0, 20) }, null, 2));
if (!passed) process.exitCode = 1;
