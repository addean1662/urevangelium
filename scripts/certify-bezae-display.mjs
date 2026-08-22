import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const BOOKS = { '01': 'matthew', '02': 'mark', '03': 'luke', '04': 'john' };
const SOURCES = {
  greek: path.join(ROOT, 'data/sources/bezae/Bezae-Greek.xml'),
  latin: path.join(ROOT, 'data/sources/bezae/Bezae-Latin.xml'),
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const canonicalSource = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/gu, '\n');
const sourceHashes = Object.fromEntries(Object.entries(SOURCES).map(([side, file]) => [side, sha256(canonicalSource(file))]));

const nominaSacra = {
  'ισ': 'ιησουσ', 'ιυ': 'ιησου', 'ιν': 'ιησουν', 'ιη': 'ιησου', 'χσ': 'χριστοσ', 'χυ': 'χριστου', 'χν': 'χριστον', 'χω': 'χριστω',
  'κσ': 'κυριοσ', 'κυ': 'κυριου', 'κν': 'κυριον', 'κω': 'κυριω', 'κε': 'κυριε', 'θσ': 'θεοσ', 'θυ': 'θεου', 'θν': 'θεον', 'θω': 'θεω',
  'πνα': 'πνευμα', 'πνσ': 'πνευματοσ', 'πνι': 'πνευματι', 'υσ': 'υιοσ', 'υυ': 'υιου', 'υν': 'υιον', 'υω': 'υιω', 'δαδ': 'δαυιδ', 'ιηλ': 'ισραηλ',
};
function greek(value) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('el')
    .replaceAll('ς', 'σ').replaceAll('¯', 'ν').replaceAll('ϗ', 'και').replaceAll('⳨', 'τρ').replaceAll('\ue001', 'μου').replace(/[^α-ω]/gu, '');
  return nominaSacra[normalized] ?? normalized;
}
const latin = (value) => value.toLocaleLowerCase('la').replaceAll('j', 'i').replaceAll('u', 'v').replace(/[^a-z]/gu, '');
const rawComparable = (value) => value.normalize('NFC').toLocaleLowerCase().replace(/[.,·;:!?…¶"'()[\]\-]/gu, '').replace(/\s+/gu, ' ').trim();

function extractTeiWords(body) {
  // The displayed base-reading policy follows the existing importer: where an
  // apparatus is present, select the first encoded rdg and do not flatten all
  // alternatives into the displayed stream.
  const base = body.replace(/<app[^>]*>([\s\S]*?)<\/app>/gu, (_, inner) => inner.match(/<rdg[^>]*>([\s\S]*?)<\/rdg>/u)?.[1] ?? '');
  return [...base.matchAll(/<w\s[^>]*>([\s\S]*?)<\/w>/gu)]
    .map((match, sourceIndex) => ({ sourceIndex, text: match[1].replace(/<[^>]+>/gu, '').trim() }))
    .filter((word) => word.text);
}

function parseTei(file) {
  const verses = new Map();
  const raw = canonicalSource(file);
  for (const match of raw.matchAll(/<ab\s+n="([^"]+)"[^>]*>([\s\S]*?)<\/ab>/gu)) {
    const reference = match[1].match(/^B(\d+)K(\d+)V(\d+)/u);
    if (!reference || !BOOKS[reference[1]]) continue;
    const key = `${BOOKS[reference[1]]} ${Number(reference[2])}:${Number(reference[3])}`;
    verses.set(key, [...(verses.get(key) ?? []), ...extractTeiWords(match[2])].map((word, sourceIndex) => ({ ...word, sourceIndex })));
  }
  return verses;
}

const source = { greek: parseTei(SOURCES.greek), latin: parseTei(SOURCES.latin) };
const totals = {
  verseFiles: 0, textRows: 0, pairedRows: 0, greekOnlyRows: 0, latinOnlyRows: 0,
  greekDisplayed: 0, latinDisplayed: 0, greekExact: 0, greekNormalized: 0, latinExact: 0, latinNormalized: 0,
  greekUnordered: 0, latinUnordered: 0, fullLostRows: 0, greekSideLostRows: 0, latinSideLostRows: 0,
  fullOmissionRows: 0, greekSideOmissionRows: 0, latinSideOmissionRows: 0,
  explicitEmptyRows: 0, unpopulatedDisplayGaps: 0, unsupported: 0, occurrenceReuse: 0, structuralFailures: 0,
};
const failures = [];
const decisions = [];

function certifySide(side, reference, displayed) {
  const sourceWords = source[side].get(reference) ?? [];
  const normalize = side === 'greek' ? greek : latin;
  const available = new Map();
  sourceWords.forEach((word) => {
    const key = normalize(word.text);
    if (!available.has(key)) available.set(key, []);
    available.get(key).push(word);
  });
  let previousSourceIndex = -1;
  for (const item of displayed) {
    const candidates = available.get(normalize(item.text)) ?? [];
    const sourceWord = candidates.shift();
    if (!sourceWord) {
      totals.unsupported += 1;
      failures.push({ reference, side, rowId: item.rowId, text: item.text, issue: 'NO_UNIQUE_SOURCE_OCCURRENCE' });
      continue;
    }
    const exact = rawComparable(sourceWord.text) === rawComparable(item.text);
    totals[`${side}${exact ? 'Exact' : 'Normalized'}`] += 1;
    if (sourceWord.sourceIndex < previousSourceIndex) totals[`${side}Unordered`] += 1;
    previousSourceIndex = sourceWord.sourceIndex;
    item.sourceIndex = sourceWord.sourceIndex;
    item.sourceText = sourceWord.text;
    item.match = exact ? 'EXACT' : 'DECLARED_NORMALIZATION';
  }
}

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/u.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/u.test(name))) {
      totals.verseFiles += 1;
      const reference = `${gospel} ${Number(chapter)}:${Number(filename.slice(0, -5))}`;
      const document = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
      const greekDisplayed = [];
      const latinDisplayed = [];
      const relations = [];
      for (const row of document.rows) {
        const cell = row.bezae;
        if (!cell || cell.type === 'unpopulated') { totals.unpopulatedDisplayGaps += 1; relations.push({ rowId: row.id, relation: 'UNPOPULATED_DISPLAY_GAP' }); continue; }
        if (cell.type === 'empty') { totals.explicitEmptyRows += 1; relations.push({ rowId: row.id, relation: 'EXPLICIT_ALIGNMENT_GAP' }); continue; }
        if (cell.type === 'lost') { totals.fullLostRows += 1; relations.push({ rowId: row.id, relation: 'FULL_PHYSICAL_LOSS_DISPLAY' }); continue; }
        if (cell.type === 'omitted') {
          if (cell.greek && cell.latin) totals.fullOmissionRows += 1;
          else if (cell.greek) totals.greekSideOmissionRows += 1;
          else if (cell.latin) totals.latinSideOmissionRows += 1;
          else { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'OMISSION_WITHOUT_SIDE' }); }
          relations.push({ rowId: row.id, relation: cell.greek && cell.latin ? 'BILINGUAL_TEXTUAL_OMISSION' : cell.greek ? 'GREEK_TEXTUAL_OMISSION' : 'LATIN_TEXTUAL_OMISSION' });
          continue;
        }
        if (cell.type !== 'text') { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'UNSUPPORTED_CELL_TYPE', type: cell.type }); continue; }
        totals.textRows += 1;
        if (cell.greek && cell.greekLost) { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'GREEK_TEXT_AND_LOSS_CONFLICT' }); }
        if (cell.latin && cell.latinLost) { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'LATIN_TEXT_AND_LOSS_CONFLICT' }); }
        if (cell.greek && cell.greekOmitted) { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'GREEK_TEXT_AND_OMISSION_CONFLICT' }); }
        if (cell.latin && cell.latinOmitted) { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'LATIN_TEXT_AND_OMISSION_CONFLICT' }); }
        if (!cell.greek && !cell.latin && !cell.greekLost && !cell.latinLost && !cell.greekOmitted && !cell.latinOmitted) { totals.structuralFailures += 1; failures.push({ reference, rowId: row.id, issue: 'EMPTY_TEXT_CELL' }); }
        if (cell.greek) { totals.greekDisplayed += 1; greekDisplayed.push({ rowId: row.id, text: cell.greek }); }
        if (cell.latin) { totals.latinDisplayed += 1; latinDisplayed.push({ rowId: row.id, text: cell.latin }); }
        if (cell.greekLost) totals.greekSideLostRows += 1;
        if (cell.latinLost) totals.latinSideLostRows += 1;
        if (cell.greekOmitted) totals.greekSideOmissionRows += 1;
        if (cell.latinOmitted) totals.latinSideOmissionRows += 1;
        if (cell.greek && cell.latin) { totals.pairedRows += 1; relations.push({ rowId: row.id, relation: 'BILINGUAL_COMPARISON_ROW' }); }
        else if (cell.greek) { totals.greekOnlyRows += 1; relations.push({ rowId: row.id, relation: 'GREEK_ONLY_COMPARISON_ROW' }); }
        else if (cell.latin) { totals.latinOnlyRows += 1; relations.push({ rowId: row.id, relation: 'LATIN_ONLY_COMPARISON_ROW' }); }
        else relations.push({ rowId: row.id, relation: cell.greekLost ? 'GREEK_SIDE_PHYSICAL_LOSS' : cell.latinLost ? 'LATIN_SIDE_PHYSICAL_LOSS' : cell.greekOmitted ? 'GREEK_TEXTUAL_OMISSION' : 'LATIN_TEXTUAL_OMISSION' });
      }
      certifySide('greek', reference, greekDisplayed);
      certifySide('latin', reference, latinDisplayed);
      if (greekDisplayed.length || latinDisplayed.length || relations.some((relation) => relation.relation.includes('LOSS'))) decisions.push({ reference, greek: greekDisplayed, latin: latinDisplayed, relations });
    }
  }
}

