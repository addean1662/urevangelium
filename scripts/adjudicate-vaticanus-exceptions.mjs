import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences, similarity } = await load('lib/alignment/sequenceAlign.js');

const GOSPELS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const REVISION = '4c0e9f94117ec3dc4ae40094aec044bb7a416a53';

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

function classifyGap(sourceForms, displayForms) {
  const sourceJoined = sourceForms.join('');
  const displayJoined = displayForms.join('');
  if (sourceForms.length && displayForms.length) {
    if (sourceJoined === displayJoined) return 'word-division';
    if (Math.min(sourceJoined.length, displayJoined.length) >= 4 && similarity(sourceJoined, displayJoined) >= 0.8) return 'word-division-orthographic';
    return 'substitution';
  }
  return sourceForms.length ? 'ga03-addition-relative-to-proxy' : 'ga03-omission-relative-to-proxy';
}

const parsed = [];
for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/03.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const record = parseMesLine(line);
  if (GOSPELS[record.reference.book]) parsed.push(record);
}

const ledger = {
  status: 'transcription-derived-decision-ledger', generatedAt: new Date().toISOString(),
  source: { witness: 'GA 03', revision: REVISION },
  rule: 'GA 03 base-hand transcription governs. Proxy text is used only to locate rows and never to supply a Vaticanus reading.',
  totals: { verses: 0, matched: 0, ambiguousMappings: 0, wordDivision: 0, wordDivisionOrthographic: 0, additions: 0, omissions: 0, substitutions: 0, explicitAbsenceVerses: 0 },
  decisions: [],
};

for (const record of parsed) {
  const gospel = GOSPELS[record.reference.book];
  const versePath = path.join(ROOT, 'data', gospel, String(record.reference.chapter), `${record.reference.verse}.json`);
  if (!fs.existsSync(versePath)) {
    if (record.baseWords.every((word) => word.presence === 'absent')) {
      ledger.totals.explicitAbsenceVerses++;
      ledger.decisions.push({ reference: `${gospel} ${record.reference.chapter}:${record.reference.verse}`, sourceReference: record.reference.code, classification: 'explicit-absence', sourceRaw: record.raw, decision: 'Preserve as a GA 03 lacuna; do not supply text.' });
      continue;
    }
    throw new Error(`GA 03 has text but no local verse: ${gospel} ${record.reference.chapter}:${record.reference.verse}`);
  }

  const live = JSON.parse(fs.readFileSync(versePath, 'utf8'));
  const sourceWords = record.baseWords.filter((word) => word.presence !== 'absent');
  const display = live.rows.flatMap((row) => row.vaticanus?.type === 'text' ? [{ rowId: row.id, text: row.vaticanus.text }] : []);
  const sourceForms = sourceWords.map(comparisonForm);
  const displayForms = display.map((entry) => norm(entry.text));
  const operations = alignSequences(sourceForms, displayForms);
  ledger.totals.verses++;

  for (let index = 0; index < operations.length;) {
    const operation = operations[index];
    if (operation.sourceIndex !== null && operation.displayIndex !== null) {
      ledger.totals.matched++;
      if (operation.type === 'ambiguous') {
        ledger.totals.ambiguousMappings++;
        const word = sourceWords[operation.sourceIndex];
        const current = display[operation.displayIndex];
        ledger.decisions.push({ reference: `${gospel} ${record.reference.chapter}:${record.reference.verse}`, sourceReference: record.reference.code, classification: 'ambiguous-mapping', source: [{ word: operation.sourceIndex + 1, diplomatic: word.diplomatic }], proxy: [{ rowId: current.rowId, text: current.text }], similarity: operation.similarity, decision: 'Use the GA 03 diplomatic reading; retain the mapping confidence in provenance.' });
      }
      index++;
      continue;
    }

    const group = [];
    while (index < operations.length && (operations[index].sourceIndex === null || operations[index].displayIndex === null)) group.push(operations[index++]);
    const sourceItems = group.filter((item) => item.sourceIndex !== null).map((item) => ({ word: item.sourceIndex + 1, diplomatic: sourceWords[item.sourceIndex].diplomatic, form: sourceForms[item.sourceIndex] }));
    const displayItems = group.filter((item) => item.displayIndex !== null).map((item) => ({ rowId: display[item.displayIndex].rowId, text: display[item.displayIndex].text, form: displayForms[item.displayIndex] }));
    const classification = classifyGap(sourceItems.map((item) => item.form), displayItems.map((item) => item.form));
    const totalKey = { 'word-division': 'wordDivision', 'word-division-orthographic': 'wordDivisionOrthographic', substitution: 'substitutions', 'ga03-addition-relative-to-proxy': 'additions', 'ga03-omission-relative-to-proxy': 'omissions' }[classification];
    ledger.totals[totalKey]++;
    ledger.decisions.push({ reference: `${gospel} ${record.reference.chapter}:${record.reference.verse}`, sourceReference: record.reference.code, classification, source: sourceItems.map((item) => ({ word: item.word, diplomatic: item.diplomatic })), proxy: displayItems.map((item) => ({ rowId: item.rowId, text: item.text })), decision: classification.startsWith('word-division') ? 'Preserve GA 03 word division and align it without borrowing proxy spelling.' : classification === 'ga03-addition-relative-to-proxy' ? 'Insert the GA 03 word in a Vaticanus-only row.' : classification === 'ga03-omission-relative-to-proxy' ? 'Leave the Vaticanus cell empty; do not retain proxy text.' : 'Replace the proxy sequence with the GA 03 sequence.' });
  }
}

const outDir = path.join(ROOT, 'docs/audits/vaticanus-gospels');
fs.writeFileSync(path.join(outDir, 'decision-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
const t = ledger.totals;
const markdown = ['# Vaticanus Four-Gospel Decision Ledger', '', `Generated: ${ledger.generatedAt}`, '', '**Status: transcription-derived; no live data modified.**', '', ledger.rule, '', '## Totals', '', `- Verses processed: ${t.verses}`, `- Matched word mappings: ${t.matched}`, `- Ambiguous mappings: ${t.ambiguousMappings}`, `- Exact word-division cases: ${t.wordDivision}`, `- Orthographic word-division cases: ${t.wordDivisionOrthographic}`, `- GA 03 additions relative to the proxy: ${t.additions}`, `- GA 03 omissions relative to the proxy: ${t.omissions}`, `- Substitution groups: ${t.substitutions}`, `- Explicit absence verses: ${t.explicitAbsenceVerses}`, '', 'Every decision retains the pinned source reference and applies the same governing rule: preserve GA 03 as transcribed; never reconstruct its column from the proxy.', ''];
fs.writeFileSync(path.join(outDir, 'decision-ledger.md'), markdown.join('\n'));
console.log(JSON.stringify(ledger.totals, null, 2));
