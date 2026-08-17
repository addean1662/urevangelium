import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');
const BOOKS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const BOOK_KEYS = { matthew: 'B01', mark: 'B02', luke: 'B03', john: 'B04' };
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

const ns = { ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιηυ: 'ιησου', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω', πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ' };
function greek(text) { const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου').replace(/[^α-ω]/g, ''); return ns[value] ?? value; }
function siglumNumber(siglum) { return siglum === 'P64+P67' ? [10064, 10067] : [10000 + Number(siglum.match(/\d+/)?.[0])]; }

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const sourceDir = path.join(ROOT, 'data/sources/earliest-papyrus');
const sources = {};
for (const file of fs.readdirSync(sourceDir).filter((name) => /^P\d+\.txt$/.test(name))) {
  const siglum = file === 'P64.txt' ? 'P64+P67' : file.slice(0, -4);
  sources[siglum] = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  for (const line of fs.readFileSync(path.join(sourceDir, file), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const prefix = line.match(/^(\d{2})(\d{3})(\d{3})\s/); if (!prefix || !BOOKS[Number(prefix[1])]) continue;
    const gospel = BOOKS[Number(prefix[1])], reference = `${Number(prefix[2])}:${Number(prefix[3])}`;
    if (line.includes('[stub')) sources[siglum][gospel].set(reference, { source: 'coverage-stub', words: [] });
    else { const parsed = parseMesLine(line); sources[siglum][gospel].set(reference, { source: 'CNTR', words: parsed.baseWords.filter((word) => word.presence !== 'absent').map((word) => ({ diplomatic: word.diplomatic, form: comparisonForm(word), conditioned: word.conditions.length > 0 || Boolean(word.supplied) })) }); }
  }
}

const intfCache = new Map();
function intfWords(siglum, gospel, chapter, verse) {
  const key = `${BOOK_KEYS[gospel]}K${Number(chapter)}V${Number(verse)}`;
  for (const ga of siglumNumber(siglum)) {
    const cacheKey = `${ga}-${gospel}`, file = path.join(ROOT, 'data/cache/intf', `${cacheKey}.json`);
    if (!intfCache.has(cacheKey)) intfCache.set(cacheKey, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
    const words = intfCache.get(cacheKey)?.[key];
    if (words?.length) return words.map((word) => ({ diplomatic: word, form: greek(word), conditioned: false }));
  }
  return [];
}

const totals = { verseWitnessPairs: 0, transcribedPairs: 0, stubOnlyPairs: 0, noWordSourcePairs: 0, missingAgreeingBadges: 0, unrecordedDisagreements: 0, unplacedSourceWords: 0, conditionedWordsHeldForReview: 0 };
const findings = [];

for (const gospel of GOSPELS) {
  const dir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(dir).filter((name) => /^\d+$/.test(name))) for (const file of fs.readdirSync(path.join(dir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
    const verse = Number(file.slice(0, -5)), reference = `${chapter}:${verse}`;
    const expected = index.byVerse?.[gospel]?.[String(chapter)]?.[String(verse)] ?? [];
    if (!expected.length) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, chapter, file), 'utf8'));
    const composite = data.rows.filter((row) => row.papyrus?.type === 'extant').map((row) => ({ rowId: row.id, text: row.papyrus.text, form: greek(row.papyrus.text), sigla: row.papyrus.fragments?.map((fragment) => fragment.id) ?? [] }));

    for (const siglum of expected) {
      totals.verseWitnessPairs++;
      const local = sources[siglum]?.[gospel].get(reference);
      let words = local?.source === 'CNTR' ? local.words : [];
      let authority = local?.source === 'CNTR' ? 'CNTR' : null;
      if (!words.length) { words = intfWords(siglum, gospel, chapter, verse); if (words.length) authority = 'INTF-cache'; }
      if (!words.length) {
        if (local?.source === 'coverage-stub') totals.stubOnlyPairs++; else totals.noWordSourcePairs++;
        findings.push({ gospel, reference, siglum, classification: local?.source === 'coverage-stub' ? 'coverage-stub-no-word-evidence' : 'no-word-level-source', decision: 'Do not infer word badges from verse coverage.' });
        continue;
      }
      totals.transcribedPairs++;
      const operations = alignSequences(words.map((word) => word.form), composite.map((item) => item.form));
      for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
        const operation = operations[operationIndex];
        if (operation.sourceIndex !== null && operation.displayIndex !== null) {
          const word = words[operation.sourceIndex], row = composite[operation.displayIndex];
          if (word.conditioned) { totals.conditionedWordsHeldForReview++; findings.push({ gospel, reference, siglum, rowId: row.rowId, classification: 'conditioned-source-word', diplomatic: word.diplomatic, authority, decision: 'Retain for review; do not automatically certify full-word survival.' }); continue; }
          if (word.form === row.form) {
            if (!row.sigla.includes(siglum)) { totals.missingAgreeingBadges++; findings.push({ gospel, reference, siglum, rowId: row.rowId, classification: 'missing-agreeing-badge', diplomatic: word.diplomatic, displayed: row.text, authority, decision: 'Add the siglum to the agreeing compact reading.' }); }
          } else if (!row.sigla.includes(siglum)) {
            totals.unrecordedDisagreements++;
            findings.push({ gospel, reference, siglum, rowId: row.rowId, classification: 'unrecorded-disagreement', diplomatic: word.diplomatic, displayed: row.text, authority, alignment: operation.type, similarity: operation.similarity, decision: 'Preserve as dissenting provenance; do not attach its siglum to the displayed reading.' });
          }
        } else if (operation.sourceIndex !== null) {
          const word = words[operation.sourceIndex];
          const prior = operations.slice(0, operationIndex).reverse().find((item) => item.displayIndex !== null);
          const next = operations.slice(operationIndex + 1).find((item) => item.displayIndex !== null);
          if (word.conditioned) { totals.conditionedWordsHeldForReview++; findings.push({ gospel, reference, siglum, classification: 'conditioned-source-word', sourceWord: operation.sourceIndex + 1, diplomatic: word.diplomatic, authority, insertAfterRowId: prior ? composite[prior.displayIndex].rowId : null, insertBeforeRowId: next ? composite[next.displayIndex].rowId : null, decision: 'Retain for review; do not automatically certify full-word survival or create a row.' }); continue; }
          totals.unplacedSourceWords++;
          findings.push({ gospel, reference, siglum, classification: 'unplaced-source-word', sourceWord: operation.sourceIndex + 1, diplomatic: word.diplomatic, authority, insertAfterRowId: prior ? composite[prior.displayIndex].rowId : null, insertBeforeRowId: next ? composite[next.displayIndex].rowId : null, decision: 'Create or identify a papyrus alignment row without borrowing another witness as authority.' });
        }
      }
    }
  }
}

