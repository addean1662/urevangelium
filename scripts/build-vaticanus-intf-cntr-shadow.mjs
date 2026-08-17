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

const GOSPELS = {
  matthew: { book: 40, intfBook: 'B01' }, mark: { book: 41, intfBook: 'B02' },
  luke: { book: 42, intfBook: 'B03' }, john: { book: 43, intfBook: 'B04' },
};
const CNTR_SHA256 = 'cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f';
const CNTR_REVISION = '4c0e9f94117ec3dc4ae40094aec044bb7a416a53';
const OTHER_COLUMNS = ['papyrus', 'coptic', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function decode(text) { return text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'"); }
function plain(xml) { return decode(xml.replace(/<lb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<cb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<gap\b[^>]*\/>/g, '�').replace(/<[^>]+>/g, '').replace(/\s+/g, '')); }
function norm(text) {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω�]/g, '');
  const nomina = { ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω', πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι' };
  return nomina[value] ?? value;
}
function originalHand(body) {
  return body.replace(/<app\b[^>]*>([\s\S]*?)<\/app>/g, (_all, app) => app.match(/<rdg\b(?=[^>]*type="orig")(?=[^>]*hand="firsthand")[^>]*>([\s\S]*?)<\/rdg>/)?.[1] ?? '');
}
function parseIntf(file, expectedBook) {
  const verses = new Map();
  const xml = fs.readFileSync(file, 'utf8');
  for (const match of xml.matchAll(/<ab\b[^>]*\bn="B0(\d)K(\d+)V(\d+)"[^>]*(?<!\/)>([\s\S]*?)<\/ab>/g)) {
    const [, bookDigit, chapter, verse, body] = match;
    if (`B0${bookDigit}` !== expectedBook) continue;
    const selected = originalHand(body);
    const words = [...selected.matchAll(/<w\b[^>]*>([\s\S]*?)<\/w>/g)].map((match, index) => ({
      index, diplomatic: plain(match[1]), rawXml: match[0], unclear: /<unclear\b/.test(match[1]), gap: /<gap\b/.test(match[1]),
    })).filter((word) => word.diplomatic);
    verses.set(`${Number(chapter)}:${Number(verse)}`, words);
  }
  return verses;
}
function pathsFor(gospel) {
  const base = path.join(ROOT, 'data', gospel);
  return fs.readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name)).flatMap((chapter) =>
    fs.readdirSync(path.join(base, chapter.name)).filter((name) => /^\d+\.json$/.test(name)).map((name) => ({ chapter: Number(chapter.name), verse: Number(name.slice(0, -5)), file: path.join(base, chapter.name, name) })),
  ).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
}
function otherProjection(rows) { return rows.map((row) => Object.fromEntries(OTHER_COLUMNS.map((column) => [column, row[column] ?? null]))); }
function provenance(gospel, reference, word, intfSha, corroboration) {
  return { witness: 'GA 03', source: 'INTF NTVMR transcription', documentId: 20003, readingLayer: 'original-hand', sourceReference: `${gospel} ${reference}`, diplomatic: word.diplomatic, intfSha256: intfSha, cntrRevision: CNTR_REVISION, corroboration, condition: word.unclear || word.gap ? 'damaged-readable' : undefined };
}

