import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const parserPath = path.join(ROOT, 'lib/sources/cntrMes.js');
const parserSource = fs.readFileSync(parserPath, 'utf8');
const parserUrl = `data:text/javascript;base64,${Buffer.from(parserSource).toString('base64')}`;
const { parseMesLine, comparisonForm } = await import(parserUrl);

const GOSPELS = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
const PILOT = new Set(['matthew:1', 'matthew:27', 'mark:1', 'mark:16', 'luke:1', 'luke:23', 'john:1', 'john:7', 'john:8']);

function norm(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ωϛϟϗ\u2ce8\ue001¯�]/g, '');
}

function lcsLength(a, b) {
  const previous = new Uint16Array(b.length + 1);
  const current = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    previous.set(current);
    current.fill(0);
  }
  return previous[b.length];
}

const sourceLines = fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/03.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const results = [];
const parseErrors = [];
const totals = { verses: 0, sourceWords: 0, displayedWords: 0, exactSequence: 0, lcsMatches: 0, corrections: 0, laterCorrectors: 0, nominaSacra: 0, supplied: 0, damagedOrMissing: 0 };

for (const rawLine of sourceLines) {
  let parsed;
  try { parsed = parseMesLine(rawLine); }
  catch (error) { parseErrors.push({ line: rawLine.slice(0, 80), error: error.message }); continue; }
  const gospel = GOSPELS[parsed.reference.book];
  if (!gospel || !PILOT.has(`${gospel}:${parsed.reference.chapter}`)) continue;
  const versePath = path.join(ROOT, 'data', gospel, String(parsed.reference.chapter), `${parsed.reference.verse}.json`);
  if (!fs.existsSync(versePath)) continue;
  const verse = JSON.parse(fs.readFileSync(versePath, 'utf8'));
  const sourceWords = parsed.baseWords.filter((word) => word.presence !== 'absent');
  const displayed = verse.rows.filter((row) => row.vaticanus?.type === 'text').map((row) => row.vaticanus.text);
  const sourceNorm = sourceWords.map(comparisonForm);
  const displayNorm = displayed.map(norm);
  const lcs = lcsLength(sourceNorm, displayNorm);
  const exact = sourceNorm.length === displayNorm.length && sourceNorm.every((word, index) => word === displayNorm[index]);
  const corrections = parsed.segments.filter((segment) => segment.type === 'correction');
  const laterCorrectors = corrections.reduce((count, segment) => count + segment.edits.filter((edit) => /^[abc]$/.test(edit.marker)).length, 0);
  const nomina = sourceWords.filter((word) => word.abbreviation === 'nomina-sacra').length;
  const supplied = sourceWords.filter((word) => word.supplied).length;
  const conditioned = sourceWords.filter((word) => word.conditions.length).length;

  totals.verses++;
  totals.sourceWords += sourceNorm.length;
  totals.displayedWords += displayNorm.length;
  totals.lcsMatches += lcs;
  totals.corrections += corrections.length;
  totals.laterCorrectors += laterCorrectors;
  totals.nominaSacra += nomina;
  totals.supplied += supplied;
  totals.damagedOrMissing += conditioned;
  if (exact) totals.exactSequence++;

  results.push({
    reference: `${gospel} ${parsed.reference.chapter}:${parsed.reference.verse}`,
    sourceWordCount: sourceNorm.length,
    displayedWordCount: displayNorm.length,
    lcs,
    agreementPercent: sourceNorm.length ? Math.round((lcs / sourceNorm.length) * 1000) / 10 : 100,
    exactSequence: exact,
    corrections: corrections.length,
    laterCorrectors,
    nominaSacra: nomina,
    supplied,
    damagedOrMissing: conditioned,
    sourceDiplomatic: sourceWords.map((word) => word.diplomatic),
    currentlyDisplayed: displayed,
    sourceRaw: parsed.raw,
  });
}

results.sort((a, b) => a.agreementPercent - b.agreementPercent || a.reference.localeCompare(b.reference));
const report = {
  generatedAt: new Date().toISOString(),
  policy: 'Read-only pilot. GA 03 unlettered/base MES edit projected; x and a-c layers retained in parsed evidence. No Gospel JSON changed.',
  chapters: [...PILOT],
  totals: { ...totals, exactSequencePercent: totals.verses ? Math.round((totals.exactSequence / totals.verses) * 1000) / 10 : 0, lcsAgreementPercent: totals.sourceWords ? Math.round((totals.lcsMatches / totals.sourceWords) * 1000) / 10 : 0 },
  parseErrors,
  lowestAgreement: results.slice(0, 50),
  verses: results,
};

const outDir = path.join(ROOT, 'docs/audits');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'vaticanus-pilot.json'), JSON.stringify(report, null, 2) + '\n');

const lines = [
  '# Vaticanus GA 03 Source Pilot', '',
  `Generated: ${report.generatedAt}`, '',
  report.policy, '',
  '## Scope', '',
  [...PILOT].join(', '), '',
  '## Results', '',
  `- Verses compared: ${totals.verses}`,
  `- GA 03 base words: ${totals.sourceWords}`,
  `- Currently displayed Vaticanus words: ${totals.displayedWords}`,
  `- Exact normalized sequences: ${totals.exactSequence} (${report.totals.exactSequencePercent}%)`,
  `- Longest-common-subsequence agreement: ${totals.lcsMatches}/${totals.sourceWords} (${report.totals.lcsAgreementPercent}%)`,
  `- Base-hand correction structures retained: ${totals.corrections}`,
  `- Later-corrector layers retained: ${totals.laterCorrectors}`,
  `- Nomina sacra marked by MES: ${totals.nominaSacra}`,
  `- Supplied words marked by MES: ${totals.supplied}`,
  `- Words with damaged or missing character conditions: ${totals.damagedOrMissing}`,
  `- MES parse errors in the complete GA 03 file: ${parseErrors.length}`, '',
  '## Lowest-agreement verses', '',
  '| Reference | GA 03 words | Displayed | LCS agreement | Exact |',
  '|---|---:|---:|---:|:---:|',
  ...results.slice(0, 25).map((row) => `| ${row.reference} | ${row.sourceWordCount} | ${row.displayedWordCount} | ${row.agreementPercent}% | ${row.exactSequence ? 'yes' : 'no'} |`), '',
  'The LCS comparison is diagnostic only. It does not authorize automatic replacement or imply that accents, abbreviations, word division, corrections, and lacunae are equivalent.', '',
];
fs.writeFileSync(path.join(outDir, 'vaticanus-pilot.md'), lines.join('\n'));
console.log(JSON.stringify(report.totals, null, 2));
if (parseErrors.length) {
  console.error(`${parseErrors.length} MES parse error(s); see docs/audits/vaticanus-pilot.json`);
  process.exitCode = 1;
}
