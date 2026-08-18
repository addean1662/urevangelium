import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-independent-corpus.json'), 'utf8'));
const expected = new Map();
for (const sequence of corpus.sequences) for (const word of sequence.words) {
  expected.set(`${sequence.gospel}:${sequence.reference}:${sequence.siglum}:${word.sourceWord}`, word.diplomatic);
}

const observed = new Map();
const unexpected = [];
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => name.endsWith('.json'))) {
      const verse = path.basename(filename, '.json');
      const data = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter.name, filename), 'utf8'));
      for (const row of data.rows ?? []) {
        if (row.papyrus?.type !== 'extant') continue;
        for (const attestation of row.papyrus.provenance?.sourceAttestations ?? []) {
          const key = `${gospel}:${chapter.name}:${verse}:${attestation.siglum}:${attestation.sourceToken}`;
          const placements = observed.get(key) ?? [];
          placements.push({ rowId: row.id, diplomatic: attestation.diplomatic });
          observed.set(key, placements);
          if (!expected.has(key)) unexpected.push({ key, rowId: row.id, diplomatic: attestation.diplomatic });
        }
      }
    }
  }
}

const missing = [...expected].filter(([key]) => !observed.has(key)).map(([key, diplomatic]) => ({ key, diplomatic }));
const duplicates = [...observed].filter(([, placements]) => placements.length !== 1).map(([key, placements]) => ({ key, placements }));
const formMismatches = [...expected].filter(([key, diplomatic]) => observed.has(key) && observed.get(key)[0]?.diplomatic !== diplomatic).map(([key, diplomatic]) => ({ key, expected: diplomatic, observed: observed.get(key) }));
const report = {
  status: missing.length || duplicates.length || unexpected.length || formMismatches.length ? 'live-source-completeness-failed' : 'live-source-complete',
  generatedAt: new Date().toISOString(),
  invariant: 'Every independent papyrus source coordinate must occur exactly once in live papyrus provenance with its exact diplomatic form.',
  totals: { expectedSourceWords: expected.size, observedSourceCoordinates: observed.size, missing: missing.length, duplicates: duplicates.length, unexpected: unexpected.length, formMismatches: formMismatches.length },
  missing, duplicates, unexpected, formMismatches,
};
const output = path.join(ROOT, 'docs/audits/papyrus-live-source-completeness.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, ...report.totals, output: path.relative(ROOT, output) }, null, 2));
if (report.status !== 'live-source-complete') process.exitCode = 1;
