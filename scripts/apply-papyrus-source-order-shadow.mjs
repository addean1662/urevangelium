import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const gospel = process.argv.find((arg) => arg.startsWith('--gospel='))?.split('=')[1];
const write = process.argv.includes('--write');
const allowed = new Set(['matthew', 'mark', 'luke', 'john']);
if (!allowed.has(gospel)) throw new Error('Use --gospel=matthew|mark|luke|john');

const shadowPath = path.join(ROOT, 'docs/audits/papyrus-source-order-shadow', `${gospel}.json`);
const shadow = JSON.parse(fs.readFileSync(shadowPath, 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const withoutPapyrus = (rows) => rows.map(({ papyrus: _papyrus, ...row }) => row);
const backup = {
  createdAt: new Date().toISOString(),
  gospel,
  source: path.relative(ROOT, shadowPath).replaceAll('\\', '/'),
  verses: [],
};
let rowsApplied = 0;

for (const entry of shadow.verses) {
  const [chapter, verse] = entry.reference.split(':');
  const livePath = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const proposedById = new Map(entry.proposedRows.map((row) => [row.id, row.papyrus]));
  const beforeOther = hash(withoutPapyrus(live.rows));
  const prior = [];

  for (const evidence of entry.evidence) {
    const matches = live.rows.filter((row) => row.id === evidence.rowId);
    if (matches.length !== 1) throw new Error(`${gospel} ${entry.reference} ${evidence.rowId}: expected exactly one live row`);
    const proposed = proposedById.get(evidence.rowId);
    if (!proposed) throw new Error(`${gospel} ${entry.reference} ${evidence.rowId}: missing proposed papyrus cell`);
    prior.push({ rowId: evidence.rowId, papyrus: matches[0].papyrus });
    matches[0].papyrus = proposed;
    rowsApplied++;
  }

  if (hash(withoutPapyrus(live.rows)) !== beforeOther) throw new Error(`${gospel} ${entry.reference}: non-papyrus mutation`);
  backup.verses.push({ reference: entry.reference, file: path.relative(ROOT, livePath).replaceAll('\\', '/'), prior });
  if (write) fs.writeFileSync(livePath, `${JSON.stringify(live, null, 2)}\n`);
}

const stamp = backup.createdAt.replaceAll(':', '-').replaceAll('.', '-');
const backupPath = path.join(ROOT, 'docs/audits/papyrus-live-apply-backups', `${stamp}-${gospel}.json`);
if (write) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
}
console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', gospel, verses: backup.verses.length, rowsApplied, backup: write ? path.relative(ROOT, backupPath).replaceAll('\\', '/') : null }, null, 2));
