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
  matthew: { book: 40, intfBook: 'B01' },
  mark: { book: 41, intfBook: 'B02' },
  luke: { book: 42, intfBook: 'B03' },
  john: { book: 43, intfBook: 'B04' },
};
const CNTR_REVISION = '4c0e9f94117ec3dc4ae40094aec044bb7a416a53';
const CNTR_SHA256 = 'cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function decode(text) {
  return text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'");
}
function plain(xml) {
  return decode(xml.replace(/<lb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<cb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<gap\b[^>]*\/>/g, '�').replace(/<[^>]+>/g, '').replace(/\s+/g, ''));
}
function norm(text) {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω�]/g, '');
  const nomina = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
  };
  return nomina[value] ?? value;
}
function originalHand(body) {
  return body.replace(/<app\b[^>]*>([\s\S]*?)<\/app>/g, (_all, app) => {
    const original = app.match(/<rdg\b(?=[^>]*type="orig")(?=[^>]*hand="firsthand")[^>]*>([\s\S]*?)<\/rdg>/);
    return original ? original[1] : '';
  });
}
function parseIntf(file, expectedBook) {
  const xml = fs.readFileSync(file, 'utf8');
  const verses = new Map();
  for (const match of xml.matchAll(/<ab\b[^>]*\bn="B0(\d)K(\d+)V(\d+)"[^>]*(?<!\/)>([\s\S]*?)<\/ab>/g)) {
    const [, bookDigit, chapter, verse, body] = match;
    if (`B0${bookDigit}` !== expectedBook) continue;
    const selected = originalHand(body);
    const words = [...selected.matchAll(/<w\b[^>]*>([\s\S]*?)<\/w>/g)].map((word) => ({ diplomatic: plain(word[1]), xml: word[0], unclear: /<unclear\b/.test(word[1]), gap: /<gap\b/.test(word[1]) })).filter((word) => word.diplomatic);
    verses.set(`${Number(chapter)}:${Number(verse)}`, words);
  }
  return { xml, verses };
}

