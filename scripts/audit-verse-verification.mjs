// Exercise the exact page verifier across the corpus without changing verse data.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildStreamModel } from '../lib/alignment/streams.ts';
import { streamFingerprintInput } from '../lib/alignment/streamFingerprint.mjs';
import { verifyVerse } from '../lib/verification/verifyVerse.ts';
const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const report = { scope: 'Read-only page-checker regression. Machine comparison is not scholarly, semantic, or image certification.', verses: 0, columns: {}, differences: [], examples: [] };
for (const book of ['matthew', 'mark', 'luke', 'john']) {
  const expectations = read(`data/verse-verification/${book}.json`).verses;
  const links = read(`data/alignment-streams/${book}.json`).verses;
  for (const [ref, expected] of Object.entries(expectations)) {
    const [chapter, verse] = ref.split(':');
    const data = read(`data/${book}/${chapter}/${verse}.json`);
    const saved = links[ref];
    const digest = createHash('sha256').update(streamFingerprintInput(data)).digest('hex');
    const evidence = saved?.fingerprint === digest ? saved : undefined;
    const result = verifyVerse(data, buildStreamModel(data, evidence), expected);
    report.verses++;
    for (const column of result.columns) {
      const counts = report.columns[column.column] ??= {};
      for (const criterion of ['source', 'order', 'english', 'placement', 'evidence']) {
        const tally = counts[criterion] ??= {};
        tally[column[criterion].status] = (tally[column[criterion].status] ?? 0) + 1;
      }
      if ([column.source, column.order, column.english].some(c => c.status === 'difference')) report.differences.push({ reference: result.reference, ...column });
    }
    if ((book === 'matthew' && /^1:[1234]$/u.test(ref)) || (book === 'mark' && ref === '1:1')) report.examples.push(result);
  }
}
fs.writeFileSync(path.join(root, 'docs/audits/verse-review/source-checks/page-verification-regression.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ verses: report.verses, columns: report.columns, differenceSlots: report.differences.length }, null, 2));
