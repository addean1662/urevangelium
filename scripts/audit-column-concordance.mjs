import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapter } = require('./coptic/parse-tt.js');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');

const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const BOOKS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const BYZ_FILES = { matthew: 'MAT.csv', mark: 'MAR.csv', luke: 'LUK.csv', john: 'JOH.csv' };
const COPTIC_PREFIX = { matthew: '40_Matthew', mark: '41_Mark', luke: '42_Luke', john: '43_John' };
const BEZ_BOOKS = { '01': 'matthew', '02': 'mark', '03': 'luke', '04': 'john' };
const COLUMNS = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'bezaeGreek', 'bezaeLatin', 'vulgate', 'peshitta', 'byzantine'];

const ns = {
  ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
  κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
  πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ',
};
function greek(text) {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου').replace(/[^α-ω]/g, '');
  return ns[value] ?? value;
}
function latin(text) { return text.toLowerCase().replace(/j/g, 'i').replace(/u/g, 'v').replace(/[^a-z]/g, ''); }
function syriac(text) { return text.normalize('NFC').replace(/[\u0700-\u070d\u070f\u0730-\u074a]/g, '').replace(/\u0724/g, '\u0723').trim(); }
function coptic(text) { return text.normalize('NFC').toLowerCase().replace(/[^\u2c80-\u2cff\u03e2-\u03ef]/g, ''); }
function rawComparable(text) { return text.normalize('NFC').toLowerCase().replace(/[.,·;:!?…¶"'()[\]-]/g, '').trim(); }

function parsePlainSource(file) {
  const result = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  let gospel = null;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const header = line.trim().match(/^### (Matthew|Mark|Luke|John)$/);
    if (header) { gospel = header[1].toLowerCase(); continue; }
    const match = line.trim().match(/^\[(\d+):(\d+)\]\s+(.+)$/);
    if (gospel && match) result[gospel].set(`${match[1]}:${match[2]}`, match[3].split(/\s+/).filter(Boolean));
  }
  return result;
}

function parseByzantine() {
  const result = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  for (const gospel of GOSPELS) for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/byzantine', BYZ_FILES[gospel]), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^(\d+),(\d+),"?(.*?)"?$/);
    if (match && match[1] !== 'chapter') result[gospel].set(`${match[1]}:${match[2]}`, match[3].split(/\s+/).filter(Boolean));
  }
  return result;
}

function parseMesFile(file) {
  const result = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const parsed = parseMesLine(line); const gospel = BOOKS[parsed.reference.book];
    if (gospel) result[gospel].set(`${parsed.reference.chapter}:${parsed.reference.verse}`, parsed.baseWords.filter((word) => word.presence !== 'absent'));
  }
  return result;
}

function parseCoptic() {
  const result = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  const dir = path.join(ROOT, 'data/sources/coptic-tt');
  for (const gospel of GOSPELS) for (const file of fs.readdirSync(dir).filter((name) => name.startsWith(COPTIC_PREFIX[gospel]) && name.endsWith('.tt'))) {
    const chapter = Number(file.match(/_(\d+)\.tt$/)?.[1]);
    for (const [verse, data] of parseTTChapter(fs.readFileSync(path.join(dir, file), 'utf8'))) result[gospel].set(`${chapter}:${verse}`, data.words.map((word) => word.text));
  }
  return result;
}

function extractTeiWords(body) {
  const base = body.replace(/<app[^>]*>([\s\S]*?)<\/app>/g, (_, inner) => inner.match(/<rdg[^>]*>([\s\S]*?)<\/rdg>/)?.[1] ?? '');
  return [...base.matchAll(/<w\s[^>]*>([\s\S]*?)<\/w>/g)].map((match) => match[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}
function parseBezae(file) {
  const result = Object.fromEntries(GOSPELS.map((gospel) => [gospel, new Map()]));
  const raw = fs.readFileSync(file, 'utf8');
  for (const match of raw.matchAll(/<ab\s+n="([^"]+)"[^>]*>([\s\S]*?)<\/ab>/g)) {
    const ref = match[1].match(/^B(\d+)K(\d+)V(\d+)/); if (!ref || !BEZ_BOOKS[ref[1]]) continue;
    const gospel = BEZ_BOOKS[ref[1]], key = `${Number(ref[2])}:${Number(ref[3])}`, words = extractTeiWords(match[2]);
    result[gospel].set(key, [...(result[gospel].get(key) ?? []), ...words]);
  }
  return result;
}

const sources = {
  coptic: parseCoptic(), vaticanus: parseMesFile(path.join(ROOT, 'data/sources/vaticanus/03.txt')), sinaiticus: parseMesFile(path.join(ROOT, 'data/sources/sinaiticus/01.txt')),
  bezaeGreek: parseBezae(path.join(ROOT, 'data/sources/bezae/Bezae-Greek.xml')), bezaeLatin: parseBezae(path.join(ROOT, 'data/sources/bezae/Bezae-Latin.xml')),
  vulgate: parsePlainSource(path.join(ROOT, 'data/sources/vulgate/VulgClementine.txt')), peshitta: parsePlainSource(path.join(ROOT, 'data/sources/peshitta/Peshitta.txt')), byzantine: parseByzantine(),
};
const papyri = {};
for (const file of fs.readdirSync(path.join(ROOT, 'data/sources/earliest-papyrus')).filter((name) => /^P\d+\.txt$/.test(name))) papyri[file.slice(0, -4)] = parseMesFile(path.join(ROOT, 'data/sources/earliest-papyrus', file));

const normalize = { coptic, vaticanus: greek, sinaiticus: greek, bezaeGreek: greek, bezaeLatin: latin, vulgate: latin, peshitta: syriac, byzantine: greek };
const report = { status: 'read-only-source-concordance', generatedAt: new Date().toISOString(), scope: 'All displayed cells in Matthew, Mark, Luke, and John', totals: Object.fromEntries(COLUMNS.map((column) => [column, { displayed: 0, exact: 0, normalized: 0, sourcePresentUnordered: 0, unsupported: 0, indeterminate: 0, sourceNotDisplayed: 0, lacunaCells: 0, omittedCells: 0, emptyCells: 0 }])), exceptions: [] };

function appendDisplayed(target, rowId, text) {
  for (const token of text.split(/\s+/).filter(Boolean)) target.push({ rowId, text: token });
}

function auditSequence(column, gospel, reference, displayed, sourceWords) {
  const totals = report.totals[column], norm = normalize[column];
  totals.displayed += displayed.length;
  if (!sourceWords) { totals.indeterminate += displayed.length; for (const item of displayed) report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, classification: 'indeterminate', reason: 'No governing source record for verse' }); return; }
  const sourceForms = sourceWords.map((word) => column === 'vaticanus' || column === 'sinaiticus' ? comparisonForm(word) : norm(word));
  const sourceSet = new Set(sourceForms);
  const operations = alignSequences(sourceForms, displayed.map((item) => norm(item.text)));
  for (const operation of operations) {
    if (operation.sourceIndex !== null && operation.displayIndex !== null) {
      const sourceText = column === 'vaticanus' || column === 'sinaiticus' ? sourceWords[operation.sourceIndex].diplomatic : sourceWords[operation.sourceIndex];
      const item = displayed[operation.displayIndex];
      if (operation.type === 'exact') {
        const classification = rawComparable(sourceText) === rawComparable(item.text) ? 'exact' : 'normalized'; totals[classification]++;
      } else if (sourceSet.has(norm(item.text))) { totals.sourcePresentUnordered++; report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, classification: 'source-present-unordered', reason: 'Token occurs in the governing source verse but did not preserve the same ordered pairing' }); }
      else { totals.unsupported++; report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, source: sourceText, classification: 'unsupported', reason: `Only ${Math.round(operation.similarity * 100)}% normalized similarity and no exact token elsewhere in the source verse` }); }
    } else if (operation.sourceIndex !== null) totals.sourceNotDisplayed++;
    else { const item = displayed[operation.displayIndex]; if (sourceSet.has(norm(item.text))) { totals.sourcePresentUnordered++; report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, classification: 'source-present-unordered', reason: 'Token occurs in the governing source verse but has no ordered source match' }); } else { totals.unsupported++; report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, classification: 'unsupported', reason: 'Displayed token does not occur in the governing source verse' }); } }
  }
}

