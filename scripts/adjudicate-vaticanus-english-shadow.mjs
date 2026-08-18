import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOOKS = { matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn' };
const AUDIT_DIR = path.join(ROOT, 'docs/audits/vaticanus-english-shadow');
const OUTPUT = path.join(AUDIT_DIR, 'adjudication-ledger.json');
const TAGNT_FILE = path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt');
const TBESG_FILE = path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt');

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function norm(text = '') {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
  const nominaSacra = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
    // ΠΡΣ can also be nominative; only its exact genitive comparison is
    // admitted here. A nominative candidate cannot match this form silently.
    πρσ: 'πατροσ', πρα: 'πατερα', πρι: 'πατρι', πρε: 'πατερ',
  };
  return nominaSacra[value] ?? value;
}
function loadTagnt() {
  const verses = new Map();
  for (const line of fs.readFileSync(TAGNT_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][a-z]+)\.(\d+)\.(\d+)#(\d+)=/);
    if (!match) continue;
    const cols = line.split('\t');
    const strongs = (cols[3]?.split('=')[0].match(/G\d{4}/g) || []);
    const entry = {
      reference: `${match[1]}.${match[2]}.${match[3]}`, position: Number(match[4]),
      greek: (cols[1] || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/[.,;·!?]+$/, '').trim(),
      contextualGloss: (cols[2] || '').trim(), strong: strongs.at(-1) || '',
      morphology: cols[3]?.split('=').slice(1).join('=') || '',
    };
    if (!verses.has(entry.reference)) verses.set(entry.reference, []);
    verses.get(entry.reference).push(entry);
  }
  return verses;
}
function loadTbesg() {
  const entries = new Map();
  for (const line of fs.readFileSync(TBESG_FILE, 'utf8').split(/\r?\n/)) {
    if (!/^G\d{4}/.test(line)) continue;
    const cols = line.split('\t');
    const key = cols[0]?.match(/^G\d{4}/)?.[0];
    if (key && !entries.has(key)) entries.set(key, { lemma: cols[3]?.trim() || '', gloss: cols[6]?.trim() || '' });
  }
  return entries;
}
function commonPrefixLength(a, b) {
  let index = 0;
  while (index < Math.min(a.length, b.length) && a[index] === b[index]) index++;
  return index;
}
function classifyDifference(source, candidate) {
  const left = norm(source);
  const right = norm(candidate);
  if (left.startsWith(right) || right.startsWith(left)) return 'surface-prefix-or-elision-difference';
  const prefix = commonPrefixLength(left, right);
  if (prefix >= Math.max(2, Math.min(left.length, right.length) - 2)) return 'surface-ending-difference';
  return 'surface-internal-difference';
}

const tagnt = loadTagnt();
const tbesg = loadTbesg();
const decisions = [];
const totals = { previouslyCertifiable: 0, admittedExactTransposition: 0, unresolvedSourceOnly: 0, unresolvedTextualDifference: 0, invariantErrors: 0 };
const classifications = {};
function countClassification(value) { classifications[value] = (classifications[value] || 0) + 1; return value; }

