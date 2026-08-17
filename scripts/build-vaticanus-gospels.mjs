import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');

const SOURCE = {
  witness: 'GA 03',
  name: 'CNTR Class 1 transcription of Codex Vaticanus',
  revision: '4c0e9f94117ec3dc4ae40094aec044bb7a416a53',
  sha256: 'cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f',
  readingLayer: 'base',
};
const GOSPELS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const NON_VATICANUS = ['papyrus', 'coptic', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];

function norm(text) {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ωϛϟϗ\u2ce8\ue001¯�]/g, '').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου');
  const nomina = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
  };
  return nomina[normalized] ?? normalized;
}

function displayProjection(diplomatic) {
  const expanded = diplomatic.replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου');
  return expanded.endsWith('σ') ? `${expanded.slice(0, -1)}ς` : expanded;
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function otherColumns(rows) {
  return rows.map((row) => Object.fromEntries(NON_VATICANUS.map((column) => [column, row[column] ?? null])));
}

function liveVersePaths(gospel) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  return fs.readdirSync(gospelDir, { withFileTypes: true }).filter((item) => item.isDirectory() && /^\d+$/.test(item.name)).flatMap((chapter) =>
    fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => /^\d+\.json$/.test(name)).map((name) => ({
      chapter: Number(chapter.name), verse: Number(name.slice(0, -5)), file: path.join(gospelDir, chapter.name, name),
    })),
  );
}

const parsedByGospel = Object.fromEntries(Object.values(GOSPELS).map((gospel) => [gospel, new Map()]));
const parseErrors = [];
for (const rawLine of fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/03.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  try {
    const parsed = parseMesLine(rawLine);
    const gospel = GOSPELS[parsed.reference.book];
    if (gospel) parsedByGospel[gospel].set(`${parsed.reference.chapter}:${parsed.reference.verse}`, parsed);
  } catch (error) {
    parseErrors.push({ sourcePrefix: rawLine.slice(0, 80), error: error.message });
  }
}

const outputDir = path.join(ROOT, 'docs/audits/vaticanus-gospels');
fs.mkdirSync(outputDir, { recursive: true });
const master = {
  status: 'shadow-review-only', generatedAt: new Date().toISOString(), source: SOURCE,
  policy: 'docs/VATICANUS_EDITORIAL_POLICY.md', parseErrors, gospels: {},
};

