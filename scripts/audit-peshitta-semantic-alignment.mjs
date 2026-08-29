import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const EVIDENCE_FILE = path.join(DATA, 'sources/peshitta/sedra-inserted-token-evidence.json');
const MORPHOLOGY_FILE = path.join(ROOT, 'docs/audits/peshitta-etcbc-morphology-concordance.json');
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


function nameKeyEnglish(value){return value.toLocaleLowerCase('en').replace(/ph/gu,'p').replace(/sh|ch/gu,'x').replace(/j/gu,'y').replace(/[ou]/gu,'w').replace(/f/gu,'p').replace(/[cq]/gu,'k').replace(/[aei]/gu,'').replace(/[^a-z]/gu,'');}
function nameKeySyriac(value){const map={'ܐ':'','ܒ':'b','ܓ':'g','ܕ':'d','ܗ':'h','ܘ':'w','ܙ':'z','ܚ':'h','ܛ':'t','ܝ':'y','ܟ':'k','ܠ':'l','ܡ':'m','ܢ':'n','ܤ':'s','ܥ':'','ܦ':'p','ܨ':'s','ܩ':'k','ܪ':'r','ܫ':'x','ܬ':'t'};return [...value].map((letter)=>map[letter]??'').join('');}
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i+=1){let prior=row[0];row[0]=i;for(let j=1;j<=b.length;j+=1){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prior+Number(a[i-1]!==b[j-1]));prior=saved;}}return row[b.length];}
function atomicEnglishTokens(record) {
  const tokens = new Set();
  for (const analysis of record?.analyses ?? []) {
    for (const gloss of analysis.englishGlosses ?? []) {
      // SEDRA definitions frequently contain examples and explanatory prose.
      // Only a bare headword (optionally introduced by "to") is admissible as
      // lexical evidence; prose words must never move a displayed source cell.
      const match = analysis.category === 'proper noun'
        ? gloss.trim().match(/^([A-Za-z]+)/u)
        : gloss.trim().match(/^(?:to\s+)?([A-Za-z]+)[.!?]?$/u);
      if (!match) continue;
      for (const token of englishTokens(match[1])) tokens.add(token);
    }
  }
  return tokens;
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
const morphologyDocument = JSON.parse(fs.readFileSync(MORPHOLOGY_FILE, 'utf8'));
const morphologyBySourceToken = new Map(morphologyDocument.records.flatMap((verse) => verse.mappedTokens.map((token) => [`${verse.reference}#${token.sourceToken}`, token.morphology])));
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
        if (row.peshitta?.type !== 'text') return;
        const lexical = evidenceByToken.get(row.peshitta.text);
        const lexicalTokens = atomicEnglishTokens(lexical);
        const murdockGloss = row.peshitta.gloss?.gloss ?? '';
        const murdockTokens = new Set(englishTokens(murdockGloss));
        const evidenceTokens = new Set(lexicalTokens);
        const morphology = morphologyBySourceToken.get(`${reference}#${row.peshitta.provenance?.sourceToken}`);
        if (evidenceTokens.size === 0) {
          const morphologyConfirmedName = morphology?.ntyp === 'proper';
          const sourceNameKey = nameKeySyriac(morphology?.stem || row.peshitta.text);
          for (const nearby of document.rows.slice(Math.max(0,rowIndex-6),Math.min(document.rows.length,rowIndex+7))) {
            for (const column of ['papyrus','vaticanus','sinaiticus','byzantine','vulgate','coptic']) {
              for (const token of englishTokens(glossText(nearby[column]))) {
                const targetNameKey = nameKeyEnglish(token);
                const distanceLimit = morphologyConfirmedName ? 1 : 0;
                if (sourceNameKey.length >= (morphologyConfirmedName ? 3 : 4) && targetNameKey.length >= (morphologyConfirmedName ? 3 : 4) && editDistance(sourceNameKey,targetNameKey) <= distanceLimit) evidenceTokens.add(token);
              }
            }
          }
        }
        const candidates = [];
        const start = Math.max(0, rowIndex - 6);
        const end = Math.min(document.rows.length - 1, rowIndex + 6);
        for (let candidateIndex = start; candidateIndex <= end; candidateIndex += 1) {
          const candidate = document.rows[candidateIndex];
          const familyMatches = [];
          for (const [family, witnesses] of Object.entries(EVIDENCE_FAMILIES)) {
            const witnessMatches = [];
            for (const witness of witnesses) {
              const tokens = new Set(englishTokens(glossText(candidate[witness])));
              const overlap = [...tokens].filter((token) => evidenceTokens.has(token));
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
        if (evidenceTokens.size > 0 && !best) classification = 'HELD_NO_CROSS_WITNESS_MATCH';
        else if (best && best.sharedConcepts.length > 0 && (!second || best.sharedConcepts.length > second.sharedConcepts.length) && best.rowId === row.id) classification = 'CONFIRMED_SHARED_CONCEPT_ALIGNMENT';
        else if (best && best.sharedConcepts.length > 0 && (!second || best.sharedConcepts.length > second.sharedConcepts.length)) classification = 'STRONG_UNIQUE_DISPLACEMENT_CANDIDATE';
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
          murdockTokens: [...murdockTokens].sort(),
          evidenceTokens: [...evidenceTokens].sort(),
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
  method: 'Every displayed Peshitta source token is audited. Only atomic SEDRA IV headword glosses are admitted; examples and dictionary prose are excluded. Those headwords are matched against the current and nearby Greek, Latin, and Coptic evidence families in a plus/minus-six-row window. Multiple Greek columns count as one dependent family; generic auxiliary concepts are excluded.',
  admissionRule: 'Confirmed when the current row is the unique best row and the same lexical concept occurs in at least two independent evidence families. Displaced when another row uniquely meets that standard. Strong means review candidate, not automatic movement.',
  totals: { sourceRows: decisions.length, classifications },
  decisions,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
