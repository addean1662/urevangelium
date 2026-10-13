import fs from 'node:fs';
import path from 'node:path';
import { papyrusEnglish } from '../lib/alignment/papyrusPresentation.ts';

const report = { scope: 'Saved Gospel papyrus cells; display eligibility, not independent translation or image certification.', byBook: {}, totals: {}, remaining: [] };
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const counts = report.byBook[gospel] = { displayed: 0, storedGloss: 0, proposedReadingEnglish: 0, incompleteWithoutMatchingEnglish: 0, completeWithoutMatchingEnglish: 0 };
  for (const chapter of fs.readdirSync(`data/${gospel}`).filter(n => /^\d+$/.test(n))) {
    for (const filename of fs.readdirSync(`data/${gospel}/${chapter}`).filter(n => /^\d+\.json$/.test(n))) {
      const data = JSON.parse(fs.readFileSync(path.join('data', gospel, chapter, filename), 'utf8'));
      for (const row of data.rows) {
        const cell = row.papyrus;
        if (cell?.type !== 'extant') continue;
        counts.displayed++;
        const gloss = papyrusEnglish(cell);
        if (gloss?.proposedReading) counts.proposedReadingEnglish++;
        else if (gloss) counts.storedGloss++;
        else {
          counts[cell.condition?.partial ? 'incompleteWithoutMatchingEnglish' : 'completeWithoutMatchingEnglish']++;
          report.remaining.push({ reference: `${gospel} ${chapter}:${data.verse}`, rowId: row.id, text: cell.text, witness: cell.provenance?.governingSiglum, partial: Boolean(cell.condition?.partial), reason: cell.provenance?.archivalGloss?.gloss ? 'Stored English does not meet the matching-reading display checks.' : 'No stored English gloss.' });
        }
      }
    }
  }
  for (const [key, value] of Object.entries(counts)) report.totals[key] = (report.totals[key] ?? 0) + value;
}
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, remaining: `${report.remaining.length} occurrences; pass an output path for the full ledger.` }, null, 2));
