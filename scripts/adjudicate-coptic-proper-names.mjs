import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const all = GOSPELS.flatMap((gospel) => {
  const file = path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).decisions.map((item) => ({ gospel, ...item }));
});

const EnglishByLemma = new Map();
for (const item of all.filter((candidate) => candidate.pos === 'NPROP' && candidate.currentEnglish)) {
  const values = EnglishByLemma.get(item.lemma) ?? new Set();
  values.add(item.currentEnglish.trim());
  EnglishByLemma.set(item.lemma, values);
}

const decisions = [];
for (const item of all.filter((candidate) => candidate.pos === 'NPROP' && !candidate.cclCandidate && !candidate.currentEnglish)) {
  const peers = [...(EnglishByLemma.get(item.lemma) ?? [])];
  const exactIdentityAgreement = item.identity && peers.length === 1 && peers[0].toLocaleLowerCase('en') === item.identity.trim().toLocaleLowerCase('en');
  decisions.push({
    gospel: item.gospel,
    reference: item.reference,
    rowId: item.rowId,
    sourceToken: item.sourceToken,
    coptic: item.coptic,
    lemma: item.lemma,
    scriptoriumIdentity: item.identity,
    sameLemmaEnglishCandidates: peers,
    status: exactIdentityAgreement ? 'certified-generated' : 'withheld',
    rule: exactIdentityAgreement
      ? 'CPN-001-EXACT-SCRIPTORIUM-IDENTITY-AND-UNANIMOUS-SAME-LEMMA-PEER'
      : !item.identity ? 'CPN-W01-NO-SCRIPTORIUM-IDENTITY'
        : peers.length !== 1 ? 'CPN-W02-NO-UNANIMOUS-SAME-LEMMA-PEER'
          : 'CPN-W03-IDENTITY-PEER-DISAGREEMENT',
    proposedGloss: exactIdentityAgreement ? peers[0] : null,
  });
}

const totals = {
  reviewedBlankProperNames: decisions.length,
  certifiedGenerated: decisions.filter((item) => item.status === 'certified-generated').length,
  withheld: decisions.filter((item) => item.status === 'withheld').length,
};
const decisionSha256 = crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex');
const report = {
  status: 'shadow-only',
  generatedAt: new Date().toISOString(),
  policy: 'No neighboring tradition supplies English. A proper-name output is admitted only when SCRIPTORIUM directly identifies the entity and every already-published occurrence of the identical SCRIPTORIUM lemma in the Sahidic column has one identical English form.',
  sources: ['Sahidica NT 4.1.0 / Coptic SCRIPTORIUM entity identity', 'already-published Sahidic same-lemma English only'],
  rule: 'CPN-001-EXACT-SCRIPTORIUM-IDENTITY-AND-UNANIMOUS-SAME-LEMMA-PEER',
  totals,
  decisionSha256,
  decisions,
};
const out = path.join(ROOT, 'docs/audits/coptic-english-shadow/proper-name-adjudication.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals, decisionSha256 }, null, 2));
