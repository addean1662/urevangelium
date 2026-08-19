import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-system.json'), 'utf8'));
const decisions = new Map();
for (const gospel of GOSPELS) {
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-system', `${gospel}.json`), 'utf8'));
  for (const item of ledger.decisions) decisions.set(item.coordinate, item);
}
const errors = []; let checked = 0;
for (const gospel of GOSPELS) for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((x) => /^\d+$/.test(x))) for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((x) => /^\d+\.json$/.test(x))) {
  const verse = filename.slice(0, -5); const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
  for (const row of data.rows) { const cell = row.coptic; if (cell?.type !== 'text') continue; checked++;
    const key = `${gospel}.${chapter}.${verse}.${cell.provenance?.sourceToken}`; const item = decisions.get(key);
    if (!item) { errors.push(`${key}: no system decision`); continue; }
    if (item.coptic !== cell.text || item.rowId !== row.id) errors.push(`${key}: ledger/live coordinate mismatch`);
    const layer = item.decision.layer;
    if (layer === 'published-translation' && cell.gloss?.source !== 'Horner') errors.push(`${key}: admitted translation not displayed as Horner`);
    if (layer === 'lexical-aid' && cell.gloss?.source !== 'Crum') errors.push(`${key}: admitted lexical aid not displayed as Crum/KELLIA`);
    if (layer === 'scholarly-automatic-annotation' && (cell.gloss?.source !== 'Scriptorium' || cell.gloss.automaticAnnotation !== true)) errors.push(`${key}: automatic identity lacks its scholarly source or annotation-status marker`);
    if (layer === 'none' && cell.gloss) errors.push(`${key}: withheld evidence leaked into English display`);
    if (cell.gloss && !['Horner', 'Crum', 'Scriptorium'].includes(cell.gloss.source)) errors.push(`${key}: prohibited Sahidic English source ${cell.gloss.source}`);
  }
}
if (checked !== 48275) errors.push(`Expected 48,275 live Coptic cells, checked ${checked}`);
const ledgerHash = crypto.createHash('sha256').update(GOSPELS.map((g) => fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-system', `${g}.json`))).join('\0')).digest('hex');
if (report.decisionLedgerSha256 !== ledgerHash) errors.push('Decision ledger aggregate hash mismatch');
console.log(JSON.stringify({ status: errors.length ? 'failed' : 'passed', checked, decisions: decisions.size, errors: errors.slice(0, 100), totalErrors: errors.length }, null, 2));
if (errors.length) process.exitCode = 1;
