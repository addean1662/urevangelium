import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function loadEsmSource(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { comparisonForm } = await loadEsmSource('lib/sources/cntrMes.js');
const { alignSequences } = await loadEsmSource('lib/alignment/sequenceAlign.js');

const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vaticanus-shadow-matthew-1.json'), 'utf8'));
const REVISION = shadow.source.revision;
const NON_VATICANUS = ['papyrus', 'coptic', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];

function norm(text) {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ωϛϟϗ\u2ce8\ue001¯�]/g, '').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου');
  const nominaSacra = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
  };
  return nominaSacra[normalized] ?? normalized;
}

function displayProjection(diplomatic) {
  const expanded = diplomatic.replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου');
  return expanded.endsWith('σ') ? `${expanded.slice(0, -1)}ς` : expanded;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function nonVaticanusProjection(rows) {
  return rows.map((row) => Object.fromEntries(NON_VATICANUS.map((column) => [column, row[column] ?? null])));
}

const verseReports = [];
const totals = { verses: 0, sourceWords: 0, currentRows: 0, exact: 0, nominaSacra: 0, orthographic: 0, ambiguous: 0, sourceOnly: 0, displayOnly: 0 };
const invariantErrors = [];

for (const sourceVerse of shadow.verses) {
  const verseNumber = sourceVerse.reference.verse;
  const livePath = path.join(ROOT, 'data/matthew/1', `${verseNumber}.json`);
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const displayEntries = live.rows.flatMap((row, rowIndex) => row.vaticanus?.type === 'text' ? [{ rowIndex, rowId: row.id, text: row.vaticanus.text }] : []);
  const sourceWords = sourceVerse.baseWords;
  const operations = alignSequences(sourceWords.map((word) => comparisonForm(word)), displayEntries.map((entry) => norm(entry.text)));
  const proposedRows = structuredClone(live.rows);
  const changes = [];
  let insertionOffset = 0;

  for (const operation of operations) {
    if (operation.sourceIndex !== null && operation.displayIndex !== null) {
      const sourceWord = sourceWords[operation.sourceIndex];
      const display = displayEntries[operation.displayIndex];
      const classification = sourceWord.abbreviation === 'nomina-sacra' ? 'nomina-sacrum' : operation.type;
      const proposedText = displayProjection(sourceWord.diplomatic);
      const targetIndex = display.rowIndex + insertionOffset;
      proposedRows[targetIndex].vaticanus = {
        type: 'text',
        text: proposedText,
        provenance: {
          witness: 'GA 03', source: shadow.source.name, sourceReference: sourceVerse.reference.code,
          revision: REVISION, readingLayer: 'base', diplomatic: sourceWord.diplomatic,
          normalization: proposedText === sourceWord.diplomatic ? [] : ['expand-special-glyphs', 'modern-final-sigma'],
          verification: 'machine-compared',
        },
      };
      changes.push({ classification, sourceWord: operation.sourceIndex + 1, sourceDiplomatic: sourceWord.diplomatic, currentRowId: display.rowId, currentText: display.text, proposedText, similarity: operation.similarity });
      if (classification === 'nomina-sacrum') totals.nominaSacra++; else totals[classification]++;
    } else if (operation.sourceIndex !== null) {
      const sourceWord = sourceWords[operation.sourceIndex];
      const previousDisplay = [...operations].slice(0, operations.indexOf(operation)).reverse().find((item) => item.displayIndex !== null);
      const insertAt = previousDisplay ? displayEntries[previousDisplay.displayIndex].rowIndex + 1 + insertionOffset : insertionOffset;
      const proposedText = displayProjection(sourceWord.diplomatic);
      proposedRows.splice(insertAt, 0, {
        id: `v03-${sourceVerse.reference.code}-${operation.sourceIndex + 1}`,
        papyrus: { type: 'empty' }, coptic: { type: 'empty' },
        vaticanus: { type: 'text', text: proposedText, provenance: { witness: 'GA 03', source: shadow.source.name, sourceReference: sourceVerse.reference.code, revision: REVISION, readingLayer: 'base', diplomatic: sourceWord.diplomatic, normalization: proposedText === sourceWord.diplomatic ? [] : ['expand-special-glyphs', 'modern-final-sigma'], verification: 'machine-compared' } },
        sinaiticus: { type: 'empty' }, bezae: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' },
      });
      insertionOffset++;
      changes.push({ classification: 'source-only', sourceWord: operation.sourceIndex + 1, sourceDiplomatic: sourceWord.diplomatic, insertAfterRowId: previousDisplay ? displayEntries[previousDisplay.displayIndex].rowId : null, proposedText });
      totals.sourceOnly++;
    } else {
      const display = displayEntries[operation.displayIndex];
      proposedRows[display.rowIndex + insertionOffset].vaticanus = { type: 'empty' };
      changes.push({ classification: 'display-only', currentRowId: display.rowId, currentText: display.text, proposedText: null });
      totals.displayOnly++;
    }
  }

  const representedSource = operations.filter((operation) => operation.sourceIndex !== null).map((operation) => operation.sourceIndex);
  if (representedSource.length !== sourceWords.length || representedSource.some((index, position) => index !== position)) invariantErrors.push(`Matthew 1:${verseNumber}: source order/coverage failure`);
  const representedDisplay = operations.filter((operation) => operation.displayIndex !== null).map((operation) => operation.displayIndex);
  if (representedDisplay.length !== displayEntries.length || representedDisplay.some((index, position) => index !== position)) invariantErrors.push(`Matthew 1:${verseNumber}: display order/coverage failure`);

  // Existing rows must retain every non-Vaticanus value. Inserted rows are excluded.
  const proposedExisting = proposedRows.filter((row) => !String(row.id).startsWith('v03-'));
  if (stableHash(nonVaticanusProjection(live.rows)) !== stableHash(nonVaticanusProjection(proposedExisting))) invariantErrors.push(`Matthew 1:${verseNumber}: non-Vaticanus mutation`);

  verseReports.push({
    reference: `Matthew 1:${verseNumber}`,
    sourceReference: sourceVerse.reference.code,
    sourceWordCount: sourceWords.length,
    currentVaticanusWordCount: displayEntries.length,
    proposedRowCount: proposedRows.length,
    changes,
    reviewRequired: changes.some((change) => ['ambiguous', 'source-only', 'display-only'].includes(change.classification)),
    proposedRows,
  });
  totals.verses++;
  totals.sourceWords += sourceWords.length;
  totals.currentRows += live.rows.length;
}

const report = {
  status: 'shadow-review-only',
  generatedAt: new Date().toISOString(),
  witness: shadow.source,
  policy: 'docs/VATICANUS_EDITORIAL_POLICY.md',
  algorithm: 'Deterministic global alignment; exact and >=80% spelling similarity matched; unrelated words resolved as ordered gaps.',
  totals,
  invariants: { sourceWordsRepresentedExactlyOnce: !invariantErrors.some((error) => error.includes('source')), sourceOrderPreserved: !invariantErrors.some((error) => error.includes('source')), currentDisplayOrderPreserved: !invariantErrors.some((error) => error.includes('display')), nonVaticanusColumnsUnchanged: !invariantErrors.some((error) => error.includes('non-Vaticanus')), errors: invariantErrors },
  verses: verseReports,
};

const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'vaticanus-matthew1-review.json'), JSON.stringify(report, null, 2) + '\n');