for (const gospel of Object.values(GOSPELS)) {
  const totals = { liveVerses: 0, sourceVerses: parsedByGospel[gospel].size, sourceOnlyVerseRecords: 0, explicitAbsenceVerses: 0, alignedVerses: 0, coverageGaps: 0, sourceWords: 0, currentWords: 0, exact: 0, nominaSacra: 0, orthographic: 0, ambiguous: 0, sourceOnly: 0, sourceOnlyReusedRows: 0, sourceOnlyNewRows: 0, displayOnly: 0 };
  const invariantErrors = [];
  const exceptions = [];
  const verses = [];
  const paths = liveVersePaths(gospel).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  const liveReferences = new Set(paths.map((item) => `${item.chapter}:${item.verse}`));
  totals.liveVerses = paths.length;

  for (const location of paths) {
    const reference = `${location.chapter}:${location.verse}`;
    const live = JSON.parse(fs.readFileSync(location.file, 'utf8'));
    const parsed = parsedByGospel[gospel].get(reference);
    if (!parsed) {
      totals.coverageGaps++;
      verses.push({ reference: `${gospel} ${reference}`, status: 'no-GA03-source-line', proposedRows: live.rows });
      continue;
    }

    const sourceWords = parsed.baseWords.filter((word) => word.presence !== 'absent');
    const displayed = live.rows.flatMap((row, rowIndex) => row.vaticanus?.type === 'text' ? [{ rowIndex, rowId: row.id, text: row.vaticanus.text }] : []);
    const operations = alignSequences(sourceWords.map(comparisonForm), displayed.map((entry) => norm(entry.text)));
    const proposedRows = structuredClone(live.rows);
    const changes = [];
    let insertionOffset = 0;
    const reusableRows = new Map();

    // A source-only run is first offered the already shared rows between its
    // mapped neighbours.  This preserves the corpus architecture and avoids
    // inventing a witness-only row when Vaticanus merely had an empty cell.
    for (let start = 0; start < operations.length;) {
      if (operations[start].sourceIndex === null || operations[start].displayIndex !== null) { start++; continue; }
      let end = start;
      while (end + 1 < operations.length && operations[end + 1].sourceIndex !== null && operations[end + 1].displayIndex === null) end++;
      const prior = operations.slice(0, start).reverse().find((item) => item.displayIndex !== null);
      const next = operations.slice(end + 1).find((item) => item.displayIndex !== null);
      const lower = prior ? displayed[prior.displayIndex].rowIndex + 1 : 0;
      const upper = next ? displayed[next.displayIndex].rowIndex : live.rows.length;
      const candidates = [];
      for (let rowIndex = lower; rowIndex < upper; rowIndex++) {
        if (live.rows[rowIndex].vaticanus?.type !== 'text') candidates.push(rowIndex);
      }
      for (let offset = 0; offset <= end - start && offset < candidates.length; offset++) reusableRows.set(start + offset, candidates[offset]);
      start = end + 1;
    }

    for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
      const operation = operations[operationIndex];
      if (operation.sourceIndex !== null && operation.displayIndex !== null) {
        const word = sourceWords[operation.sourceIndex];
        const display = displayed[operation.displayIndex];
        const classification = word.abbreviation === 'nomina-sacra' ? 'nomina-sacrum' : operation.type;
        const proposedText = displayProjection(word.diplomatic);
        proposedRows[display.rowIndex + insertionOffset].vaticanus = { type: 'text', text: proposedText, provenance: { ...SOURCE, sourceReference: parsed.reference.code, diplomatic: word.diplomatic, normalization: proposedText === word.diplomatic ? [] : ['expand-special-glyphs', 'modern-final-sigma'], verification: 'source-transcription-verified' } };
        totals[classification === 'nomina-sacrum' ? 'nominaSacra' : classification]++;
        if (classification === 'ambiguous') changes.push({ classification, sourceWord: operation.sourceIndex + 1, sourceDiplomatic: word.diplomatic, currentRowId: display.rowId, currentText: display.text, proposedText, similarity: operation.similarity });
      } else if (operation.sourceIndex !== null) {
        const word = sourceWords[operation.sourceIndex];
        const reusableRowIndex = reusableRows.get(operationIndex);
        const proposedText = displayProjection(word.diplomatic);
        if (reusableRowIndex !== undefined) {
          const target = proposedRows[reusableRowIndex + insertionOffset];
          target.vaticanus = { type: 'text', text: proposedText, provenance: { ...SOURCE, sourceReference: parsed.reference.code, diplomatic: word.diplomatic, normalization: proposedText === word.diplomatic ? [] : ['expand-special-glyphs', 'modern-final-sigma'], verification: 'source-transcription-verified' } };
          totals.sourceOnly++;
          totals.sourceOnlyReusedRows++;
          changes.push({ classification: 'source-only-reused-shared-row', sourceWord: operation.sourceIndex + 1, sourceDiplomatic: word.diplomatic, targetRowId: target.id, proposedText });
          continue;
        }
        const prior = operations.slice(0, operationIndex).reverse().find((item) => item.displayIndex !== null);
        const insertAt = prior ? displayed[prior.displayIndex].rowIndex + 1 + insertionOffset : insertionOffset;
        proposedRows.splice(insertAt, 0, { id: `v03-${parsed.reference.code}-${operation.sourceIndex + 1}`, papyrus: { type: 'empty' }, coptic: { type: 'empty' }, vaticanus: { type: 'text', text: proposedText, provenance: { ...SOURCE, sourceReference: parsed.reference.code, diplomatic: word.diplomatic, normalization: proposedText === word.diplomatic ? [] : ['expand-special-glyphs', 'modern-final-sigma'], verification: 'source-transcription-verified' } }, sinaiticus: { type: 'empty' }, bezae: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' } });
        insertionOffset++;
        totals.sourceOnly++;
        totals.sourceOnlyNewRows++;
        changes.push({ classification: 'source-only', sourceWord: operation.sourceIndex + 1, sourceDiplomatic: word.diplomatic, insertAfterRowId: prior ? displayed[prior.displayIndex].rowId : null, proposedText });
      } else {
        const display = displayed[operation.displayIndex];
        proposedRows[display.rowIndex + insertionOffset].vaticanus = { type: 'empty' };
        totals.displayOnly++;
        changes.push({ classification: 'display-only', currentRowId: display.rowId, currentText: display.text, proposedText: null });
      }
    }

    const representedSource = operations.filter((item) => item.sourceIndex !== null).map((item) => item.sourceIndex);
    const representedDisplay = operations.filter((item) => item.displayIndex !== null).map((item) => item.displayIndex);
    if (representedSource.length !== sourceWords.length || representedSource.some((index, position) => index !== position)) invariantErrors.push(`${gospel} ${reference}: source coverage/order`);
    if (representedDisplay.length !== displayed.length || representedDisplay.some((index, position) => index !== position)) invariantErrors.push(`${gospel} ${reference}: display coverage/order`);
    const existing = proposedRows.filter((row) => !String(row.id).startsWith('v03-'));
    if (hash(otherColumns(live.rows)) !== hash(otherColumns(existing))) invariantErrors.push(`${gospel} ${reference}: non-Vaticanus mutation`);

    if (changes.length) exceptions.push({ reference: `${gospel} ${reference}`, changes });
    verses.push({ reference: `${gospel} ${reference}`, sourceReference: parsed.reference.code, sourceRaw: parsed.raw, sourceSegments: parsed.segments, baseWords: sourceWords, currentVaticanus: displayed, proposedRows });
    totals.alignedVerses++;
    totals.sourceWords += sourceWords.length;
    totals.currentWords += displayed.length;
  }

  const sourceOnlyVerses = [...parsedByGospel[gospel].entries()].filter(([reference]) => !liveReferences.has(reference)).map(([reference, parsed]) => ({
    reference: `${gospel} ${reference}`,
    sourceReference: parsed.reference.code,
    sourceRaw: parsed.raw,
    explicitAbsence: parsed.baseWords.every((word) => word.presence === 'absent'),
    sourceSegments: parsed.segments,
  }));
  totals.sourceOnlyVerseRecords = sourceOnlyVerses.length;
  totals.explicitAbsenceVerses = sourceOnlyVerses.filter((verse) => verse.explicitAbsence).length;

  const artifact = { status: 'shadow-not-for-display', generatedAt: master.generatedAt, source: SOURCE, gospel, totals, invariantErrors, exceptions, sourceOnlyVerses, verses };
  fs.writeFileSync(path.join(outputDir, `${gospel}.json`), JSON.stringify(artifact, null, 2) + '\n');
  master.gospels[gospel] = { totals, invariantErrors, artifact: `docs/audits/vaticanus-gospels/${gospel}.json` };
}

fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(master, null, 2) + '\n');
const markdown = ['# Complete Vaticanus Gospel Shadow Build', '', `Generated: ${master.generatedAt}`, '', '**Status: shadow only. No live Gospel data was modified.**', '', `Source: GA 03 at CNTR commit \`${SOURCE.revision}\`.`, '', '| Gospel | Live verses | GA 03 records | Aligned | Coverage gaps | Source-only records | Explicit absence | GA 03 words | Exact | Nomina sacra | Orthographic | Ambiguous | Source-only | Display-only | Invariants |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|'];
for (const [gospel, entry] of Object.entries(master.gospels)) {
  const t = entry.totals;
  markdown.push(`| ${gospel} | ${t.liveVerses} | ${t.sourceVerses} | ${t.alignedVerses} | ${t.coverageGaps} | ${t.sourceOnlyVerseRecords} | ${t.explicitAbsenceVerses} | ${t.sourceWords} | ${t.exact} | ${t.nominaSacra} | ${t.orthographic} | ${t.ambiguous} | ${t.sourceOnly} (${t.sourceOnlyReusedRows} reused / ${t.sourceOnlyNewRows} new) | ${t.displayOnly} | ${entry.invariantErrors.length ? 'FAIL' : 'PASS'} |`);
}
markdown.push('', `MES parse errors: ${parseErrors.length}.`, '', 'Coverage gaps mean no GA 03 source line was present; the shadow retains the existing rows but does not certify their Vaticanus content.', '');
fs.writeFileSync(path.join(outputDir, 'summary.md'), markdown.join('\n'));
console.log(JSON.stringify(master.gospels, null, 2));
if (parseErrors.length || Object.values(master.gospels).some((entry) => entry.invariantErrors.length)) process.exitCode = 1;