const report = { status: 'read-only-papyrus-completeness-audit', generatedAt: new Date().toISOString(), method: 'Each verse-covering papyrus aligned directly to the extant papyrus composite by deterministic contiguous forward scan. No Vaticanus anchor.', totals, findings };
const outDir = path.join(ROOT, 'docs/audits'); fs.writeFileSync(path.join(outDir, 'papyrus-completeness-audit.json'), JSON.stringify(report, null, 2) + '\n');
const t = totals;
const markdown = ['# Earliest Papyri Completeness Audit', '', `Generated: ${report.generatedAt}`, '', '**Read-only. No Gospel data was modified.**', '', report.method, '', `- Verse/witness coverage pairs: ${t.verseWitnessPairs}`, `- Pairs with CNTR or cached INTF word evidence: ${t.transcribedPairs}`, `- Coverage-stub-only pairs: ${t.stubOnlyPairs}`, `- Pairs without word-level evidence: ${t.noWordSourcePairs}`, `- Missing agreeing badges: ${t.missingAgreeingBadges}`, `- Unrecorded dissenting readings: ${t.unrecordedDisagreements}`, `- Source words requiring new or identified rows: ${t.unplacedSourceWords}`, `- Conditioned or supplied words held for review: ${t.conditionedWordsHeldForReview}`, ''];
fs.writeFileSync(path.join(outDir, 'papyrus-completeness-audit.md'), markdown.join('\n'));
console.log(JSON.stringify(totals, null, 2));