const markdown = [
  '# Vaticanus Matthew 1 Alignment Review', '',
  `Generated: ${report.generatedAt}`, '',
  '**Status: shadow review only. This report does not modify the live Gospel data.**', '',
  `Source: GA 03, CNTR commit \`${REVISION}\`.`, '',
  '## Classification totals', '',
  `- Exact word matches: ${totals.exact}`,
  `- Exact nomina-sacra matches: ${totals.nominaSacra}`,
  `- Orthographic matches: ${totals.orthographic}`,
  `- Ambiguous spelling matches: ${totals.ambiguous}`,
  `- GA 03 source-only words requiring rows: ${totals.sourceOnly}`,
  `- Current proxy-only words absent from GA 03: ${totals.displayOnly}`, '',
  '## Preservation invariants', '',
  ...Object.entries(report.invariants).filter(([key]) => key !== 'errors').map(([key, value]) => `- ${key}: ${value ? 'PASS' : 'FAIL'}`),
  `- Errors: ${invariantErrors.length}`, '',
  '## Changes requiring review', '',
];

for (const verse of verseReports.filter((item) => item.reviewRequired)) {
  markdown.push(`### ${verse.reference}`, '', '| Classification | GA 03 | Current row/text | Proposed |', '|---|---|---|---|');
  for (const change of verse.changes.filter((item) => ['ambiguous', 'source-only', 'display-only'].includes(item.classification))) {
    markdown.push(`| ${change.classification} | ${change.sourceDiplomatic ?? '—'} | ${change.currentRowId ?? change.insertAfterRowId ?? 'start'} · ${change.currentText ?? '—'} | ${change.proposedText ?? 'empty'} |`);
  }
  markdown.push('');
}

fs.writeFileSync(path.join(outDir, 'vaticanus-matthew1-review.md'), markdown.join('\n'));
console.log(JSON.stringify({ totals, invariants: report.invariants }, null, 2));
if (invariantErrors.length) process.exitCode = 1;
