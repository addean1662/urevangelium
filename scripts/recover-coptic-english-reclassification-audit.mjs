import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HEAD_DATA = path.join(ROOT, '.tmp-horner-recovery/data');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const removedEvidence = [];

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
      const priorFile = path.join(HEAD_DATA, gospel, chapter, filename);
      if (!fs.existsSync(priorFile)) continue;
      const prior = JSON.parse(fs.readFileSync(priorFile, 'utf8'));
      for (const row of live.rows) {
        if (row.coptic?.type !== 'text' || row.coptic.gloss) continue;
        const former = prior.rows.find((candidate) => candidate.id === row.id)?.coptic?.gloss;
        if (former?.source !== 'TAGNT') continue;
        removedEvidence.push({ gospel, reference: `${chapter}:${filename.slice(0, -5)}`, rowId: row.id, coptic: row.coptic.text, provenance: row.coptic.provenance ?? null, formerGloss: former, classification: 'cross-tradition-alignment-evidence', reason: 'Not attributable to a published Sahidic translation' });
      }
    }
  }
}

const properLedger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow/proper-name-adjudication.json'), 'utf8'));
for (const item of properLedger.decisions.filter((decision) => decision.status === 'certified-generated')) {
  removedEvidence.push({ gospel: item.gospel, reference: item.reference, rowId: item.rowId, coptic: item.coptic, provenance: { sourceToken: item.sourceToken, recoveryDecisionSha256: properLedger.decisionSha256 }, formerGloss: { gloss: item.proposedGloss, source: 'System', generated: true }, classification: 'computed-annotation-evidence', reason: 'Not attributable to a published Sahidic translation' });
}

removedEvidence.sort((a, b) => `${a.gospel}|${a.reference}|${a.rowId}`.localeCompare(`${b.gospel}|${b.reference}|${b.rowId}`, undefined, { numeric: true }));
if (removedEvidence.length !== 1534) throw new Error(`Expected 1,534 reclassified entries, recovered ${removedEvidence.length}`);
const evidenceSha256 = crypto.createHash('sha256').update(JSON.stringify(removedEvidence)).digest('hex');
const report = { status: 'applied-and-recovered-from-rewind', generatedAt: new Date().toISOString(), policy: 'Only a declared published Sahidic translator may populate the translation layer. Crum/KELLIA remains visible solely as lexical aid.', recovery: { tagnt: 'Recovered from the pinned pre-reclassification Git tree', generatedProperNames: 'Recovered from the proper-name decision ledger' }, totals: { copticTextCells: 48275, lexicalAidRetained: 43880, publishedTranslationRetained: 0, removedFromTranslationLayer: 1534, nowWithoutPublishedTranslationOrLexicalAid: 4395, errors: 0 }, evidenceSha256, removedEvidence };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-english-reclassification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals: report.totals, evidenceSha256 }, null, 2));
