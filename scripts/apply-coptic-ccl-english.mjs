import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const APPLY = process.argv.includes('--apply');
const totals = { eligible: 0, changed: 0, alreadyExact: 0, replacedTagnt: 0, filledBlank: 0, replacedOther: 0, errors: 0 };
const errors = [];

for (const gospel of GOSPELS) {
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`), 'utf8'));
  const byReference = new Map();
  for (const decision of shadow.decisions.filter((item) => ['exact-scriptorium-lemma', 'declared-bound-form-normalization'].includes(item.matchMethod))) {
    const list = byReference.get(decision.reference) ?? [];
    list.push(decision);
    byReference.set(decision.reference, list);
  }
  for (const [reference, decisions] of byReference) {
    const [chapter, verse] = reference.split(':');
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changedFile = false;
    for (const decision of decisions) {
      totals.eligible++;
      const row = data.rows.find((candidate) => candidate.id === decision.rowId);
      const cell = row?.coptic;
      if (cell?.type !== 'text' || cell.text !== decision.coptic || cell.provenance?.sourceToken !== decision.sourceToken) {
        totals.errors++;
        errors.push({ gospel, reference, rowId: decision.rowId, reason: 'Live source coordinate no longer matches shadow' });
        continue;
      }
      const current = cell.gloss;
      if (current?.gloss === decision.cclCandidate && current.source === 'Crum' && cell.provenance?.englishCertification?.status === 'lexical-range-certified') {
        totals.alreadyExact++;
        continue;
      }
      if (!current?.gloss) totals.filledBlank++;
      else if (current.source === 'TAGNT') totals.replacedTagnt++;
      else totals.replacedOther++;
      cell.gloss = {
        gloss: decision.cclCandidate,
        source: 'Crum',
        tooltip: `KELLIA CCL v1.2 · ${decision.lemma} · ${decision.cclCandidate}`,
      };
      cell.provenance.englishCertification = {
        status: 'lexical-range-certified',
        rule: decision.matchMethod === 'exact-scriptorium-lemma' ? 'exact-scriptorium-lemma-to-ccl' : 'reversible-bound-form-normalization-to-ccl',
        lemma: decision.lemma,
        partOfSpeech: decision.pos,
        lexicalSource: 'KELLIA Comprehensive Coptic Lexicon v1.2',
        lexicalSourceDate: '2020-07-16',
        doi: '10.17169/refubium-27566',
        license: 'CC BY-SA 4.0',
        sourceXmlSha256: 'df955699223d9c91aae671cfcdfeaca5a16e0812e35bbe91ff142c3fd639775d',
        derivedLookupSha256: '078b2c54392d45dddb9823ddb632943d6fb4597e141e58d1f660023eb7d95790',
        scope: 'documented lexical range; contextual sense not independently selected',
      };
      totals.changed++;
      changedFile = true;
    }
    if (APPLY && changedFile) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
}

const report = { status: APPLY ? 'applied' : 'dry-run', generatedAt: new Date().toISOString(), totals, errors };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-ccl-english-application.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(totals, null, 2));
if (totals.errors) process.exitCode = 1;
