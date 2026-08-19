import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(os.tmpdir(), 'urev-drbo-1899-verification');
const input = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'audits', 'vulgate-english-adjudication.json'), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const comparisonForm = (value) => value.normalize('NFC').toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu)?.join(' ') ?? '';
const bookCode = { matthew: 47, mark: 48, luke: 49, john: 50 };

function decodeHtml(value) {
  const text = value.replace(/<[^>]+>/gu, ' ').replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replace(/\s+/gu, ' ').trim();
  return text.split(/\s+\[\d+\]\s+"/u)[0].split(/\s+Gospel According to St /u)[0].trim();
}

function page(gospel, chapter) {
  const file = path.join(CACHE, `${gospel}-${chapter}.html`);
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.length < 1000) throw new Error(`Invalid DRBO verification page: ${file}`);
  const verses = new Map();
  for (const match of raw.matchAll(/<a class=vn[^>]*>\s*&nbsp;(\d+)&nbsp;<\/a>([\s\S]*?)(?=<a class=vn|<\/body>)/gu)) verses.set(Number(match[1]), decodeHtml(match[2]));
  return { verses, pageSha256: sha256(raw) };
}

const pages = new Map();
const decisions = [];
const totals = { inputHeld: input.held.length, eBible1899Confirmed: 0, bibleCorpsWordingConfirmed: 0, exact1899Adjudication: 0, unresolved: 0 };
for (const held of input.held) {
  const match = held.sourceReference.match(/^(\w+)\s+(\d+):(\d+)(?:[–-](\d+))?$/u);
  if (!match) throw new Error(`Unsupported source reference: ${held.sourceReference}`);
  const [, gospel, chapterRaw, startRaw, endRaw] = match;
  const chapter = Number(chapterRaw);
  const key = `${gospel}:${chapter}`;
  if (!pages.has(key)) pages.set(key, page(gospel, chapter));
  const sourcePage = pages.get(key);
  const components = [];
  for (let verse = Number(startRaw); verse <= Number(endRaw ?? startRaw); verse++) components.push(sourcePage.verses.get(verse));
  if (components.some((value) => !value)) throw new Error(`Missing DRBO component for ${held.sourceReference}`);
  const drboEnglish = components.join(' ');
  const form = comparisonForm(drboEnglish);
  let classification;
  let selectedEnglish;
  if (form === comparisonForm(held.english)) {
    classification = 'EBIBLE_1899_CONFIRMED';
    selectedEnglish = held.english;
    totals.eBible1899Confirmed++;
  } else if (form === comparisonForm(held.comparison.bibleCorps1750)) {
    classification = 'BIBLECORPS_WORDING_CONFIRMED_BY_1899';
    selectedEnglish = held.comparison.bibleCorps1750;
    totals.bibleCorpsWordingConfirmed++;
  } else {
    classification = 'EXACT_1899_ADJUDICATION';
    selectedEnglish = drboEnglish;
    totals.exact1899Adjudication++;
  }
  decisions.push({
    sourceReference: held.sourceReference,
    classification,
    selectedEnglish,
    selectedEnglishSha256: sha256(selectedEnglish),
    verification: {
      source: 'DRBO hardcopy-derived 1899 John Murphy edition verification witness',
      url: `https://www.drbo.org/chapter/${bookCode[gospel]}${String(chapter).padStart(3, '0')}.htm`,
      pageSha256: sourcePage.pageSha256,
      comparisonFormSha256: sha256(form),
      transcriptionNotice: 'DRBO reports optical scanning followed by software checks and human spelling review; residual errors remain possible. Used as verification evidence, not bulk corpus input.',
    },
  });
}

const report = {
  status: totals.unresolved ? 'unresolved' : 'all-held-units-edition-specifically-adjudicated',
  generatedAt: new Date().toISOString(),
  method: 'The selected 1899 stream is compared against a separately hardcopy-derived 1899 witness. Only verdicts, hashes, URLs, and selected public-domain wording are retained; DRBO page content is not imported.',
  totals,
  decisions,
};
report.decisionSha256 = sha256(JSON.stringify(decisions));
const output = path.join(ROOT, 'docs', 'audits', 'vulgate-english-held-analysis.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, decisionSha256: report.decisionSha256, output: path.relative(ROOT, output) }, null, 2));
