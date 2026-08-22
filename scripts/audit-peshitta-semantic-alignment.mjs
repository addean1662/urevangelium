import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const EVIDENCE_FILE = path.join(DATA, 'sources/peshitta/sedra-inserted-token-evidence.json');
const OUTPUT = path.join(ROOT, 'docs/audits/peshitta-semantic-alignment.json');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const EVIDENCE_FAMILIES = {
  greek: ['papyrus', 'vaticanus', 'sinaiticus', 'byzantine'],
  latin: ['vulgate'],
  coptic: ['coptic'],
};
const STOP = new Set(['a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'have', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'i', 'ii', 'iii', 'ia', 'ip']);

function englishTokens(value) {
  return value.toLocaleLowerCase('en')
    .replace(/[^a-z\s-]/gu, ' ')
    .split(/[\s-]+/u)
    .filter(Boolean)
    .map((token) => {
      if (/^(am|is|are|was|were|been|being|become|became)$/u.test(token)) return 'be';
      if (/^(said|says|saying)$/u.test(token)) return 'say';
      if (/^(saw|seen|seeing)$/u.test(token)) return 'see';
      if (/^(had|has|having)$/u.test(token)) return 'have';
      if (/^(came|coming)$/u.test(token)) return 'come';
      if (/^(went|going)$/u.test(token)) return 'go';
      if (/^(did|does|doing|done)$/u.test(token)) return 'do';
      if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
      if (token.endsWith('ed') && token.length > 4) return token.slice(0, -2);
      if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
      return token;
    })
    .filter((token) => !STOP.has(token));
}

function glossText(cell) {
  if (!cell || cell.type !== 'text') return '';
  if (cell.gloss?.gloss) return cell.gloss.gloss;
  const parts = [];
  if (cell.greekGloss?.gloss) parts.push(cell.greekGloss.gloss);
  if (cell.latinGloss?.gloss) parts.push(cell.latinGloss.gloss);
  return parts.join(' ');
}

const evidenceDocument = JSON.parse(fs.readFileSync(EVIDENCE_FILE, 'utf8'));
const evidenceByToken = new Map(evidenceDocument.records.map((record) => [record.token, record]));
const decisions = [];

for (const gospel of GOSPELS) {
  const gospelDir = path.join(DATA, gospel);
  for (const chapter of fs.readdirSync(gospelDir)) {
    const chapterDir = path.join(gospelDir, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name))) {
      const verse = filename.replace('.json', '');
      const reference = `${gospel} ${chapter}:${verse}`;
      const document = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      document.rows.forEach((row, rowIndex) => {
        if (!row.id.startsWith('peshitta-') || row.peshitta?.type !== 'text') return;
        const lexical = evidenceByToken.get(row.peshitta.text);
        const lexicalTokens = new Set((lexical?.analyses ?? []).flatMap((analysis) => analysis.englishGlosses ?? []).flatMap(englishTokens));
        const candidates = [];
        const start = Math.max(0, rowIndex - 6);
        const end = Math.min(document.rows.length - 1, rowIndex + 6);
        for (let candidateIndex = start; candidateIndex <= end; candidateIndex += 1) {
          if (candidateIndex === rowIndex) continue;
          const candidate = document.rows[candidateIndex];
          if (candidate.id.startsWith('peshitta-')) continue;
          const familyMatches = [];
          for (const [family, witnesses] of Object.entries(EVIDENCE_FAMILIES)) {
            const witnessMatches = [];
            for (const witness of witnesses) {
              const tokens = new Set(englishTokens(glossText(candidate[witness])));
              const overlap = [...tokens].filter((token) => lexicalTokens.has(token));
              if (overlap.length > 0) witnessMatches.push({ witness, overlap });
            }
            if (witnessMatches.length > 0) familyMatches.push({ family, witnessMatches });
          }
          const conceptFamilies = new Map();
          for (const match of familyMatches) {
            const familyConcepts = new Set(match.witnessMatches.flatMap((item) => item.overlap));
            for (const concept of familyConcepts) {
              if (!conceptFamilies.has(concept)) conceptFamilies.set(concept, []);
              conceptFamilies.get(concept).push(match.family);
            }
          }
          const sharedConcepts = [...conceptFamilies.entries()]
            .filter(([, families]) => families.length >= 2)
            .map(([concept, families]) => ({ concept, families }));
          if (familyMatches.length > 0) candidates.push({
            rowId: candidate.id,
            rowIndex: candidateIndex,
            distance: Math.abs(candidateIndex - rowIndex),
            familyCount: familyMatches.length,
            familyMatches,
            sharedConcepts,
          });
        }
        candidates.sort((a, b) => b.sharedConcepts.length - a.sharedConcepts.length || b.familyCount - a.familyCount || a.distance - b.distance || a.rowIndex - b.rowIndex);
        const best = candidates[0] ?? null;
        const second = candidates[1] ?? null;
        let classification = 'HELD_NO_LEXICAL_EVIDENCE';
        if (lexicalTokens.size > 0 && !best) classification = 'HELD_NO_CROSS_WITNESS_MATCH';
        else if (best && best.sharedConcepts.length > 0 && (!second || best.sharedConcepts.length > second.sharedConcepts.length)) classification = 'STRONG_UNIQUE_SHARED_CONCEPT_CANDIDATE';
        else if (best && best.sharedConcepts.length > 0) classification = 'HELD_MULTIPLE_SHARED_CONCEPT_CANDIDATES';
        else if (best) classification = 'HELD_SINGLE_EVIDENCE_FAMILY_CANDIDATE';
        decisions.push({
          reference,
          rowId: row.id,
          rowIndex,
          syriac: row.peshitta.text,
          sourceToken: row.peshitta.provenance?.sourceToken ?? null,
          classification,
          sedraAnalysisCount: lexical?.analyses?.length ?? 0,
          sedraLexemeIds: [...new Set((lexical?.analyses ?? []).map((analysis) => analysis.lexemeId).filter(Boolean))],
          lexicalTokens: [...lexicalTokens].sort(),
          bestCandidate: best,
          alternateCandidates: candidates.slice(1, 4),
        });
      });
    }
  }
}

const classifications = {};
for (const decision of decisions) classifications[decision.classification] = (classifications[decision.classification] ?? 0) + 1;
const report = {
  generatedAt: new Date().toISOString(),
  method: 'SEDRA IV lexical ranges matched conservatively against nearby Greek, Latin, and Coptic evidence families in a plus/minus-six-row window. Multiple Greek columns count as one dependent family; generic auxiliary concepts are excluded.',
  admissionRule: 'Strong only when the same lexical concept occurs in at least two independent evidence families and the best candidate has strictly more shared concepts than every alternative. Strong means review candidate, not automatically certified placement.',
  totals: { insertedRows: decisions.length, classifications },
  decisions,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