for (const [gospel, tagntBook] of Object.entries(BOOKS)) {
  const audit = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, `${gospel}.json`), 'utf8'));
  for (const verse of audit.verses) {
    const [, chapter, verseNumber] = verse.reference.match(/^(?:\w+) (\d+):(\d+)$/) || [];
    const candidates = tagnt.get(`${tagntBook}.${chapter}.${verseNumber}`) || [];
    const usedPositions = new Set(verse.proposed.filter(item => item.status.startsWith('certifiable-')).map(item => item.alignment.tagntPosition));
    totals.previouslyCertifiable += usedPositions.size;
    const unresolved = verse.proposed.filter(item => item.status === 'withheld-alignment');
    const sourceCounts = new Map();
    const candidateCounts = new Map();
    for (const item of unresolved) sourceCounts.set(norm(item.greek), (sourceCounts.get(norm(item.greek)) || 0) + 1);
    for (const candidate of candidates.filter(item => !usedPositions.has(item.position))) candidateCounts.set(norm(candidate.greek), (candidateCounts.get(norm(candidate.greek)) || 0) + 1);

    for (const item of unresolved) {
      const normalized = norm(item.greek);
      const matches = candidates.filter(candidate => !usedPositions.has(candidate.position) && norm(candidate.greek) === normalized);
      if (item.operation.type === 'source-only' && sourceCounts.get(normalized) === 1 && candidateCounts.get(normalized) === 1 && matches.length === 1) {
        const candidate = matches[0];
        const lexicon = candidate.strong ? tbesg.get(candidate.strong) : null;
        if (candidate.contextualGloss && lexicon?.gloss) {
          usedPositions.add(candidate.position);
          totals.admittedExactTransposition++;
          decisions.push({ reference: verse.reference, rowId: item.rowId, vaticanusGreek: item.greek, decision: 'certified', rule: 'VEA-001-UNIQUE-EXACT-TRANSPOSITION', rationale: 'Unique otherwise-unused TAGNT word in the verse has the identical declared comparison form; only sequence position differs.', proposedGloss: candidate.contextualGloss, evidence: { tagntPosition: candidate.position, tagntGreek: candidate.greek, strong: candidate.strong, morphology: candidate.morphology, tbesgLemma: lexicon.lemma, tbesgGloss: lexicon.gloss } });
          continue;
        }
      }
      const textualDifference = item.operation.type === 'ambiguous';
      if (textualDifference) totals.unresolvedTextualDifference++; else totals.unresolvedSourceOnly++;
      const classification = textualDifference
        ? classifyDifference(item.greek, item.tagntCandidate?.greek || '')
        : matches.length > 1 || sourceCounts.get(normalized) > 1
          ? 'repeated-or-nonunique-exact-form'
          : 'no-exact-tagnt-counterpart';
      decisions.push({ reference: verse.reference, rowId: item.rowId, vaticanusGreek: item.greek, decision: 'withheld', rule: textualDifference ? 'VEA-W02-TEXTUAL-DIFFERENCE' : 'VEA-W01-NO-UNIQUE-EXACT-COUNTERPART', classification: countClassification(classification), rationale: textualDifference ? 'The aligned TAGNT form is textually different; similarity alone cannot certify its gloss for Vaticanus.' : 'No unique, otherwise-unused TAGNT word has the identical declared comparison form in this verse.', candidate: item.tagntCandidate || null });
    }
  }
}

const inputWithheld = decisions.length;
const resolved = totals.admittedExactTransposition;
if (resolved + totals.unresolvedSourceOnly + totals.unresolvedTextualDifference !== inputWithheld) totals.invariantErrors++;
const output = {
  status: 'shadow-only', generatedAt: new Date().toISOString(),
  policy: 'Vaticanus remains governing; only explicitly identified deterministic rules may admit an English annotation.',
  sourceHashes: { tagntSha256: sha256(TAGNT_FILE), tbesgSha256: sha256(TBESG_FILE) },
  rules: {
    'VEA-001-UNIQUE-EXACT-TRANSPOSITION': 'Admit only a one-to-one identical normalized form among unused words in the same verse, with TAGNT contextual gloss and a resolving TBESG entry.',
    'VEA-W01-NO-UNIQUE-EXACT-COUNTERPART': 'Withhold where no unique identical unused TAGNT counterpart exists.',
    'VEA-W02-TEXTUAL-DIFFERENCE': 'Withhold a similar but non-identical form pending independent lexical adjudication.',
  },
  totals: { inputWithheld, ...totals, totalCertifiableAfterAdjudication: totals.previouslyCertifiable + resolved, unresolvedClassifications: classifications },
  passed: totals.invariantErrors === 0,
  decisionSha256: crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex'),
  decisions,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), ...output.totals, passed: output.passed }, null, 2));
process.exitCode = output.passed ? 0 : 2;
