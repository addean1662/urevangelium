import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('./coptic/parse-tt.js');

const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const PREFIX = {
  matthew: '40_Matthew',
  mark: '41_Mark',
  luke: '42_Luke',
  john: '43_John',
};
const SOURCE_DIR = path.join(ROOT, 'data', 'sources', 'coptic-tt');
const OUT_DIR = path.join(ROOT, 'docs', 'audits');
const SHADOW_DIR = path.join(OUT_DIR, 'coptic-live-shadow');

function comparable(value) {
  return value.normalize('NFC').toLowerCase().replace(/[^\u2c80-\u2cff\u03e2-\u03ef]/g, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function loadSource(gospel) {
  const verses = new Map();
  const files = fs.readdirSync(SOURCE_DIR)
    .filter((name) => name.startsWith(PREFIX[gospel]) && name.endsWith('.tt'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const aggregate = crypto.createHash('sha256');

  for (const file of files) {
    const content = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
    aggregate.update(file).update('\0').update(content).update('\0');
    const fileChapter = Number(file.match(/_(\d+)\.tt$/)?.[1]);
    let chapter = fileChapter;
    let passedJohnSevenLacuna = false;
    for (const record of parseTTChapterSequence(content)) {
      if (gospel === 'john' && fileChapter === 7) {
        if (passedJohnSevenLacuna) chapter = 8;
        else if (record.verse === 53) passedJohnSevenLacuna = true;
      }
      if (record.words.length === 0) continue;
      const verse = record.verse;
      verses.set(`${chapter}:${verse}`, record.words.map((word, index) => ({
        ...word,
        sourceToken: index + 1,
        diplomatic: word.text,
        comparable: comparable(word.text),
        sourceFile: file,
      })));
    }
  }
  return { files, verses, sha256: aggregate.digest('hex') };
}

function loadDisplayed(gospel, chapter, verse) {
  const file = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return data.rows.flatMap((row, rowIndex) => {
    if (row.coptic?.type !== 'text') return [];
    return [{
      rowId: row.id,
      rowIndex,
      text: row.coptic.text,
      comparable: comparable(row.coptic.text),
      draft: row._copticDraft === true,
      hasProvenance: row.coptic.provenance?.sourceToken != null,
    }];
  });
}

function occurrenceMatch(source, displayed) {
  const queues = new Map();
  source.forEach((word, index) => {
    const queue = queues.get(word.comparable) ?? [];
    queue.push(index);
    queues.set(word.comparable, queue);
  });

  const used = new Set();
  const matches = [];
  const unexpected = [];
  for (const item of displayed) {
    const queue = queues.get(item.comparable) ?? [];
    const sourceIndex = queue.shift();
    if (sourceIndex == null) {
      unexpected.push(item);
      continue;
    }
    used.add(sourceIndex);
    matches.push({
      ...item,
      sourceIndex,
      sourceToken: sourceIndex + 1,
      diplomatic: source[sourceIndex].diplomatic,
      exact: item.text.normalize('NFC') === source[sourceIndex].diplomatic.normalize('NFC'),
      sourceFile: source[sourceIndex].sourceFile,
    });
  }

  const missing = source.filter((_, index) => !used.has(index));
  const sourceOrder = matches.map((item) => item.sourceToken);
  let orderBreaks = 0;
  for (let i = 1; i < sourceOrder.length; i++) if (sourceOrder[i] < sourceOrder[i - 1]) orderBreaks++;
  return { matches, missing, unexpected, orderBreaks };
}

const report = {
  status: 'coptic-source-occurrence-audit',
  generatedAt: new Date().toISOString(),
  governingObject: 'Sahidica NT 4.1.0 normalized electronic Sahidic edition',
  scope: 'Matthew, Mark, Luke, and John',
  rules: {
    unit: 'Sahidica norm_group/orig_group word-group',
    equality: 'Unicode NFC exact; Coptic-letter normalization recorded separately',
    rowAuthority: 'Coptic source determines displayed text; other columns guide row location only',
  },
  totals: {
    sourceTokens: 0,
    displayedTokens: 0,
    occurrenceMatches: 0,
    exactDiplomaticMatches: 0,
    normalizedMatches: 0,
    missingSourceTokens: 0,
    unexpectedDisplayedTokens: 0,
    draftPlacements: 0,
    provenancePresent: 0,
    orderBreaks: 0,
  },
  gospels: {},
};

fs.mkdirSync(SHADOW_DIR, { recursive: true });

for (const gospel of GOSPELS) {
  const source = loadSource(gospel);
  const gospelReport = {
    sourceFiles: source.files.length,
    sourceSha256: source.sha256,
    sourceTokens: 0,
    displayedTokens: 0,
    occurrenceMatches: 0,
    exactDiplomaticMatches: 0,
    normalizedMatches: 0,
    missingSourceTokens: 0,
    unexpectedDisplayedTokens: 0,
    draftPlacements: 0,
    provenancePresent: 0,
    orderBreaks: 0,
    verses: {},
  };

  for (const [reference, sourceWords] of source.verses) {
    const [chapter, verse] = reference.split(':').map(Number);
    const displayed = loadDisplayed(gospel, chapter, verse);
    const result = occurrenceMatch(sourceWords, displayed);
    const exact = result.matches.filter((item) => item.exact).length;
    const normalized = result.matches.length - exact;
    const verseReport = {
      sourceTokens: sourceWords.length,
      displayedTokens: displayed.length,
      occurrenceMatches: result.matches.length,
      exactDiplomaticMatches: exact,
      normalizedMatches: normalized,
      missingSourceTokens: result.missing.map((word) => ({ sourceToken: word.sourceToken, diplomatic: word.diplomatic })),
      unexpectedDisplayedTokens: result.unexpected.map((item) => ({ rowId: item.rowId, text: item.text })),
      draftPlacements: displayed.filter((item) => item.draft).length,
      provenancePresent: displayed.filter((item) => item.hasProvenance).length,
      orderBreaks: result.orderBreaks,
      placements: result.matches.map(({ rowId, rowIndex, text, sourceToken, diplomatic, exact: isExact, sourceFile, draft }) => ({
        rowId, rowIndex, text, sourceToken, diplomatic, exact: isExact, sourceFile, draft,
      })),
    };
    gospelReport.verses[reference] = verseReport;
    gospelReport.sourceTokens += sourceWords.length;
    gospelReport.displayedTokens += displayed.length;
    gospelReport.occurrenceMatches += result.matches.length;
    gospelReport.exactDiplomaticMatches += exact;
    gospelReport.normalizedMatches += normalized;
    gospelReport.missingSourceTokens += result.missing.length;
    gospelReport.unexpectedDisplayedTokens += result.unexpected.length;
    gospelReport.draftPlacements += verseReport.draftPlacements;
    gospelReport.provenancePresent += verseReport.provenancePresent;
    gospelReport.orderBreaks += result.orderBreaks;
  }

  report.gospels[gospel] = { ...gospelReport, verses: undefined };
  for (const key of Object.keys(report.totals)) {
    if (typeof report.totals[key] === 'number' && typeof gospelReport[key] === 'number') report.totals[key] += gospelReport[key];
  }
  fs.writeFileSync(path.join(SHADOW_DIR, `${gospel}.json`), JSON.stringify(gospelReport, null, 2) + '\n');
}

report.certificationGate = report.totals.missingSourceTokens === 0 && report.totals.unexpectedDisplayedTokens === 0
  ? (report.totals.provenancePresent === report.totals.sourceTokens
      ? 'source-text and occurrence provenance verified; row-placement certification pending'
      : 'source-complete; occurrence provenance and row-placement certification pending')
  : 'source concordance failed';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'coptic-live-certification.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Sahidic Coptic Live Certification', '',
  `Generated: ${report.generatedAt}`, '',
  `Gate: **${report.certificationGate}**`, '',
  '| Gospel | Source | Displayed | Occurrence matches | Exact | Normalized | Missing | Unexpected | Draft placements | Provenance | Order breaks |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
];
for (const gospel of GOSPELS) {
  const t = report.gospels[gospel];
  lines.push(`| ${gospel} | ${t.sourceTokens} | ${t.displayedTokens} | ${t.occurrenceMatches} | ${t.exactDiplomaticMatches} | ${t.normalizedMatches} | ${t.missingSourceTokens} | ${t.unexpectedDisplayedTokens} | ${t.draftPlacements} | ${t.provenancePresent} | ${t.orderBreaks} |`);
}
const t = report.totals;
lines.push(`| **Total** | **${t.sourceTokens}** | **${t.displayedTokens}** | **${t.occurrenceMatches}** | **${t.exactDiplomaticMatches}** | **${t.normalizedMatches}** | **${t.missingSourceTokens}** | **${t.unexpectedDisplayedTokens}** | **${t.draftPlacements}** | **${t.provenancePresent}** | **${t.orderBreaks}** |`, '',
  'This audit matches repeated forms by occurrence within each verse. It does not treat semantic row displacement as missing source text. Row placement remains a separate certification gate.', '');
fs.writeFileSync(path.join(OUT_DIR, 'coptic-live-certification.md'), lines.join('\n'));
console.log(JSON.stringify({ certificationGate: report.certificationGate, totals: report.totals, gospels: report.gospels }, null, 2));
