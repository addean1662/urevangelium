import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MORPHEUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/perseus-morpheus/vaticanus-exceptions.json'), 'utf8'));
const CLASSIFICATION = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vaticanus-english-shadow/orthographic-classification.json'), 'utf8'));
const TBESG = fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt'), 'utf8');
const REVISION = '758b7e08c4c3f68e386882307691500cf553570e';
const BASE = `https://raw.githubusercontent.com/gcelano/LSJ_GreekUnicode/${REVISION}`;
const LETTER_FILES = { α: 1, β: 2, γ: 3, δ: 4, ε: 5, ζ: 7, η: 8, θ: 9, ι: 10, κ: 11, λ: 12, μ: 13, ν: 14, ξ: 15, ο: 16, π: 17, ρ: 19, σ: 21, τ: 22, υ: 23, φ: 24, χ: 25, ψ: 26, ω: 27 };
const normalize = (text = '') => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/\d+$/u, '').replace(/[^α-ωϛϲ]/gu, '');

function morpheusEntries(result) {
  const value = result.raw?.RDF?.Annotation?.Body?.rest?.entry;
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

function tbesgLemma(strong) {
  if (!strong) return null;
  const match = TBESG.match(new RegExp(`^${strong}\\t([^\\n]+)`, 'm'));
  return match?.[1]?.split('\t')?.[3] ?? null;
}

const headwords = [...new Set([
  ...MORPHEUS.results.flatMap((result) => morpheusEntries(result).map((entry) => entry.dict?.hdwd?.['$'])),
  ...CLASSIFICATION.cases.map((item) => tbesgLemma(item.alignedCandidate?.strong)),
].filter(Boolean))];
const targets = new Map();
for (const headword of headwords) {
  const key = normalize(headword);
  if (!targets.has(key)) targets.set(key, []);
  targets.get(key).push(headword);
}
const files = [...new Set([...targets.keys()].map((key) => LETTER_FILES[key[0]]).filter(Boolean))].sort((a, b) => a - b);

async function acquire(number) {
  const filename = `grc.lsj.perseus-eng${number}.xml`;
  const url = `${BASE}/${filename}`;
  const response = await fetch(url, { headers: { 'user-agent': 'Urevangelium-source-audit/1.0' }, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const xml = buffer.toString('utf8');
  const entries = [];
  const pattern = /<entryFree\b[^>]*\bkey="([^"]+)"[^>]*>[\s\S]*?<\/entryFree>/gu;
  for (const match of xml.matchAll(pattern)) {
    const normalizedKey = normalize(match[1]);
    if (!targets.has(normalizedKey)) continue;
    entries.push({ key: match[1], normalizedKey, morpheusHeadwords: targets.get(normalizedKey), xml: match[0], entrySha256: crypto.createHash('sha256').update(match[0]).digest('hex') });
  }
  return { filename, url, byteLength: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), entries };
}

const sources = [];
for (let index = 0; index < files.length; index += 3) sources.push(...await Promise.all(files.slice(index, index + 3).map(acquire)));
const entries = sources.flatMap((source) => source.entries.map((entry) => ({ ...entry, sourceFile: source.filename, sourceSha256: source.sha256 })));
const matched = new Set(entries.map((entry) => entry.normalizedKey));
const unmatched = [...targets.entries()].filter(([key]) => !matched.has(key)).map(([normalizedKey, forms]) => ({ normalizedKey, forms }));
const output = {
  generatedAt: new Date().toISOString(),
  source: 'Liddell–Scott–Jones, A Greek-English Lexicon (1940), Perseus machine-readable text',
  revision: REVISION,
  license: 'Perseus CC BY-SA 3.0 unless otherwise indicated',
  morpheusSourceSha256: crypto.createHash('sha256').update(JSON.stringify(MORPHEUS)).digest('hex'),
  classificationSha256: CLASSIFICATION.decisionSha256,
  tbesgSha256: crypto.createHash('sha256').update(TBESG).digest('hex'),
  requestedHeadwords: headwords.length,
  matchedHeadwords: matched.size,
  unmatched,
  sources: sources.map(({ entries: ignored, ...source }) => ({ ...source, extractedEntries: sources.find((item) => item.filename === source.filename)?.entries.length ?? 0 })),
  entries,
};
const outputFile = path.join(ROOT, 'data/sources/greek-shared/perseus-lsj/vaticanus-exception-entries.json');
fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ requestedHeadwords: output.requestedHeadwords, matchedHeadwords: output.matchedHeadwords, unmatched: output.unmatched.length, sourceFiles: sources.length, extractedEntries: entries.length, output: path.relative(ROOT, outputFile) }, null, 2));
