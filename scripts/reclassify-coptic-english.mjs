import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const removed = [];
const totals = { copticTextCells: 0, lexicalAidRetained: 0, publishedTranslationRetained: 0, removedFromTranslationLayer: 0, alreadyBlank: 0, errors: 0 };

for (const gospel of GOSPELS) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const file = path.join(gospelDir, chapter, filename);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      let changed = false;
      for (const row of data.rows) {
        const cell = row.coptic;
        if (cell?.type !== 'text') continue;
        totals.copticTextCells++;
        if (!cell.gloss) { totals.alreadyBlank++; continue; }
        if (cell.gloss.source === 'Crum') { totals.lexicalAidRetained++; continue; }
        if (cell.gloss.source === 'Horner') { totals.publishedTranslationRetained++; continue; }
        removed.push({ gospel, reference: `${chapter}:${filename.slice(0, -5)}`, rowId: row.id, coptic: cell.text, provenance: cell.provenance ?? null, formerGloss: cell.gloss, classification: cell.gloss.source === 'TAGNT' ? 'cross-tradition-alignment-evidence' : 'computed-annotation-evidence', reason: 'Not attributable to a published Sahidic translation' });
        delete cell.gloss;
        if (cell.provenance?.englishCertification) delete cell.provenance.englishCertification;
        totals.removedFromTranslationLayer++;
        changed = true;
      }
      if (APPLY && changed) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  }
}

const evidenceSha256 = crypto.createHash('sha256').update(JSON.stringify(removed)).digest('hex');
const report = { status: APPLY ? 'applied' : 'dry-run', generatedAt: new Date().toISOString(), policy: 'Only a declared published Sahidic translator may populate the translation layer. Crum/KELLIA remains visible solely as lexical aid.', totals, evidenceSha256, removedEvidence: removed };
if (APPLY) fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-english-reclassification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals, evidenceSha256 }, null, 2));
if (totals.errors) process.exitCode = 1;
