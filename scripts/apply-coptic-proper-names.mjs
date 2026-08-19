import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const ledgerFile = path.join(ROOT, 'docs/audits/coptic-english-shadow/proper-name-adjudication.json');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const decisions = ledger.decisions.filter((item) => item.status === 'certified-generated');
const totals = { eligible: decisions.length, changed: 0, alreadyApplied: 0, errors: 0 };
const errors = [];

for (const decision of decisions) {
  const [chapter, verse] = decision.reference.split(':');
  const file = path.join(ROOT, 'data', decision.gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = data.rows.find((candidate) => candidate.id === decision.rowId);
  const cell = row?.coptic;
  if (cell?.type !== 'text' || cell.text !== decision.coptic || cell.provenance?.sourceToken !== decision.sourceToken) {
    totals.errors++;
    errors.push({ ...decision, reason: 'Live source coordinate no longer matches decision ledger' });
    continue;
  }
  if (cell.gloss?.generated === true && cell.gloss.gloss === decision.proposedGloss && cell.provenance?.englishCertification?.decisionSha256 === ledger.decisionSha256) {
    totals.alreadyApplied++;
    continue;
  }
  if (cell.gloss?.gloss) {
    totals.errors++;
    errors.push({ ...decision, reason: 'Refusing to overwrite existing English' });
    continue;
  }
  cell.gloss = {
    gloss: decision.proposedGloss,
    source: 'System',
    generated: true,
    tooltip: `Urevangelium proper-name result · SCRIPTORIUM identity: ${decision.scriptoriumIdentity}`,
  };
  cell.provenance.englishCertification = {
    status: 'internally-certified-generated',
    rule: decision.rule,
    scriptoriumIdentity: decision.scriptoriumIdentity,
    lemma: decision.lemma,
    decisionSha256: ledger.decisionSha256,
    scope: 'proper-name English only; exact source identity and unanimous same-lemma Sahidic peer agreement',
  };
  totals.changed++;
  if (APPLY) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const report = { status: APPLY ? 'applied' : 'dry-run', generatedAt: new Date().toISOString(), decisionSha256: ledger.decisionSha256, totals, errors };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-proper-name-application.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(totals, null, 2));
if (totals.errors) process.exitCode = 1;