const certificateCore = {
  scope: 'The Bezae Greek and Latin forms and status markers actually rendered by the site. Unused TEI apparatus layers and source tokens not selected for display are outside scope.',
  standard: 'Every displayed form consumes one unique normalized occurrence in the corresponding hash-pinned TEI verse. Row relations describe comparative display placement and never assert literal bilingual equivalence. Physical loss, explicit alignment gaps, and unpopulated post-generation rows remain distinct.',
  baseReadingPolicy: 'Within each TEI apparatus element, the first encoded rdg is the displayed base-reading stream, matching the existing importer. Alternative readings remain in the TEI and are not flattened into the display.',
  sourceHashes,
  totals,
  decisions,
};
const certificateSha256 = sha256(JSON.stringify(certificateCore));
const passed = totals.unsupported === 0 && totals.occurrenceReuse === 0 && totals.structuralFailures === 0
  && totals.greekDisplayed === totals.greekExact + totals.greekNormalized
  && totals.latinDisplayed === totals.latinExact + totals.latinNormalized;
const certificate = { status: passed ? 'INTERNALLY_CERTIFIED_DISPLAY_SCOPE' : 'FAILED', generatedAt: new Date().toISOString(), ...certificateCore, certificateSha256, failures };
fs.writeFileSync(path.join(ROOT, 'docs/audits/bezae-display-certification.json'), `${JSON.stringify(certificate, null, 2)}\n`);
const markdown = [
  '# Bezae display certification', '', `Status: **${certificate.status}**`, '',
  'This certificate covers only the Greek and Latin readings and status markers actually rendered by Urevangelium. It does not claim that unused TEI apparatus layers are displayed or independently adjudicated.', '',
  '| Gate | Result |', '|---|---:|',
  `| Greek displayed forms | ${totals.greekDisplayed.toLocaleString()} |`,
  `| Latin displayed forms | ${totals.latinDisplayed.toLocaleString()} |`,
  `| Unsupported or reused source occurrences | ${(totals.unsupported + totals.occurrenceReuse).toLocaleString()} |`,
  `| Structural failures | ${totals.structuralFailures.toLocaleString()} |`,
  `| Bilingual comparison rows | ${totals.pairedRows.toLocaleString()} |`,
  `| Greek-only comparison rows | ${totals.greekOnlyRows.toLocaleString()} |`,
  `| Latin-only comparison rows | ${totals.latinOnlyRows.toLocaleString()} |`,
  `| Full physical-loss rows | ${totals.fullLostRows.toLocaleString()} |`,
  `| Side-specific physical-loss rows | ${(totals.greekSideLostRows + totals.latinSideLostRows).toLocaleString()} |`,
  `| Full textual-omission rows | ${totals.fullOmissionRows.toLocaleString()} |`,
  `| Side-specific textual-omission rows | ${(totals.greekSideOmissionRows + totals.latinSideOmissionRows).toLocaleString()} |`,
  `| Explicit alignment-gap rows | ${totals.explicitEmptyRows.toLocaleString()} |`,
  `| Unpopulated post-generation display gaps | ${totals.unpopulatedDisplayGaps.toLocaleString()} |`, '',
  'Greek and Latin are independently mapped to unique occurrences in their corresponding TEI verse. A shared table row is a comparison placement, not a claim of literal translation equivalence. Latin comparison order may differ from TEI running order and is not represented as diplomatic sequence.', '',
  `Greek TEI SHA-256: ${sourceHashes.greek}`,
  `Latin TEI SHA-256: ${sourceHashes.latin}`,
  `Certificate SHA-256: ${certificateSha256}`, '',
];
fs.writeFileSync(path.join(ROOT, 'docs/audits/bezae-display-certification.md'), markdown.join('\n'));
console.log(JSON.stringify({ status: certificate.status, totals, certificateSha256 }, null, 2));
if (!passed) process.exitCode = 1;
