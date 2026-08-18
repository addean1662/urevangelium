import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LEDGER_FILE = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/generated-consensus-ledger.json');
const PUBLIC_FILE = path.join(ROOT, 'data/vaticanus-english-exceptions.json');
const ledger = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
const previous = JSON.parse(fs.readFileSync(PUBLIC_FILE, 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const certified = new Map(ledger.decisions.filter((item) => item.status === 'certified-generated').map((item) => [`${item.reference}|${item.rowId}`, item]));
if (certified.size !== ledger.totals['certified-generated']) throw new Error('Certified decision count is inconsistent');

const before = [];
const after = [];
let applied = 0;
let refreshed = 0;
for (const decision of certified.values()) {
  const [, gospel, chapter, verse] = decision.reference.match(/^(\w+) (\d+):(\d+)$/) ?? [];
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = data.rows.find((item) => item.id === decision.rowId);
  if (row?.vaticanus?.type !== 'text') throw new Error(`Missing Vaticanus text cell: ${decision.reference} ${decision.rowId}`);
  if (row.vaticanus.gloss && row.vaticanus.gloss.generated !== true) throw new Error(`Refusing to overwrite non-generated English: ${decision.reference} ${decision.rowId}`);
  const wasGenerated = row.vaticanus.gloss?.generated === true;
  const invariant = { id: row.id, vaticanusText: row.vaticanus.text, vaticanusType: row.vaticanus.type, otherColumns: Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'vaticanus')) };
  before.push(invariant);
  row.vaticanus.gloss = {
    gloss: decision.proposedGloss,
    source: 'System',
    deviation: true,
    generated: true,
    tooltip: `Certified system-generated lexical English · ${decision.rule} · evidence dossier ${ledger.decisionSha256.slice(0, 12)}`,
  };
  row.vaticanus.provenance = {
    ...row.vaticanus.provenance,
    englishCertification: {
      status: 'internally-certified-generated',
      rule: decision.rule,
      decisionSha256: ledger.decisionSha256,
      evidenceFamilies: decision.independentFamilies,
      parallelGreekMatches: decision.evidence.parallelGreekMatches,
      noCrossColumnEnglish: true,
    },
  };
  after.push({ id: row.id, vaticanusText: row.vaticanus.text, vaticanusType: row.vaticanus.type, otherColumns: Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'vaticanus')) });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  if (wasGenerated) refreshed++;
  else applied++;
}

// Manuscript-state labels describe the governing Vaticanus transcription; they do not supply English.
const manuscriptStatuses = [
  { reference: 'luke 11:9', rowId: 'v03-intf-42-11-9-5', status: 'scribal-error-question' },
  { reference: 'matthew 13:24', rowId: 'r3', status: 'damaged' },
  { reference: 'matthew 27:45', rowId: 'r11', status: 'damaged' },
];
for (const adjudication of manuscriptStatuses) {
  const [, gospel, chapter, verse] = adjudication.reference.match(/^(\w+) (\d+):(\d+)$/) ?? [];
  const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = data.rows.find((item) => item.id === adjudication.rowId);
  if (row?.vaticanus?.type !== 'text') throw new Error(`Missing status target: ${adjudication.reference} ${adjudication.rowId}`);
  row.vaticanus.manuscriptStatus = adjudication.status;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

if (hash(before) !== hash(after)) throw new Error('Greek text, row identity, or another column changed');
const remainingKeys = new Set(ledger.decisions.filter((item) => item.status !== 'certified-generated').map((item) => `${item.reference}|${item.rowId}`));
const remaining = previous.cases.filter((item) => remainingKeys.has(`${item.gospel} ${item.chapter}:${item.verse}|${item.rowId}`));
if (remaining.length !== remainingKeys.size) throw new Error(`Public exception accounting failed: ${remaining.length} != ${remainingKeys.size}`);
const counts = remaining.reduce((out, item) => { out[item.workstream] = (out[item.workstream] ?? 0) + 1; return out; }, {});
const publicData = {
  ...previous,
  generatedAt: new Date().toISOString(),
  decisionSha256: ledger.decisionSha256,
  certified: 63409 + certified.size,
  unresolved: remaining.length,
  cases: remaining,
  classification: { ...previous.classification, counts },
};
fs.writeFileSync(PUBLIC_FILE, `${JSON.stringify(publicData, null, 2)}\n`);
const report = { status: 'applied', applied, refreshed, remaining: remaining.length, totalCertified: publicData.certified, total: publicData.total, decisionSha256: ledger.decisionSha256, invariantSha256: hash(after) };
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-english-shadow/generated-live-application.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
