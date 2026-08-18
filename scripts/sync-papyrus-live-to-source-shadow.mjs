import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const backup = { createdAt: new Date().toISOString(), rule: 'Clear live papyrus cells absent from the canonical complete source shadow; never alter other columns.', cells: [] };

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-shadow', `${gospel}.json`), 'utf8'));
  for (const verse of shadow.verses) {
    const [chapter, number] = verse.reference.split(':');
    const file = path.join(ROOT, 'data', gospel, chapter, `${number}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const canonical = new Set(verse.evidence.map((item) => item.rowId));
    let changed = false;
    for (const row of data.rows ?? []) {
      if (row.papyrus?.type !== 'extant' || canonical.has(row.id)) continue;
      backup.cells.push({ file: path.relative(ROOT, file).replaceAll('\\', '/'), rowId: row.id, papyrus: row.papyrus });
      row.papyrus = { type: 'lost' };
      changed = true;
    }
    if (write && changed) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }
}

let backupPath = null;
if (write && backup.cells.length) {
  const stamp = backup.createdAt.replaceAll(':', '-').replaceAll('.', '-');
  backupPath = path.join(ROOT, 'docs/audits/papyrus-live-apply-backups', `${stamp}-canonical-shadow-sync.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
}
console.log(JSON.stringify({ status: write ? 'applied' : 'read-only', noncanonicalCellsCleared: backup.cells.length, backup: backupPath ? path.relative(ROOT, backupPath).replaceAll('\\', '/') : null }, null, 2));
