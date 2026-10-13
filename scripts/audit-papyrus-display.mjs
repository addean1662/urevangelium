// Audit display annotations without changing papyrus text, glosses or provenance.
import fs from 'node:fs';
import path from 'node:path';
import { papyrusCharacters, papyrusConflictNotes } from '../lib/alignment/papyrusPresentation.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const report = {
  scope: 'Character annotation fidelity to the admitted CNTR projection, not manuscript-image certification.',
  notationAuthority: 'https://greekcntr.org/resources/technical.pdf#page=13',
  externalComparison: 'https://greeknewtestament.net/mt1-4',
  glossRule: 'A matching stored gloss is retained only for a governing reading with no missing letters. Damaged traces alone do not suppress it. Partial readings with missing letters have no whole-word gloss. This is a display policy, not a claim of unambiguous ink.',
  verses: 0, extantCells: 0, annotatedCells: 0, fallbackCells: 0, damagedCharacters: 0, missingMarkers: 0, expandedGlyphs: 0,
  matthew14: [], failures: [],
};
const conflicts = read('data/verse-verification/matthew.json').verses['1:4'].sources.papyrus.conflicts;
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const base = path.join(root, 'data', gospel);
  for (const chapter of fs.readdirSync(base).filter(n => /^\d+$/.test(n))) for (const file of fs.readdirSync(path.join(base, chapter)).filter(n => /^\d+\.json$/.test(n))) {
    const data = read(`data/${gospel}/${chapter}/${file}`), before = JSON.stringify(data);
    for (const row of data.rows) {
      const cell = row.papyrus;
      if (cell?.type !== 'extant') continue;
      report.extantCells++;
      const characters = papyrusCharacters(cell);
      if (!characters) report.fallbackCells++;
      else {
        report.annotatedCells++;
        if (characters.map(c => c.text).join('') !== cell.text) report.failures.push({ gospel, chapter, file, row: row.id, issue: 'Display text changed' });
        report.damagedCharacters += characters.filter(c => c.state === 'damaged').length;
        report.missingMarkers += characters.filter(c => c.state === 'missing').length;
        report.expandedGlyphs += characters.filter(c => c.sourceGlyph).length;
      }
      if (gospel === 'matthew' && chapter === '1' && file === '4.json') report.matthew14.push({ row: row.id, display: cell.text,
        gloss: cell.gloss?.gloss ?? null, characters, conflicts: papyrusConflictNotes(cell, conflicts) });
    }
    if (JSON.stringify(data) !== before) report.failures.push({ gospel, chapter, file, issue: 'Input mutated' });
    report.verses++;
  }
}
fs.writeFileSync(path.join(root, 'docs/audits/verse-review/source-checks/papyrus-character-display.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, matthew14: report.matthew14.map(({ characters, ...record }) => record) }, null, 2));
if (report.failures.length) process.exitCode = 1;
