import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHADOW = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/word-division-row-shadow.json');
const OTHER_COLUMNS = ['papyrus', 'coptic', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function otherProjection(rows) { return rows.map(row => Object.fromEntries(OTHER_COLUMNS.map(column => [column, row[column] ?? null]))); }

const shadow = JSON.parse(fs.readFileSync(SHADOW, 'utf8'));
if (!shadow.passed) throw new Error('Refusing to apply a failing word-division shadow');
const applied = [];
for (const plan of shadow.plans.filter(item => item.status === 'architecture-certified')) {
  const [gospel, cv] = plan.reference.split(' ');
  const [chapter, verse] = cv.split(':');
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const live = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (hash(otherProjection(live.rows)) !== hash(otherProjection(plan.proposedRows))) throw new Error(`${plan.reference}: non-Vaticanus projection changed`);
  const sourceCharacters = live.rows.filter(row => row.vaticanus?.type === 'text').map(row => row.vaticanus.text).join('');
  const proposedCharacters = plan.proposedRows.filter(row => row.vaticanus?.type === 'text').map(row => row.vaticanus.text).join('');
  if (sourceCharacters !== proposedCharacters) throw new Error(`${plan.reference}: Vaticanus character projection changed`);
  fs.writeFileSync(file, `${JSON.stringify({ ...live, rows: plan.proposedRows }, null, 2)}\n`);
  applied.push({ reference: plan.reference, rowId: plan.rowId, sourceToken: plan.intfToken, split: plan.split, placements: plan.placement.map(item => item.rowId) });
}
const result = { status: 'applied', sourceShadowDecisionSha256: shadow.decisionSha256, appliedDivisions: applied.length, resultingWords: applied.reduce((sum, item) => sum + item.split.length, 0), applicationSha256: hash(applied), applied };
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-english-shadow/word-division-application.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ...result, applied }, null, 2));
