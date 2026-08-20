import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const WITNESSES = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const core = (value) => normalize(value).replace(/^(?:and|of|to|the|in|from|by|for)\s+/u, '').trim();
const metadataWords = new Set(['and', 'of', 'the', 'saint', 'son', 'mother', 'father', 'brother', 'sister', 'apostle', 'baptist', 'great', 'less', 'river', 'kingdom', 'tribe', 'roman', 'united', 'monarchy', 'biblical', 'figure', 'character', 'demons']);
const candidates = (value) => String(value ?? '').replace(/\s*\([^)]*\)/g, '').split(/[^\p{L}\p{N}]+/u).map((part) => part.trim()).filter((part) => part && !metadataWords.has(normalize(part)));
const cleanLexical = (value) => String(value ?? '').replace(/\s*\(.*/s, '').replace(/^\s*\([^)]*\)\s*/u, '').trim();
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

const shadows = new Map();
const admittedByLemma = new Map();
const ledgers = new Map();
for (const gospel of GOSPELS) {
  const shadow = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`), 'utf8'));
  for (const item of shadow.decisions) shadows.set(`${gospel}|${item.reference}|${item.rowId}|${item.sourceToken}`, item);
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-english-system', `${gospel}.json`), 'utf8'));
  ledgers.set(gospel, ledger);
  for (const item of ledger.decisions) {
    if (!item.decision.output) continue;
    const shadowItem = shadows.get(`${gospel}|${item.reference}|${item.rowId}|${item.sourceToken}`);
    if (!shadowItem?.lemma) continue;
    const record = admittedByLemma.get(shadowItem.lemma) ?? { outputs: new Map(), occurrences: 0 };
    const output = item.decision.output;
    record.outputs.set(output, (record.outputs.get(output) ?? 0) + 1);
    record.occurrences++;
    admittedByLemma.set(shadowItem.lemma, record);
  }
}

const counts = {};
const decisions = [];
const bump = (key) => { counts[key] = (counts[key] ?? 0) + 1; return key; };

for (const gospel of GOSPELS) {
  for (const item of ledgers.get(gospel).decisions) {
    if (item.decision.layer !== 'none') continue;
    const shadow = shadows.get(`${gospel}|${item.reference}|${item.rowId}|${item.sourceToken}`) ?? {};
    const [chapter, verse] = item.reference.split(':');
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, `${verse}.json`), 'utf8'));
    const rowIndex = data.rows.findIndex((row) => row.id === item.rowId);
    const sourceCandidates = item.decision.sourceValue ? candidates(item.decision.sourceValue) : [];
    const candidateEvidence = sourceCandidates.map((candidate) => {
      const offsets = [];
      for (let index = 0; index < data.rows.length; index++) {
        for (const witness of WITNESSES) {
          const english = data.rows[index]?.[witness]?.gloss?.gloss;
          if (english && english !== '↳' && core(english) === normalize(candidate)) offsets.push({ witness, offset: index - rowIndex, rowId: data.rows[index].id });
        }
      }
      const within = (distance) => [...new Set(offsets.filter((entry) => Math.abs(entry.offset) <= distance).map((entry) => entry.witness))];
      return { candidate, offsets, exactWitnesses: within(0), withinTwoWitnesses: within(2), withinFourWitnesses: within(4), verseWitnesses: [...new Set(offsets.map((entry) => entry.witness))] };
    });
    const atDistance = (field, minimum) => candidateEvidence.filter((candidate) => candidate[field].length >= minimum);
    const exact = atDistance('exactWitnesses', 1);
    const withinTwo = atDistance('withinTwoWitnesses', 2);
    const withinFour = atDistance('withinFourWitnesses', 2);
    const inVerse = atDistance('verseWitnesses', 2);
    const lemmaRecord = admittedByLemma.get(shadow.lemma);
    const unanimousLemmaOutput = lemmaRecord?.outputs.size === 1 ? [...lemmaRecord.outputs.keys()][0] : null;
    const lemmaExactWitnesses = unanimousLemmaOutput
      ? WITNESSES.filter((witness) => core(data.rows[rowIndex]?.[witness]?.gloss?.gloss) === normalize(unanimousLemmaOutput))
      : [];
    const lemmaWithinTwoWitnesses = unanimousLemmaOutput
      ? WITNESSES.filter((witness) => data.rows.slice(Math.max(0, rowIndex - 2), rowIndex + 3).some((contextRow) => core(contextRow[witness]?.gloss?.gloss) === normalize(unanimousLemmaOutput)))
      : [];
    const lexicalCandidate = item.decision.rule === 'CSE-W301-SURFACE-ONLY-LEXICON-MATCH' ? cleanLexical(item.decision.sourceValue) : null;
    const lexicalPeerSupport = lexicalCandidate
      ? WITNESSES.filter((witness) => core(data.rows[rowIndex]?.[witness]?.gloss?.gloss) === normalize(lexicalCandidate))
      : [];

    let classification;
    let proposedOutput = null;
    if (exact.length === 1) { classification = bump('RECOVER_EXACT_ROW_CONTEXT'); proposedOutput = exact[0].candidate; }
    else if (withinTwo.length === 1) { classification = bump('RECOVER_TWO_ROW_CONTEXT'); proposedOutput = withinTwo[0].candidate; }
    else if (unanimousLemmaOutput && lemmaExactWitnesses.length > 0) { classification = bump('RECOVER_UNANIMOUS_LEMMA_EXACT_CONTEXT'); proposedOutput = unanimousLemmaOutput; }
    else if (unanimousLemmaOutput && lemmaWithinTwoWitnesses.length >= 2) { classification = bump('RECOVER_UNANIMOUS_LEMMA_TWO_ROW_CONTEXT'); proposedOutput = unanimousLemmaOutput; }
    else if (withinFour.length === 1) { classification = bump('REVIEW_FOUR_ROW_CONTEXT'); proposedOutput = withinFour[0].candidate; }
    else if (inVerse.length === 1) { classification = bump('REVIEW_VERSE_CONTEXT'); proposedOutput = inVerse[0].candidate; }
    else if (lexicalCandidate && lexicalPeerSupport.length > 0) { classification = bump('RECOVER_SURFACE_LEXICON_WITH_EXACT_CONTEXT'); proposedOutput = lexicalCandidate; }
    else if (unanimousLemmaOutput) { classification = bump('REVIEW_UNANIMOUS_SAME_LEMMA'); proposedOutput = unanimousLemmaOutput; }
    else if (candidateEvidence.length) classification = bump(candidateEvidence.some((candidate) => candidate.offsets.length) ? 'AMBIGUOUS_COMPARATIVE_CONTEXT' : 'NO_COMPARATIVE_CONTEXT_SUPPORT');
    else if (lemmaRecord?.outputs.size > 1) classification = bump('MULTIPLE_SAME_LEMMA_OUTPUTS');
    else classification = bump('NO_EXISTING_ENGLISH_EVIDENCE');

    decisions.push({ gospel, reference: item.reference, rowId: item.rowId, sourceToken: item.sourceToken, coptic: item.coptic, lemma: shadow.lemma ?? null, pos: shadow.pos ?? null, language: shadow.language ?? null, priorRule: item.decision.rule, sourceValue: item.decision.sourceValue ?? null, classification, proposedOutput, candidateEvidence, lexicalPeerSupport, lemmaExactWitnesses, lemmaWithinTwoWitnesses, sameLemmaEvidence: lemmaRecord ? { outputs: Object.fromEntries(lemmaRecord.outputs), occurrences: lemmaRecord.occurrences } : null });
  }
}

const report = { status: 'troubleshooting-shadow-only', generatedAt: new Date().toISOString(), total: decisions.length, counts, decisions };
report.decisionSha256 = sha(JSON.stringify(decisions));
const output = path.join(ROOT, 'docs/audits/coptic-contextual-english-gap-troubleshooting.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, total: report.total, counts, decisionSha256: report.decisionSha256, output: path.relative(ROOT, output) }, null, 2));
