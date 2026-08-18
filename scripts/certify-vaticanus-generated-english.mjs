import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vaticanus-english-shadow/generated-consensus-ledger.json'), 'utf8'));
const publicExceptions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vaticanus-english-exceptions.json'), 'utf8'));
const certified = new Map(ledger.decisions.filter((item) => item.status === 'certified-generated').map((item) => [`${item.reference}|${item.rowId}`, item]));
const remaining = new Set(ledger.decisions.filter((item) => item.status !== 'certified-generated').map((item) => `${item.reference}|${item.rowId}`));
const failures = [];
let generated = 0;
let blankRemaining = 0;

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const verse = Number.parseInt(filename);
      const data = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter, filename), 'utf8'));
      for (const row of data.rows) {
        if (row.vaticanus?.type !== 'text') continue;
        const key = `${gospel} ${chapter}:${verse}|${row.id}`;
        if (certified.has(key)) {
          generated++;
          const decision = certified.get(key);
          if (row.vaticanus.gloss?.gloss !== decision.proposedGloss) failures.push(`${key}: generated gloss differs from ledger`);
          if (row.vaticanus.gloss?.source !== 'System' || row.vaticanus.gloss?.generated !== true) failures.push(`${key}: generated provenance/display flag missing`);
          if (row.vaticanus.provenance?.englishCertification?.noCrossColumnEnglish !== true) failures.push(`${key}: no-cross-column-English invariant missing`);
          if (row.vaticanus.provenance?.englishCertification?.decisionSha256 !== ledger.decisionSha256) failures.push(`${key}: decision hash mismatch`);
        } else if (remaining.has(key)) {
          if (row.vaticanus.gloss) failures.push(`${key}: unresolved/provisional gloss must remain blank`);
          else blankRemaining++;
        }
      }
    }
  }
}

if (generated !== certified.size) failures.push(`generated accounting: ${generated} != ${certified.size}`);
if (blankRemaining !== remaining.size) failures.push(`remaining accounting: ${blankRemaining} != ${remaining.size}`);
if (publicExceptions.certified !== 63409 + certified.size || publicExceptions.unresolved !== remaining.size) failures.push('public exception totals disagree with the ledger');
const report = { status: failures.length ? 'fail' : 'certified-for-release', generatedAt: new Date().toISOString(), policy: ledger.policy, totals: { generated, blankRemaining, totalEnglishCertified: publicExceptions.certified, totalLexicalWords: publicExceptions.total }, decisionSha256: ledger.decisionSha256, failures };
fs.writeFileSync(path.join(ROOT, 'docs/audits/vaticanus-generated-english-certification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