const cntrPath = path.join(ROOT, 'data/sources/vaticanus/03.txt');
if (sha256(cntrPath) !== CNTR_SHA256) throw new Error('Pinned CNTR GA 03 checksum mismatch');
const cntr = Object.fromEntries(Object.keys(GOSPELS).map((gospel) => [gospel, new Map()]));
for (const line of fs.readFileSync(cntrPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const record = parseMesLine(line);
  const gospel = Object.entries(GOSPELS).find(([, value]) => value.book === record.reference.book)?.[0];
  if (gospel) cntr[gospel].set(`${record.reference.chapter}:${record.reference.verse}`, {
    words: record.baseWords.filter((word) => word.presence !== 'absent'),
    explicitAbsence: record.baseWords.length > 0 && record.baseWords.every((word) => word.presence === 'absent'),
  });
}

const report = { status: 'automated-independent-transcription-comparison', generatedAt: new Date().toISOString(), sources: { cntr: { revision: CNTR_REVISION, sha256: CNTR_SHA256 }, intf: {} }, totals: { versesCompared: 0, versesExact: 0, versesWithDifferences: 0, cntrWords: 0, intfWords: 0, exactDiplomatic: 0, normalizedAgreement: 0, substitutions: 0, cntrOnly: 0, intfOnly: 0, conditionedAgreements: 0, agreedAbsentVerses: 0, intfAbsentCntrTextVerses: 0, intfTextCntrMissingVerses: 0 }, gospels: {}, differences: [] };

for (const [gospel, config] of Object.entries(GOSPELS)) {
  const file = path.join(ROOT, `data/sources/vaticanus/intf/${gospel}.xml`);
  const independent = parseIntf(file, config.intfBook);
  report.sources.intf[gospel] = { sha256: sha256(file), institution: 'Institut für neutestamentliche Textforschung', documentId: 20003, license: 'CC BY 4.0' };
  const totals = { versesCompared: 0, versesExact: 0, versesWithDifferences: 0, cntrWords: 0, intfWords: 0, exactDiplomatic: 0, normalizedAgreement: 0, substitutions: 0, cntrOnly: 0, intfOnly: 0, conditionedAgreements: 0, agreedAbsentVerses: 0, intfAbsentCntrTextVerses: 0, intfTextCntrMissingVerses: 0 };
  const references = new Set([...cntr[gospel].keys(), ...independent.verses.keys()]);
  for (const reference of [...references].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const cntrRecord = cntr[gospel].get(reference);
    const b = independent.verses.get(reference);
    if (!b && cntrRecord?.explicitAbsence) {
      totals.agreedAbsentVerses++;
      continue;
    }
    if (!b && cntrRecord?.words.length) {
      totals.intfAbsentCntrTextVerses++;
      report.differences.push({ gospel, reference, classification: 'intf-absent-cntr-text', governance: 'INTF', cntrWords: cntrRecord.words.map((word) => word.diplomatic) });
      continue;
    }
    if (b && !cntrRecord) {
      totals.intfTextCntrMissingVerses++;
      report.differences.push({ gospel, reference, classification: 'intf-text-cntr-missing', governance: 'INTF', intfWords: b.map((word) => word.diplomatic) });
      continue;
    }
    if (!b || !cntrRecord) continue;
    const a = cntrRecord.words;
    totals.versesCompared++; totals.cntrWords += a.length; totals.intfWords += b.length;
    const operations = alignSequences(a.map(comparisonForm), b.map((word) => norm(word.diplomatic)));
    const differences = [];
    for (const operation of operations) {
      if (operation.sourceIndex !== null && operation.displayIndex !== null) {
        const left = a[operation.sourceIndex], right = b[operation.displayIndex];
        if (comparisonForm(left) === norm(right.diplomatic)) {
          if (plain(left.diplomatic) === right.diplomatic) totals.exactDiplomatic++; else totals.normalizedAgreement++;
          if ((left.conditions?.length ?? 0) || right.unclear || right.gap) totals.conditionedAgreements++;
        } else { totals.substitutions++; differences.push({ classification: 'substitution', cntrWord: operation.sourceIndex + 1, cntr: left.diplomatic, intfWord: operation.displayIndex + 1, intf: right.diplomatic, similarity: operation.similarity }); }
      } else if (operation.sourceIndex !== null) { totals.cntrOnly++; differences.push({ classification: 'cntr-only', cntrWord: operation.sourceIndex + 1, cntr: a[operation.sourceIndex].diplomatic }); }
      else { totals.intfOnly++; differences.push({ classification: 'intf-only', intfWord: operation.displayIndex + 1, intf: b[operation.displayIndex].diplomatic }); }
    }
    if (differences.length) { totals.versesWithDifferences++; report.differences.push({ gospel, reference, differences }); } else totals.versesExact++;
  }
  report.gospels[gospel] = totals;
  for (const key of Object.keys(report.totals)) if (key in totals) report.totals[key] += totals[key];
}

const out = path.join(ROOT, 'docs/audits/vaticanus-cntr-intf-comparison.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
const t = report.totals;
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-cntr-intf-comparison.md'), ['# Vaticanus CNTR–INTF Automated Comparison', '', `Generated: ${report.generatedAt}`, '', '**Shadow certification evidence only. No live data modified.**', '', `- Verses compared: ${t.versesCompared}`, `- Verses with complete normalized agreement: ${t.versesExact}`, `- Verses with differences held: ${t.versesWithDifferences}`, `- CNTR words: ${t.cntrWords}`, `- INTF words: ${t.intfWords}`, `- Exact diplomatic agreements: ${t.exactDiplomatic}`, `- Normalized agreements: ${t.normalizedAgreement}`, `- Conditioned agreements: ${t.conditionedAgreements}`, `- Substitutions held: ${t.substitutions}`, `- CNTR-only words held: ${t.cntrOnly}`, `- INTF-only words held: ${t.intfOnly}`, `- Both sources explicitly absent: ${t.agreedAbsentVerses}`, `- INTF absent while CNTR supplies text: ${t.intfAbsentCntrTextVerses}`, `- INTF text without a CNTR record: ${t.intfTextCntrMissingVerses}`, '', 'INTF governs the shadow. CNTR agreements provide automated corroboration; disagreements remain held for adjudication.', ''].join('\n'));
console.log(JSON.stringify({ totals: report.totals, gospels: report.gospels }, null, 2));