for (const gospel of GOSPELS) {
  const dir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(dir).filter((name) => /^\d+$/.test(name))) for (const file of fs.readdirSync(path.join(dir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
    const verse = Number(file.slice(0, -5)), reference = `${chapter}:${verse}`, data = JSON.parse(fs.readFileSync(path.join(dir, chapter, file), 'utf8'));
    for (const column of ['coptic', 'vaticanus', 'sinaiticus', 'vulgate', 'peshitta', 'byzantine']) {
      const displayed = [];
      for (const row of data.rows) { const cell = row[column]; if (cell?.type === 'text') appendDisplayed(displayed, row.id, cell.text); else if (cell?.type === 'lacuna' || cell?.type === 'lost') report.totals[column].lacunaCells++; else if (cell?.type === 'omitted') report.totals[column].omittedCells++; else if (cell?.type === 'empty') report.totals[column].emptyCells++; }
      if (column === 'vaticanus') {
        report.totals.vaticanus.displayed += displayed.length;
        for (const item of displayed) {
          const cell = data.rows.find((row) => row.id === item.rowId)?.vaticanus;
          if (cell?.provenance?.source === 'INTF NTVMR transcription' && cell.provenance.diplomatic === item.text) report.totals.vaticanus.exact++;
          else { report.totals.vaticanus.unsupported++; report.exceptions.push({ column, gospel, reference, rowId: item.rowId, displayed: item.text, classification: 'unsupported', reason: 'Missing exact INTF diplomatic provenance; run certify:vaticanus:live' }); }
        }
      } else auditSequence(column, gospel, reference, displayed, sources[column][gospel].get(reference));
    }
    for (const side of ['Greek', 'Latin']) {
      const column = `bezae${side}`, displayed = [];
      for (const row of data.rows) { const cell = row.bezae; if (cell?.type === 'text' && cell[side.toLowerCase()]) displayed.push({ rowId: row.id, text: cell[side.toLowerCase()] }); else if (cell?.type === 'lost' || cell?.type === 'lacuna' || (cell?.type === 'text' && cell[`${side.toLowerCase()}Lost`])) report.totals[column].lacunaCells++; else if (cell?.type === 'omitted' || (cell?.type === 'text' && cell[`${side.toLowerCase()}Omitted`])) report.totals[column].omittedCells++; else if (cell?.type === 'empty' || cell?.type === 'unpopulated') report.totals[column].emptyCells++; }
      auditSequence(column, gospel, reference, displayed, sources[column][gospel].get(reference));
    }
    for (const row of data.rows) {
      const cell = row.papyrus;
      if (cell?.type === 'extant') {
        report.totals.papyrus.displayed++;
        const candidates = (cell.fragments ?? []).flatMap((fragment) => (papyri[fragment.id]?.[gospel].get(reference) ?? []).map((word) => ({ siglum: fragment.id, diplomatic: word.diplomatic, form: comparisonForm(word) })));
        const displayForm = greek(cell.text), exact = candidates.find((item) => rawComparable(item.diplomatic) === rawComparable(cell.text)), normalizedMatch = candidates.find((item) => item.form === displayForm);
        if (exact) report.totals.papyrus.exact++; else if (normalizedMatch) report.totals.papyrus.normalized++; else { report.totals.papyrus.unsupported++; report.exceptions.push({ column: 'papyrus', gospel, reference, rowId: row.id, displayed: cell.text, sigla: (cell.fragments ?? []).map((item) => item.id), classification: 'unsupported', reason: 'Token absent from every cited papyrus source record for this verse' }); }
      } else if (cell?.type === 'lost') report.totals.papyrus.lacunaCells++; else if (cell?.type === 'empty') report.totals.papyrus.emptyCells++;
    }
  }
}

const outDir = path.join(ROOT, 'docs/audits'); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'all-column-source-concordance.json'), JSON.stringify(report, null, 2) + '\n');
const lines = ['# All-Column Source Concordance', '', `Generated: ${report.generatedAt}`, '', '**Read-only audit. No displayed data was changed.**', '', '| Column | Displayed | Exact | Declared normalization | Present but unordered | Unsupported | Indeterminate | Source tokens not displayed | Lacuna cells | Omitted cells | Empty cells |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for (const column of COLUMNS) { const t = report.totals[column]; lines.push(`| ${column} | ${t.displayed} | ${t.exact} | ${t.normalized} | ${t.sourcePresentUnordered} | ${t.unsupported} | ${t.indeterminate} | ${t.sourceNotDisplayed} | ${t.lacunaCells} | ${t.omittedCells} | ${t.emptyCells} |`); }
lines.push('', `Exception records: ${report.exceptions.length}.`, '', '“Unsupported” means the displayed token did not receive an exact normalized, ordered match in the declared source. It is an audit finding, not automatically a claim that the source lacks the reading; word division and parser limitations must be adjudicated.', '');
fs.writeFileSync(path.join(outDir, 'all-column-source-concordance.md'), lines.join('\n'));
console.log(JSON.stringify(report.totals, null, 2));
