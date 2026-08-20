import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const inputFile = path.join(ROOT, 'docs', 'audits', 'vulgate-lexical-row-adjudication.json');
const outputFile = path.join(ROOT, 'docs', 'audits', 'vulgate-corpus-consensus.json');
const source = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (value) => value.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
  .replaceAll('æ', 'ae').replaceAll('œ', 'oe').replaceAll('j', 'i').replace(/[^\p{L}\p{N}]+/gu, '');
const counts = new Map();

for (const unit of source.units) for (const row of unit.rows) {
  if (row.action !== 'display' || !row.anchorEnglish) continue;
  if (!row.evidence?.some((code) => [
    'MONOTONIC_LEXICAL_OWNER', 'UNIQUE_LOCAL_TRANSPOSITION_OWNER',
    'UNIQUE_VERSE_TRANSPOSITION_OWNER', 'EQUIVALENT_OCCURRENCE_ORDER_OWNER',
  ].includes(code))) continue;
  if (!row.evidence?.some((code) => [
    'LEXICON_CONTEXT_CANDIDATE', 'EXACT_SURFACE_CONTEXT_CANDIDATE',
    'PROPER_NAME_ORTHOGRAPHIC_CANDIDATE',
  ].includes(code))) continue;
  const latin = normalize(row.latin);
  const english = normalize(row.anchorEnglish);
  if (!latin || !english) continue;
  const record = counts.get(latin) ?? { total: 0, english: new Map(), examples: [] };
  record.total += 1;
  record.english.set(english, (record.english.get(english) ?? 0) + 1);
  if (record.examples.length < 5) record.examples.push(`${unit.sourceReference}: ${row.latin} -> ${row.anchorEnglish}`);
  counts.set(latin, record);
}

const entries = {};
for (const [latin, record] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
  const ranked = [...record.english].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [english, count] = ranked[0] ?? [];
  if (!english || count < 5 || count / record.total < 0.8) continue;
  entries[latin] = { english, count, total: record.total, dominance: count / record.total, examples: record.examples };
}

const payload = {
  status: 'derived-douay-corpus-consensus-candidates-only',
  generatedAt: new Date().toISOString(),
  inputAdjudicationSha256: source.adjudicationSha256,
  rules: [
    'Consensus never authors English; it reuses an English anchor already printed by the admitted Douay-Rheims source.',
    'Only previously admitted lexical owners contribute evidence.',
    'Admission requires at least five occurrences and at least 80 percent dominance for the exact normalized Latin surface.',
    'Consensus supplies candidates only; downstream verse-local adjudication still fails closed.',
  ],
  totals: { observedLatinForms: counts.size, admittedConsensusForms: Object.keys(entries).length },
  entries,
};
payload.consensusSha256 = sha256(JSON.stringify(payload));
fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ ...payload.totals, consensusSha256: payload.consensusSha256, output: path.relative(ROOT, outputFile) }, null, 2));
