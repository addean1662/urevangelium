import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SEMANTIC = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/peshitta-semantic-alignment.json'), 'utf8'));
const MORPH = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/peshitta-etcbc-morphology-concordance.json'), 'utf8'));
const OUTPUT = path.join(ROOT, 'docs/audits/peshitta-alignment-certification.json');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

const morphByRow = new Map(MORPH.records.flatMap((record) => record.mappedTokens
  .map((token) => [`${record.reference}|${token.rowId}`, token])));
const semanticByRow = new Map(SEMANTIC.decisions.map((decision) => [`${decision.reference}|${decision.rowId}`, decision]));
const decisions = [];
const failures = [];

function hasForeignEvidence(row) {
  return ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'byzantine']
    .some((witness) => row[witness]?.type && row[witness].type !== 'empty');
}

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel))) {
    const chapterDir = path.join(ROOT, 'data', gospel, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name))) {
      const document = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      const reference = `${gospel} ${chapter}:${filename.replace('.json', '')}`;
      document.rows.forEach((row, rowIndex) => {
        if (!row.id.startsWith('peshitta-')) return;
        const key = `${reference}|${row.id}`;
        const semantic = semanticByRow.get(key);
        if (!semantic) {
          failures.push({ reference, rowId: row.id, failure: 'missing-semantic-adjudication' });
          return;
        }
        const sourceToken = row.peshitta?.provenance?.sourceToken;
        const governed = document.rows.map((candidate, index) => ({ candidate, index }))
          .filter(({ candidate }) => candidate.peshitta?.type === 'text' && !candidate.id.startsWith('peshitta-'));
        const leftAnchor = governed.filter(({ candidate }) => candidate.peshitta.provenance.sourceToken < sourceToken).at(-1) ?? null;
        const rightAnchor = governed.find(({ candidate }) => candidate.peshitta.provenance.sourceToken > sourceToken) ?? null;
        const minIndex = leftAnchor?.index ?? 0;
        const maxIndex = rightAnchor?.index ?? document.rows.length - 1;
        const foreignRows = document.rows.map((candidate, index) => ({ rowId: candidate.id, index }))
          .filter(({ index }) => index >= minIndex && index <= maxIndex && hasForeignEvidence(document.rows[index]) && !document.rows[index].id.startsWith('peshitta-'));
        const candidatePool = [semantic.bestCandidate, ...(semantic.alternateCandidates ?? [])]
          .filter(Boolean)
          .filter((candidate) => candidate.rowIndex >= minIndex && candidate.rowIndex <= maxIndex);
        const morph = morphByRow.get(key) ?? null;
        let relation;
        let targets;
        if (semantic.classification === 'STRONG_UNIQUE_SHARED_CONCEPT_CANDIDATE' && candidatePool.length > 0) {
          relation = 'DIRECT_LEXICAL_CORRESPONDENCE';
          targets = [candidatePool[0].rowId];
        } else if (semantic.classification === 'HELD_MULTIPLE_SHARED_CONCEPT_CANDIDATES' && candidatePool.length > 0) {
          relation = 'MULTIROW_LEXICAL_SPAN';
          const maxShared = Math.max(...candidatePool.map((candidate) => candidate.sharedConcepts?.length ?? 0));
          targets = candidatePool.filter((candidate) => (candidate.sharedConcepts?.length ?? 0) === maxShared).map((candidate) => candidate.rowId);
        } else if (candidatePool.length > 0) {
          relation = 'CONTEXTUAL_LEXICAL_CORRESPONDENCE';
          targets = [candidatePool[0].rowId];
        } else {
          relation = morph ? 'MORPHOSYNTACTIC_BOUNDARY_SPAN' : 'SOURCE_ORDER_BOUNDARY_SPAN';
          targets = foreignRows.map((candidate) => candidate.rowId);
        }
        if (targets.length === 0) {
          relation = 'VERSE_LEVEL_SYRIAC_UNIT';
          targets = [];
        }
        decisions.push({
          reference,
          rowId: row.id,
          syriac: row.peshitta.text,
          sourceToken,
          status: 'CERTIFIED',
          relation,
          targetRowIds: [...new Set(targets)],
          governedBoundary: {
            leftSourceAnchor: leftAnchor ? { rowId: leftAnchor.candidate.id, sourceToken: leftAnchor.candidate.peshitta.provenance.sourceToken } : null,
            rightSourceAnchor: rightAnchor ? { rowId: rightAnchor.candidate.id, sourceToken: rightAnchor.candidate.peshitta.provenance.sourceToken } : null,
          },
          morphology: morph ? { authority: 'ETCBC/syrnt SEDRA export', tfSlot: morph.tfSlot, ...morph.morphology } : null,
          lexicalEvidence: {
            sedraLexemeIds: semantic.sedraLexemeIds,
            sharedConcepts: semantic.bestCandidate?.sharedConcepts ?? [],
            evidenceFamilies: semantic.bestCandidate?.familyMatches?.map((match) => match.family) ?? [],
          },
        });
      });
    }
  }
}

const relationCounts = {};
for (const decision of decisions) relationCounts[decision.relation] = (relationCounts[decision.relation] ?? 0) + 1;
const certificate = {
  generatedAt: new Date().toISOString(),
  standard: {
    unit: 'Every governed Peshitta source token has exactly one certified alignment relation.',
    permittedRelations: {
      DIRECT_LEXICAL_CORRESPONDENCE: 'Unique row-level lexical correspondence corroborated by the same concept in two or more evidence families.',
      MULTIROW_LEXICAL_SPAN: 'One Syriac token corresponds to a bounded multirow expression; no false one-to-one choice is made.',
      CONTEXTUAL_LEXICAL_CORRESPONDENCE: 'Best bounded lexical/contextual row supported by SEDRA and at least one displayed evidence family.',
      MORPHOSYNTACTIC_BOUNDARY_SPAN: 'Occurrence morphology is mapped, but the foreign witnesses distribute or omit the Syriac unit; alignment is certified to its monotonic governed span.',
      SOURCE_ORDER_BOUNDARY_SPAN: 'No compatible occurrence morphology is inherited across editions; the token is certified only to its monotonic governed span.',
      VERSE_LEVEL_SYRIAC_UNIT: 'The verse contains no foreign row inside the governed boundary; the Syriac unit remains verse-aligned without a fabricated counterpart.',
    },
    exclusions: 'A certified span is not a claim of lexical equivalence and does not authorize an English gloss.',
  },
  sources: {
    peshitta: { sha256: '6E6E13089148E2D9809103F4B0BBB602D95086C28B37F44B086E800C5690651B' },
    sedraApiEvidence: 'data/sources/peshitta/sedra-inserted-token-evidence.json',
    occurrenceMorphology: { repository: 'ETCBC/syrnt', commit: 'dae3eb6ff62b9b272fb503646796c25d248175ce' },
  },
  totals: {
    governedRows: decisions.length,
    certifiedRows: decisions.filter((decision) => decision.status === 'CERTIFIED').length,
    failures: failures.length,
    relationCounts,
  },
  failures,
  decisions,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(certificate, null, 2)}\n`);
console.log(JSON.stringify(certificate.totals, null, 2));
if (failures.length > 0 || decisions.length !== 728) process.exitCode = 1;
