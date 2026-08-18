import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const backup = { createdAt: new Date().toISOString(), rule: 'Clear only extant papyrus cells lacking sourceAttestations after the live exact-once source audit passes.', cells: [] };

const completeness = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-live-source-completeness.json'), 'utf8'));
if (completeness.status !== 'live-source-complete' || completeness.totals.missing || completeness.totals.duplicates || completeness.totals.unexpected || completeness.totals.formMismatches) {
  throw new Error('Refusing cleanup: live source completeness is not exact');
}

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => name.endsWith('.json'))) {
      const file = path.join(gospelDir, chapter.name, filename);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      let changed = false;
      for (const row of data.rows ?? []) {
        if (row.papyrus?.type !== 'extant') continue;
        if (row.papyrus.provenance?.sourceAttestations?.length) continue;
        backup.cells.push({ file: path.relative(ROOT, file).replaceAll('\\', '/'), rowId: row.id, papyrus: row.papyrus });
        row.papyrus = { type: 'lost' };
        changed = true;
      }
      if (write && changed) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }
  }
}

let backupPath = null;
if (write) {
  const stamp = backup.createdAt.replaceAll(':', '-').replaceAll('.', '-');
  backupPath = path.join(ROOT, 'docs/audits/papyrus-live-apply-backups', `${stamp}-unproven-cell-cleanup.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
}
console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', cellsCleared: backup.cells.length, backup: backupPath ? path.relative(ROOT, backupPath).replaceAll('\\', '/') : null }, null, 2));
