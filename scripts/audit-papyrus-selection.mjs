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
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

function greek(text) {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου').replace(/[^α-ω]/g, '');
  const nomina = {
    ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιηυ: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω', πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
    υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ',
  };
  return nomina[value] ?? value;
}
function dateKey(date) { const match = date.match(/\d{3,4}/); return match ? Number(match[0]) : 9999; }
function siglumKey(siglum) { const match = siglum.match(/\d+/); return match ? Number(match[0]) : 9999; }
function rank(a, b) { return dateKey(a.date) - dateKey(b.date) || siglumKey(a.siglum) - siglumKey(b.siglum); }

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const dates = Object.fromEntries(index.papyri.map((item) => [item.siglum, item.date]));
const sources = {};
const intfCache = new Map();
const sourceDir = path.join(ROOT, 'data/sources/earliest-papyrus');
for (const file of fs.readdirSync(sourceDir).filter((name) => /^P\d+\.txt$/.test(name))) {
  const fileText = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  const fileSiglum = file.slice(0, -4);
  const publicSiglum = fileSiglum === 'P64' ? 'P64+P67' : fileSiglum;
  const verses = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  for (const line of fileText.split(/\r?\n/).filter(Boolean)) {
    const prefix = line.match(/^(\d{2})(\d{3})(\d{3})\s/); if (!prefix || !BOOKS[Number(prefix[1])]) continue;
    const gospel = BOOKS[Number(prefix[1])], reference = `${Number(prefix[2])}:${Number(prefix[3])}`;
    if (line.includes('[stub')) verses[gospel].set(reference, { stub: true, words: [] });
    else { const parsed = parseMesLine(line); verses[gospel].set(reference, { stub: false, words: parsed.baseWords.filter((word) => word.presence !== 'absent') }); }
  }
  sources[publicSiglum] = verses;
}

