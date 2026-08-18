import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LEDGER_FILE = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/secondary-source-ledger.json');
const PUBLIC_FILE = path.join(ROOT, 'data/vaticanus-english-exceptions.json');
const OUTPUT_FILE = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/orthographic-classification.json');
const ledger = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
const publicData = JSON.parse(fs.readFileSync(PUBLIC_FILE, 'utf8'));
const plain = (text = '') => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ωϛϲ�]/gu, '');

function distance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return matrix[a.length][b.length];
}

function singleEdit(a, b) {
  if (distance(a, b) !== 1) return null;
  if (a.length === b.length) {
    const index = [...a].findIndex((character, position) => character !== b[position]);
    return { type: 'substitution', position: index + 1, from: a[index], to: b[index] };
  }
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let index = 0;
  while (index < shorter.length && shorter[index] === longer[index]) index++;
  return { type: a.length < b.length ? 'candidate-adds-character' : 'vaticanus-adds-character', position: index + 1, character: longer[index] };
}

const withheld = ledger.decisions.filter((item) => item.secondaryDecision === 'withheld');
const cases = withheld.map((item) => {
  const vaticanus = plain(item.vaticanusGreek);
  const candidate = plain(item.candidate?.greek);
  let workstream, reviewPriority, edit = null;
  if (item.rule === 'VEA-W07-AMBIGUOUS-ANALYSIS') {
    workstream = 'ambiguous-exact-analysis';
    reviewPriority = 4;
  } else if (!candidate) {
    workstream = 'no-tagnt-counterpart';
    reviewPriority = 2;
  } else if (distance(vaticanus, candidate) === 1) {
    workstream = 'single-edit-orthographic-candidate';
    reviewPriority = 1;
    edit = singleEdit(vaticanus, candidate);
  } else {
    workstream = 'multi-edit-or-textual-difference';
    reviewPriority = 3;
  }
  return {
    reference: item.reference,
    rowId: item.rowId,
    vaticanusGreek: item.vaticanusGreek,
    workstream,
    reviewPriority,
    editDistance: candidate ? distance(vaticanus, candidate) : null,
    edit,
    hasReplacementCharacter: item.vaticanusGreek.includes('�'),
    alignedCandidate: item.candidate ? { greek: item.candidate.greek, contextualGloss: item.candidate.contextualGloss, strong: item.candidate.strong, morphology: item.candidate.morphology } : null,
    evidence: item.evidence,
    admissionStatus: 'withheld',
  };
}).sort((a, b) => a.reviewPriority - b.reviewPriority || a.reference.localeCompare(b.reference) || a.rowId.localeCompare(b.rowId));

const counts = Object.fromEntries(Object.entries(Object.groupBy(cases, (item) => item.workstream)).map(([key, values]) => [key, values.length]));
const expected = { 'single-edit-orthographic-candidate': 5, 'no-tagnt-counterpart': 36, 'multi-edit-or-textual-difference': 68, 'ambiguous-exact-analysis': 28 };
const invariantErrors = Object.entries(expected).filter(([key, value]) => counts[key] !== value).map(([key, value]) => `${key}: expected ${value}, found ${counts[key] ?? 0}`);
if (cases.length !== 137) invariantErrors.push(`expected 137 cases, found ${cases.length}`);
const decisionSha256 = crypto.createHash('sha256').update(JSON.stringify(cases)).digest('hex');
const output = {
  status: invariantErrors.length ? 'fail' : 'classified-shadow-only',
  generatedAt: new Date().toISOString(),
  policy: 'Classification identifies the next evidence workflow only. Edit distance is never an admission rule and supplies no English gloss.',
  sourceDecisionSha256: ledger.decisionSha256,
  decisionSha256,
  counts,
  invariantErrors,
  workstreams: {
    'single-edit-orthographic-candidate': 'Test one explicit character difference against a registered historical orthography rule and two independent lemma witnesses.',
    'no-tagnt-counterpart': 'Analyze the Vaticanus form independently; never borrow a neighboring TAGNT gloss.',
    'multi-edit-or-textual-difference': 'Separate inflection, word division, proper names, orthography, and substantive textual variants before lexical admission.',
    'ambiguous-exact-analysis': 'Require an independent tie-breaker or qualified review; retain the blank gloss until resolved.',
  },
  cases,
};
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
publicData.classification = { decisionSha256, counts, policy: output.policy, workstreams: output.workstreams };
for (const item of publicData.cases) {
  const match = cases.find((candidateCase) => candidateCase.reference === `${item.gospel} ${item.chapter}:${item.verse}` && candidateCase.rowId === item.rowId);
  if (!match) throw new Error(`Public exception missing classification: ${item.gospel} ${item.chapter}:${item.verse} ${item.rowId}`);
  item.workstream = match.workstream;
  item.reviewPriority = match.reviewPriority;
  item.editDistance = match.editDistance;
  item.edit = match.edit;
}
fs.writeFileSync(PUBLIC_FILE, `${JSON.stringify(publicData, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, counts, decisionSha256, invariantErrors }, null, 2));
if (invariantErrors.length) process.exitCode = 1;
