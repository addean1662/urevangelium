import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLASSIFICATION = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vaticanus-english-shadow/orthographic-classification.json'), 'utf8'));
const OUTPUT = path.join(ROOT, 'data/sources/greek-shared/perseus-morpheus/vaticanus-exceptions.json');
const ENDPOINT = 'https://morph.perseids.org/analysis/word';
const ENGINE_REVISION = 'ab6898ffed335fc6169fa02c9940657a9b5a78e0';
const words = [...new Set(CLASSIFICATION.cases.flatMap((item) => [item.vaticanusGreek, item.alignedCandidate?.greek]).filter(Boolean))];

function entries(response) {
  const value = response?.RDF?.Annotation?.Body?.rest?.entry;
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

async function acquire(word) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('lang', 'grc');
  url.searchParams.set('engine', 'morpheusgrc');
  url.searchParams.set('word', word);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Urevangelium-source-audit/1.0' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      return { word, url: url.toString(), raw, analyses: entries(raw).length, sha256: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex') };
    } catch (error) {
      lastError = String(error);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return { word, url: url.toString(), error: lastError, analyses: 0 };
}

const results = [];
for (let index = 0; index < words.length; index += 6) results.push(...await Promise.all(words.slice(index, index + 6).map(acquire)));
const failures = results.filter((item) => item.error);
const output = {
  generatedAt: new Date().toISOString(),
  service: ENDPOINT,
  engine: 'Perseids Morpheus Greek',
  engineRevision: ENGINE_REVISION,
  classificationSha256: CLASSIFICATION.decisionSha256,
  requestedWords: words.length,
  recognizedWords: results.filter((item) => item.analyses > 0).length,
  failures: failures.map((item) => ({ word: item.word, error: item.error })),
  results,
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ requestedWords: output.requestedWords, recognizedWords: output.recognizedWords, failures: output.failures.length, output: path.relative(ROOT, OUTPUT) }, null, 2));
if (failures.length) process.exitCode = 1;
