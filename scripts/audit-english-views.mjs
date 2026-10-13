// Display conservation audit only; it makes no semantic or manuscript-image certification.
import fs from 'node:fs';
import path from 'node:path';
import { buildStreamModel } from '../lib/alignment/streams.ts';
import { buildEnglishView, englishPlacementPacket } from '../lib/alignment/englishPresentation.ts';
import { validatePlacementProposal } from '../lib/verification/placementProposal.ts';
const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const reviews = read('data/english-groups/reviewed.json');
const report = { scope: 'English character and occurrence conservation, source immutability, and review binding. Semantic placement and manuscript images are not certified.', verses: 0, columns: {}, failures: [] };
for (const book of ['matthew', 'mark', 'luke', 'john']) {
  const expected = read(`data/verse-verification/${book}.json`).verses;
  const evidence = read(`data/alignment-streams/${book}.json`).verses;
  for (const [reference, expectation] of Object.entries(expected)) {
    const [chapter, verse] = reference.split(':');
    const data = read(`data/${book}/${chapter}/${verse}.json`), before = JSON.stringify(data);
    const model = buildStreamModel(data, evidence[reference]);
    for (const [column, unit] of Object.entries(expectation.english)) {
      if (!unit?.english) continue;
      const stats = report.columns[column] ??= { units: 0, occurrences: 0, grouped: 0, awaitingAlignment: 0, unitsWithGroupingIssues: 0, appliedReviews: 0 };
      const stream = model.columns[column], review = reviews[model.reference]?.[column];
      const validated = review ? validatePlacementProposal(englishPlacementPacket(model.reference, stream, unit, expectation.sources[column].authority), review, 'follow-source') : { errors: [] };
      if (validated.errors.length) report.failures.push({ reference: model.reference, column, errors: validated.errors });
      const view = buildEnglishView(model.reference, stream, unit, validated.proposal);
      const displayed = [...Object.values(view.groups).flat(), ...view.unassigned];
      const actualBank = view.occurrences.map(o => o.text).join('');
      const intact = actualBank === unit.english && new Set(displayed).size === displayed.length
        && displayed.length === view.occurrences.length && view.occurrences.every(o => displayed.includes(o.id))
        && Object.keys(view.groups).every(id => stream.words.some(w => w.id === id));
      if (!intact) report.failures.push({ reference: model.reference, column, errors: ['Display lost, duplicated or changed an English occurrence.'] });
      stats.units++; stats.occurrences += view.occurrences.length;
      stats.grouped += view.occurrences.length - view.unassigned.length; stats.awaitingAlignment += view.unassigned.length;
      stats.unitsWithGroupingIssues += view.issues.length > 0 ? 1 : 0; stats.appliedReviews += view.review ? 1 : 0;
    }
    if (JSON.stringify(data) !== before) report.failures.push({ reference: model.reference, errors: ['Corpus data mutated.'] });
    report.verses++;
  }
}
const file = path.join(root, 'docs/audits/verse-review/source-checks/english-view-regression.json');
fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