const cntrFile = path.join(ROOT, 'data/sources/vaticanus/03.txt');
if (sha256(cntrFile) !== CNTR_SHA256) throw new Error('Pinned CNTR checksum mismatch');
const cntr = Object.fromEntries(Object.keys(GOSPELS).map((gospel) => [gospel, new Map()]));
for (const line of fs.readFileSync(cntrFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const record = parseMesLine(line);
  const gospel = Object.entries(GOSPELS).find(([, config]) => config.book === record.reference.book)?.[0];
  if (gospel) cntr[gospel].set(`${record.reference.chapter}:${record.reference.verse}`, { words: record.baseWords.filter((word) => word.presence !== 'absent'), explicitAbsence: record.baseWords.length > 0 && record.baseWords.every((word) => word.presence === 'absent') });
}

const outputDir = path.join(ROOT, 'docs/audits/vaticanus-intf-cntr-shadow');
fs.mkdirSync(outputDir, { recursive: true });
const summary = { status: 'shadow-only', generatedAt: new Date().toISOString(), governance: 'INTF original hand governs; CNTR corroborates', gospels: {}, invariantErrors: [] };

for (const [gospel, config] of Object.entries(GOSPELS)) {
  const intfFile = path.join(ROOT, `data/sources/vaticanus/intf/${gospel}.xml`);
  const intfSha = sha256(intfFile);
  const intf = parseIntf(intfFile, config.intfBook);
  const totals = { verses: 0, intfTextVerses: 0, explicitAbsenceVerses: 0, physicalLacunaVerses: 0, intfWords: 0, exactCorroborated: 0, normalizedCorroborated: 0, cntrDisagreement: 0, conditioned: 0, existingRowsUsed: 0, clearedProxyCells: 0, sharedEmptyRowsReused: 0, newRowsProposed: 0 };
  const verses = [];
  const livePaths = pathsFor(gospel);
  const liveReferences = new Set(livePaths.map((location) => `${location.chapter}:${location.verse}`));
  const sourceOnlyReferences = [...intf.keys()].filter((reference) => !liveReferences.has(reference));
  for (const location of livePaths) {
    totals.verses++;
    const reference = `${location.chapter}:${location.verse}`;
    const live = JSON.parse(fs.readFileSync(location.file, 'utf8'));
    const sourceWords = intf.get(reference);
    const cntrRecord = cntr[gospel].get(reference);
    const proposedRows = structuredClone(live.rows);
    const current = live.rows.flatMap((row, rowIndex) => row.vaticanus?.type === 'text' ? [{ rowIndex, rowId: row.id, text: row.vaticanus.text }] : []);
    if (!sourceWords) {
      const explicitAbsence = Boolean(cntrRecord?.explicitAbsence);
      if (explicitAbsence) totals.explicitAbsenceVerses++; else totals.physicalLacunaVerses++;
      for (const row of proposedRows) row.vaticanus = explicitAbsence ? { type: 'omitted' } : { type: 'lacuna' };
      totals.clearedProxyCells += current.length;
      verses.push({ reference, status: explicitAbsence ? 'explicit-absence' : 'physical-lacuna-intf-governs', currentWords: current.length, proposedRows });
      continue;
    }
    totals.intfTextVerses++;
    totals.intfWords += sourceWords.length;
    const corroboration = new Map();
    if (cntrRecord) {
      for (const op of alignSequences(cntrRecord.words.map(comparisonForm), sourceWords.map((word) => norm(word.diplomatic)))) {
        if (op.displayIndex === null) continue;
        if (op.sourceIndex === null) corroboration.set(op.displayIndex, 'intf-only-governing');
        else {
          const left = cntrRecord.words[op.sourceIndex]; const right = sourceWords[op.displayIndex];
          corroboration.set(op.displayIndex, comparisonForm(left) === norm(right.diplomatic) ? (plain(left.diplomatic) === right.diplomatic ? 'exact' : 'normalized') : 'intf-governing-cntr-disagrees');
        }
      }
    }
    const operations = alignSequences(sourceWords.map((word) => norm(word.diplomatic)), current.map((word) => norm(word.text)));
    const mappedRows = new Map();
    const availableRows = new Set(live.rows.map((_row, index) => index));
    for (const op of operations) {
      if (op.sourceIndex !== null && op.displayIndex !== null) { mappedRows.set(op.sourceIndex, current[op.displayIndex].rowIndex); availableRows.delete(current[op.displayIndex].rowIndex); }
      else if (op.displayIndex !== null) { proposedRows[current[op.displayIndex].rowIndex].vaticanus = { type: 'omitted' }; totals.clearedProxyCells++; }
    }
    for (let sourceIndex = 0; sourceIndex < sourceWords.length; sourceIndex++) {
      const word = sourceWords[sourceIndex];
      let rowIndex = mappedRows.get(sourceIndex);
      if (rowIndex === undefined) {
        const prior = [...mappedRows.entries()].filter(([index]) => index < sourceIndex).at(-1)?.[1] ?? -1;
        const next = [...mappedRows.entries()].find(([index]) => index > sourceIndex)?.[1] ?? live.rows.length;
        rowIndex = [...availableRows].find((index) => index > prior && index < next);
        if (rowIndex !== undefined) { availableRows.delete(rowIndex); totals.sharedEmptyRowsReused++; }
      }
      const status = corroboration.get(sourceIndex) ?? 'intf-governing-cntr-unavailable';
      if (status === 'exact') totals.exactCorroborated++; else if (status === 'normalized') totals.normalizedCorroborated++; else totals.cntrDisagreement++;
      if (word.unclear || word.gap) totals.conditioned++;
      const cell = { type: 'text', text: word.diplomatic, provenance: provenance(gospel, reference, word, intfSha, status) };
      if (rowIndex !== undefined) {
        const targetId = live.rows[rowIndex].id;
        const targetIndex = proposedRows.findIndex((row) => row.id === targetId);
        proposedRows[targetIndex].vaticanus = cell;
        totals.existingRowsUsed++;
      }
      else {
        const nextMapped = [...mappedRows.entries()].find(([index]) => index > sourceIndex)?.[1];
        const nextId = nextMapped === undefined ? null : live.rows[nextMapped].id;
        const insertAt = nextId ? proposedRows.findIndex((row) => row.id === nextId) : proposedRows.length;
        proposedRows.splice(insertAt, 0, { id: `v03-intf-${config.book}-${location.chapter}-${location.verse}-${sourceIndex + 1}`, ...Object.fromEntries(OTHER_COLUMNS.map((column) => [column, { type: 'empty' }])), vaticanus: cell });
        totals.newRowsProposed++;
      }
    }
    const originalRows = proposedRows.filter((row) => !String(row.id).startsWith('v03-intf-'));
    if (hash(otherProjection(live.rows)) !== hash(otherProjection(originalRows))) summary.invariantErrors.push(`${gospel} ${reference}: non-Vaticanus mutation`);
    const shadowWords = proposedRows.filter((row) => row.vaticanus?.type === 'text').map((row) => row.vaticanus.text);
    if (JSON.stringify(shadowWords) !== JSON.stringify(sourceWords.map((word) => word.diplomatic))) summary.invariantErrors.push(`${gospel} ${reference}: INTF word coverage/order`);
    if (new Set(proposedRows.map((row) => row.id)).size !== proposedRows.length) summary.invariantErrors.push(`${gospel} ${reference}: duplicate row id`);
    verses.push({ reference, status: 'intf-aligned', sourceWords: sourceWords.map((word) => word.diplomatic), proposedRows });
  }
  if (sourceOnlyReferences.length) summary.invariantErrors.push(`${gospel}: INTF references absent from live corpus: ${sourceOnlyReferences.join(', ')}`);
  const artifact = { status: 'shadow-only', gospel, sources: { intf: { documentId: 20003, sha256: intfSha, readingLayer: 'original-hand' }, cntr: { revision: CNTR_REVISION, sha256: CNTR_SHA256 } }, totals, sourceOnlyReferences, verses };
  fs.writeFileSync(path.join(outputDir, `${gospel}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  summary.gospels[gospel] = totals;
}
fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
const lines = ['# INTF–CNTR Vaticanus Row Shadow', '', '**Shadow only. Live corpus unchanged.**', '', '| Gospel | INTF words | Exact | Normalized | Held | Conditioned | Cleared proxy | Reused shared rows | New rows proposed | Lacuna verses | Explicit absence |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for (const [gospel, t] of Object.entries(summary.gospels)) lines.push(`| ${gospel} | ${t.intfWords} | ${t.exactCorroborated} | ${t.normalizedCorroborated} | ${t.cntrDisagreement} | ${t.conditioned} | ${t.clearedProxyCells} | ${t.sharedEmptyRowsReused} | ${t.newRowsProposed} | ${t.physicalLacunaVerses} | ${t.explicitAbsenceVerses} |`);
lines.push('', `Invariant errors: ${summary.invariantErrors.length}.`, '');
fs.writeFileSync(path.join(outputDir, 'summary.md'), lines.join('\n'));
console.log(JSON.stringify(summary, null, 2));
if (summary.invariantErrors.length) process.exitCode = 1;
