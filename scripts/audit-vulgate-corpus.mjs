import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const HEADINGS = { Matthew: 'matthew', Mark: 'mark', Luke: 'luke', John: 'john' };

function tokens(value) {
  return value
    .normalize('NFC')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function comparison(value) {
  return value.toLocaleLowerCase('la').replaceAll('j', 'i').replaceAll('v', 'u');
}

function loadSource() {
  const source = Object.fromEntries(GOSPELS.map((gospel) => [gospel, []]));
  let gospel = null;
  for (const line of fs.readFileSync(path.join(DATA, 'sources/vulgate/VulgClementine.txt'), 'utf8').split(/\r?\n/u)) {
    const heading = line.match(/^###\s+(\S+)\s*$/u);
    if (heading) {
      gospel = HEADINGS[heading[1]] ?? null;
      continue;
    }
    const verse = line.match(/^\[(\d+):(\d+)\]\s+(.+)$/u);
    if (!gospel || !verse) continue;
    tokens(verse[3]).forEach((text, index) => source[gospel].push({
      text,
      normalized: comparison(text),
      sourceReference: `${gospel} ${verse[1]}:${verse[2]}`,
      sourceToken: index + 1,
    }));
  }
  return source;
}

function loadDisplay() {
  const display = Object.fromEntries(GOSPELS.map((gospel) => [gospel, []]));
  for (const gospel of GOSPELS) {
    const gospelDir = path.join(DATA, gospel);
    const chapters = fs.readdirSync(gospelDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name))
      .map((entry) => Number(entry.name)).sort((a, b) => a - b);
    for (const chapter of chapters) {
      const chapterDir = path.join(gospelDir, String(chapter));
      const verses = fs.readdirSync(chapterDir)
        .filter((name) => /^\d+\.json$/u.test(name))
        .map((name) => Number.parseInt(name, 10)).sort((a, b) => a - b);
      for (const verse of verses) {
        const document = JSON.parse(fs.readFileSync(path.join(chapterDir, `${verse}.json`), 'utf8'));
        document.rows.forEach((row, rowIndex) => {
          if (row.vulgate?.type !== 'text') return;
          tokens(row.vulgate.text).forEach((text, cellToken) => display[gospel].push({
            text,
            normalized: comparison(text),
            displayReference: `${gospel} ${chapter}:${verse}`,
            rowId: row.id,
            rowIndex,
            cellToken: cellToken + 1,
          }));
        });
      }
    }
  }
  return display;
}

function frequencies(sequence) {
  const result = new Map();
  sequence.forEach(({ normalized }) => result.set(normalized, (result.get(normalized) ?? 0) + 1));
  return result;
}

function summarize(source, display) {
  let prefix = 0;
  while (prefix < source.length && prefix < display.length && source[prefix].normalized === display[prefix].normalized) prefix += 1;
  const sourceCounts = frequencies(source);
  const displayCounts = frequencies(display);
  let common = 0;
  for (const [word, count] of sourceCounts) common += Math.min(count, displayCounts.get(word) ?? 0);
  return {
    sourceTokens: source.length,
    displayedTokens: display.length,
    tokenCountDelta: display.length - source.length,
    exactOrderedPrefix: prefix,
    multisetCommon: common,
    sourceOccurrencesMissing: source.length - common,
    displayedOccurrencesUnsupported: display.length - common,
    firstSourceAtDivergence: source[prefix] ?? null,
    firstDisplayAtDivergence: display[prefix] ?? null,
  };
}

const source = loadSource();
const display = loadDisplay();
const report = {
  generatedAt: new Date().toISOString(),
  source: 'data/sources/vulgate/VulgClementine.txt',
  comparisonNormalization: ['Unicode NFC', 'lowercase', 'j→i', 'v→u', 'punctuation removed'],
  gospels: Object.fromEntries(GOSPELS.map((gospel) => [gospel, summarize(source[gospel], display[gospel])])),
};
report.totals = summarize(GOSPELS.flatMap((gospel) => source[gospel]), GOSPELS.flatMap((gospel) => display[gospel]));

const output = path.join(ROOT, 'docs/audits/vulgate-corpus-audit.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
