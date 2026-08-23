import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const ARROW_RE = /[←→↔↕↑↓⇄⇆⟷⟶⟵↳]/u;
const failures = [];
let verseFiles = 0;
let cellsExamined = 0;

for (const gospel of GOSPELS) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/u.test(name))) {
    const chapterDir = path.join(gospelDir, chapter);
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name))) {
      verseFiles += 1;
      const document = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      for (const row of document.rows) {
        for (const [column, cell] of Object.entries(row)) {
          if (!cell || typeof cell !== 'object' || !('gloss' in cell) || !cell.gloss) continue;
          cellsExamined += 1;
          for (const field of ['gloss', 'tooltip']) {
            const value = cell.gloss[field];
            if (typeof value === 'string' && ARROW_RE.test(value)) {
              failures.push({ gospel, chapter: Number(chapter), verse: Number(filename.slice(0, -5)), rowId: row.id, column, field, value });
            }
          }
        }
      }
    }
  }
}

console.log(JSON.stringify({
  status: failures.length === 0 ? 'CERTIFIED_NO_ALIGNMENT_ARROWS' : 'FAILED',
  verseFiles,
  cellsExamined,
  arrowFields: failures.length,
  failures: failures.slice(0, 20),
}, null, 2));
if (failures.length) process.exitCode = 1;