function intfNumbers(siglum) {
  if (siglum === 'P64+P67') return [10064, 10067];
  const number = siglumKey(siglum);
  return Number.isFinite(number) && number < 9999 ? [10000 + number] : [];
}
function intfWords(siglum, gospel, chapter, verse) {
  const book = { matthew: 'B01', mark: 'B02', luke: 'B03', john: 'B04' }[gospel];
  const key = `${book}K${Number(chapter)}V${Number(verse)}`;
  for (const ga of intfNumbers(siglum)) {
    const cacheKey = `${ga}-${gospel}`;
    if (!intfCache.has(cacheKey)) {
      const file = path.join(ROOT, 'data/cache/intf', `${cacheKey}.json`);
      intfCache.set(cacheKey, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
    }
    const words = intfCache.get(cacheKey)?.[key];
    if (words?.length) return words;
  }
  return [];
}

const totals = { displayedCells: 0, selectedReadingMatches: 0, selectedReadingMismatches: 0, provisionalStubs: 0, unsupportedPlacements: 0, disagreementCells: 0, dissentingBadgesAttached: 0, noDisagreement: 0 };
const findings = [];

for (const gospel of GOSPELS) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name))) for (const file of fs.readdirSync(path.join(gospelDir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
    const verse = Number(file.slice(0, -5)), reference = `${chapter}:${verse}`;
    const data = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter, file), 'utf8'));
    const extantRows = data.rows.filter((row) => row.papyrus?.type === 'extant');
    if (!extantRows.length) continue;
    const cited = new Set(extantRows.flatMap((row) => row.papyrus.fragments?.map((fragment) => fragment.id) ?? []));
    const rowReadings = new Map(data.rows.map((row) => [row.id, []]));
    const stubs = new Set();

    for (const siglum of cited) {
      const source = sources[siglum]?.[gospel].get(reference);
      if (!source) continue;
      if (source.stub) { stubs.add(siglum); continue; }
      const displayedForSiglum = extantRows.filter((row) => row.papyrus.fragments?.some((fragment) => fragment.id === siglum));
      const sourceForms = source.words.map(comparisonForm);
      const displayForms = displayedForSiglum.map((row) => greek(row.papyrus.text));
      const operations = alignSequences(sourceForms, displayForms);
      for (const operation of operations) if (operation.sourceIndex !== null && operation.displayIndex !== null) {
        const word = source.words[operation.sourceIndex], row = displayedForSiglum[operation.displayIndex];
        rowReadings.get(row.id).push({ siglum, date: dates[siglum] ?? row.papyrus.fragments.find((fragment) => fragment.id === siglum)?.date ?? 'unknown', diplomatic: word.diplomatic, form: comparisonForm(word), alignment: operation.type, similarity: operation.similarity, source: 'CNTR' });
      }
    }

    // Fill only gaps in the CNTR mapping from the cached INTF transcription
    // of the same GA witness. This never imports a different tradition.
    for (const siglum of cited) {
      const displayedForSiglum = extantRows.filter((row) => row.papyrus.fragments?.some((fragment) => fragment.id === siglum));
      const words = intfWords(siglum, gospel, chapter, verse);
      if (!words.length) continue;
      const operations = alignSequences(words.map(greek), displayedForSiglum.map((row) => greek(row.papyrus.text)));
      for (const operation of operations) if (operation.sourceIndex !== null && operation.displayIndex !== null) {
        const row = displayedForSiglum[operation.displayIndex];
        if (rowReadings.get(row.id).some((reading) => reading.siglum === siglum)) continue;
        rowReadings.get(row.id).push({ siglum, date: dates[siglum] ?? row.papyrus.fragments.find((fragment) => fragment.id === siglum)?.date ?? 'unknown', diplomatic: words[operation.sourceIndex], form: greek(words[operation.sourceIndex]), alignment: operation.type, similarity: operation.similarity, source: 'INTF-cache' });
      }
    }

    for (const row of extantRows) {
      totals.displayedCells++;
      const cell = row.papyrus;
      const citedSigla = cell.fragments?.map((fragment) => fragment.id) ?? [];
      const attestations = rowReadings.get(row.id).filter((reading) => citedSigla.includes(reading.siglum)).sort(rank);
      if (!attestations.length) {
        const stubSigla = citedSigla.filter((siglum) => stubs.has(siglum));
        if (stubSigla.length) { totals.provisionalStubs++; findings.push({ gospel, reference, rowId: row.id, classification: 'provisional-coverage-stub', displayed: cell.text, sigla: citedSigla, stubSigla, decision: 'May remain only with an explicit provisional reconstruction label; it is not transcribed papyrus text.' }); }
        else { totals.unsupportedPlacements++; findings.push({ gospel, reference, rowId: row.id, classification: 'unsupported-placement', displayed: cell.text, sigla: citedSigla, decision: 'No cited papyrus word aligned to this row under a contiguous forward scan.' }); }
        continue;
      }

      const selected = attestations[0];
      const agreeing = attestations.filter((item) => item.form === selected.form).map((item) => item.siglum);
      const dissenting = attestations.filter((item) => item.form !== selected.form);
      const displayedMatches = greek(cell.text) === selected.form;
      if (displayedMatches) totals.selectedReadingMatches++; else { totals.selectedReadingMismatches++; findings.push({ gospel, reference, rowId: row.id, classification: 'wrong-governing-reading', displayed: cell.text, selected, agreeing, dissenting, decision: `Display ${selected.diplomatic} from ${selected.siglum}.` }); }
      if (dissenting.length) {
        totals.disagreementCells++;
        const wronglyAttached = citedSigla.filter((siglum) => dissenting.some((item) => item.siglum === siglum));
        totals.dissentingBadgesAttached += wronglyAttached.length;
        findings.push({ gospel, reference, rowId: row.id, classification: 'papyrus-disagreement', displayed: cell.text, selected, agreeing, dissenting, wronglyAttached, decision: 'Display the earliest-ranked reading; attach only agreeing sigla and retain dissenting readings in provenance.' });
      } else totals.noDisagreement++;
    }
  }
}

const report = { status: 'read-only-papyrus-selection-audit', generatedAt: new Date().toISOString(), rankingRule: 'Earliest starting year in the public paleographic date string; lower Gregory-Aland papyrus number breaks equal starts.', totals, findings };
const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-selection-audit.json'), JSON.stringify(report, null, 2) + '\n');
const markdown = ['# Earliest Papyri Selection Audit', '', `Generated: ${report.generatedAt}`, '', '**Read-only audit. No Gospel data was modified.**', '', `Ranking rule: ${report.rankingRule}`, '', `- Displayed papyrus cells: ${totals.displayedCells}`, `- Display matches selected earliest reading: ${totals.selectedReadingMatches}`, `- Display does not match selected earliest reading: ${totals.selectedReadingMismatches}`, `- Provisional coverage stubs: ${totals.provisionalStubs}`, `- Unsupported placements: ${totals.unsupportedPlacements}`, `- Cells with attested papyrus disagreement: ${totals.disagreementCells}`, `- Dissenting sigla currently attached to the selected text: ${totals.dissentingBadgesAttached}`, '', 'A coverage dot or verse citation establishes the papyrus as relevant to the verse; it does not establish that every word is physically extant. Word-level certification requires the per-siglum forward scan recorded in the JSON ledger.', ''];
fs.writeFileSync(path.join(outDir, 'papyrus-selection-audit.md'), markdown.join('\n'));
console.log(JSON.stringify(totals, null, 2));
