import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
let reverted = 0;
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const file = path.join(ROOT, 'data', gospel, chapter, filename);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      let changed = false;
      for (const row of data.rows) {
        const repair = row.coptic?.provenance?.sourceTokenIdentityRepair;
        if (!repair) continue;
        row.coptic.provenance.sourceToken = repair.previousSourceToken;
        delete row.coptic.provenance.sourceTokenIdentityRepair;
        reverted += 1;
        changed = true;
      }
      if (changed) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  }
}
console.log(JSON.stringify({ reverted }, null, 2));
