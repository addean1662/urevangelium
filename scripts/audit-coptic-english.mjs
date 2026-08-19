import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('./coptic/parse-tt.js');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const PREFIX = { matthew: '40_Matthew', mark: '41_Mark', luke: '42_Luke', john: '43_John' };
const ccl = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/coptic/crum-lookup.json'), 'utf8'));
const normalizedCclSets = new Map();
for (const [lemma, gloss] of Object.entries(ccl)) {
  const normalized = lemma.replace(/[⸗-]+$/u, '');
  const values = normalizedCclSets.get(normalized) ?? new Set();
  values.add(gloss);
  normalizedCclSets.set(normalized, values);
}
const normalizedCcl = new Map([...normalizedCclSets].filter(([, values]) => values.size === 1).map(([lemma, values]) => [lemma, [...values][0]]));

function loadSource(gospel) {
  const result = new Map();
  const dir = path.join(ROOT, 'data/sources/coptic-tt');
  for (const file of fs.readdirSync(dir).filter((name) => name.startsWith(PREFIX[gospel]) && name.endsWith('.tt')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const fileChapter = Number(file.match(/_(\d+)\.tt$/)?.[1]);
    let chapter = fileChapter;
    let passedJohnSevenLacuna = false;
    for (const record of parseTTChapterSequence(fs.readFileSync(path.join(dir, file), 'utf8'))) {
      if (gospel === 'john' && fileChapter === 7) {
        if (passedJohnSevenLacuna) chapter = 8;
        else if (record.verse === 53) passedJohnSevenLacuna = true;
      }
      if (record.words.length) result.set(`${chapter}:${record.verse}`, record.words);
    }
  }
  return result;
}

const totals = { sourceWords: 0, currentGlossed: 0, currentBlank: 0, exactLemmaInCcl: 0, normalizedLemmaInCcl: 0, surfaceInCcl: 0, noCclEntry: 0, currentGlossEqualsCcl: 0, currentGlossDiffersFromCcl: 0, greekLoans: 0, properNames: 0 };
const byCurrentSource = {};
const unresolved = [];
const disagreements = [];
const gospels = {};
const shadowDir = path.join(ROOT, 'docs/audits/coptic-english-shadow');
fs.mkdirSync(shadowDir, { recursive: true });

for (const gospel of GOSPELS) {
  const source = loadSource(gospel);
  const gt = Object.fromEntries(Object.keys(totals).map((key) => [key, 0]));
  const decisions = [];
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) for (const file of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
    const verse = Number(file.slice(0, -5));
    const words = source.get(`${chapter}:${verse}`) ?? [];
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, file), 'utf8'));
    for (const row of data.rows) {
      if (row.coptic?.type !== 'text') continue;
      const token = row.coptic.provenance?.sourceToken;
      const word = words[token - 1];
      if (!word || word.text !== row.coptic.text) throw new Error(`Broken Coptic provenance at ${gospel} ${chapter}:${verse} ${row.id}`);
      gt.sourceWords++;
      if (word.lang === 'Greek') gt.greekLoans++;
      if (word.pos === 'NPROP') gt.properNames++;
      const current = row.coptic.gloss?.gloss;
      if (current) { gt.currentGlossed++; const label = row.coptic.gloss.source ?? '(unlabeled)'; byCurrentSource[label] = (byCurrentSource[label] ?? 0) + 1; } else gt.currentBlank++;
      const lemmaGloss = ccl[word.lemma];
      const normalizedLemmaGloss = !lemmaGloss ? normalizedCcl.get(word.lemma) : undefined;
      const surfaceGloss = ccl[word.text];
      const lexical = lemmaGloss ?? normalizedLemmaGloss ?? surfaceGloss;
      if (lemmaGloss) gt.exactLemmaInCcl++;
      else if (normalizedLemmaGloss) gt.normalizedLemmaInCcl++;
      else if (surfaceGloss) gt.surfaceInCcl++;
      else { gt.noCclEntry++; if (unresolved.length < 1000) unresolved.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, text: word.text, lemma: word.lemma, pos: word.pos, lang: word.lang }); }
      if (current && lexical) {
        if (current === lexical) gt.currentGlossEqualsCcl++;
        else { gt.currentGlossDiffersFromCcl++; if (disagreements.length < 1000) disagreements.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, text: word.text, lemma: word.lemma, current, currentSource: row.coptic.gloss.source, ccl: lexical }); }
      }
      const matchMethod = lemmaGloss ? 'exact-scriptorium-lemma' : normalizedLemmaGloss ? 'declared-bound-form-normalization' : surfaceGloss ? 'exact-surface-form' : 'no-ccl-entry';
      const currentRelationship = !current ? 'blank' : !lexical ? 'current-without-ccl-support' : current === lexical ? 'exact-ccl-agreement' : 'current-differs-from-ccl';
      decisions.push({
        reference: `${chapter}:${verse}`,
        rowId: row.id,
        sourceToken: token,
        coptic: word.text,
        lemma: word.lemma,
        pos: word.pos,
        language: word.lang ?? 'Coptic',
        identity: word.identity ?? null,
        currentEnglish: current ?? null,
        currentSource: row.coptic.gloss?.source ?? null,
        cclCandidate: lexical ?? null,
        matchMethod,
        currentRelationship,
        admission: 'shadow-only-not-admitted',
      });
    }
  }
  gospels[gospel] = gt;
  fs.writeFileSync(path.join(shadowDir, `${gospel}.json`), JSON.stringify({ gospel, totals: gt, decisions }, null, 2) + '\n');
  for (const key of Object.keys(totals)) totals[key] += gt[key];
}

const report = {
  status: 'read-only-coptic-english-baseline', generatedAt: new Date().toISOString(), governingText: 'Sahidica NT 4.1.0',
  lexicalSource: { name: 'KELLIA Comprehensive Coptic Lexicon v1.2', date: '2020-07-16', doi: '10.17169/refubium-27566', license: 'CC BY-SA 4.0', xmlSha256: 'df955699223d9c91aae671cfcdfeaca5a16e0812e35bbe91ff142c3fd639775d', derivedLookupSha256: '078b2c54392d45dddb9823ddb632943d6fb4597e141e58d1f660023eb7d95790' },
  warning: 'A lemma entry establishes lexical support but does not alone disambiguate which dictionary sense is contextually intended.',
  totals, gospels, byCurrentSource, unresolvedSample: unresolved, disagreementSample: disagreements,
};
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-english-baseline.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ totals, byCurrentSource }, null, 2));
