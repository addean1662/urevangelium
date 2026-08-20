import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const retired = [];

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const file = path.join(ROOT, 'data', gospel, chapter, filename);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      let changed = false;
      for (const [rowIndex, row] of data.rows.entries()) {
        const cell = row.coptic;
        if (!cell?.provenance?.hornerPeerAllocation) continue;
        retired.push({ gospel, chapter, verse: filename.slice(0, -5), rowIndex, rowId: row.id, coptic: cell.text, gloss: cell.gloss, provenance: cell.provenance.hornerPeerAllocation });
        if (APPLY) {
          delete cell.gloss;
          cell.provenance.retiredHornerPeerAllocation = { ...cell.provenance.hornerPeerAllocation, reason: 'SAME_VISUAL_ROW_IS_NOT_A_VALID_SAHIDIC_WORD_ALIGNMENT_RULE' };
          delete cell.provenance.hornerPeerAllocation;
          changed = true;
        }
      }
      if (APPLY && changed) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  }
}

const report = { generatedAt: new Date().toISOString(), applied: APPLY, count: retired.length, reason: 'Same-row comparative agreement can establish context, but cannot establish which Sahidic word-group owns an English word when traditions are not word-aligned.', retired };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-horner-same-row-retirement.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ applied: APPLY, count: retired.length }, null, 2));
