import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const columns = ['vaticanus', 'sinaiticus', 'byzantine', 'bezae', 'vulgate', 'peshitta', 'coptic'];
const backup = { createdAt: new Date().toISOString(), rule: 'Remove only obsolete pap-unharm rows after all source coordinates have been relocated and the row is empty in every tradition.', rows: [] };

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => name.endsWith('.json'))) {
      const file = path.join(gospelDir, chapter.name, filename);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const retained = [];
      let changed = false;
      for (const row of data.rows ?? []) {
        if (!row.id.startsWith('pap-unharm-')) { retained.push(row); continue; }
        const safe = row.papyrus?.type === 'lost' && columns.every((column) => ['empty', 'omitted'].includes(row[column]?.type));
        if (!safe) { retained.push(row); continue; }
        backup.rows.push({ file: path.relative(ROOT, file).replaceAll('\\', '/'), row });
        changed = true;
      }
      if (write && changed) {
        data.rows = retained;
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
      }
    }
  }
}
let backupPath = null;
if (write && backup.rows.length) {
  const stamp = backup.createdAt.replaceAll(':', '-').replaceAll('.', '-');
  backupPath = path.join(ROOT, 'docs/audits/papyrus-live-apply-backups', `${stamp}-empty-unharmonized-row-removal.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
}
console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', emptyRowsRemoved: backup.rows.length, backup: backupPath ? path.relative(ROOT, backupPath).replaceAll('\\', '/') : null }, null, 2));
