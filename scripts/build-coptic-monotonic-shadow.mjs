import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const COMPARISON_COLUMNS = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'peshitta', 'byzantine', 'bezae'];
const outputFile = path.join(ROOT, 'docs', 'audits', 'coptic-monotonic-shadow.json');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('./coptic/parse-tt.js');
const COPTIC_PREFIX = { matthew: '40_Matthew', mark: '41_Mark', luke: '42_Luke', john: '43_John' };

function loadSourceWords(gospel) {
  const result = new Map();
  const sourceDir = path.join(ROOT, 'data', 'sources', 'coptic-tt');
  for (const filename of fs.readdirSync(sourceDir).filter((name) => name.startsWith(COPTIC_PREFIX[gospel]) && name.endsWith('.tt')).sort()) {
    const fileChapter = Number(filename.match(/_(\d+)\.tt$/)?.[1]);
    let chapter = fileChapter;
    let passedJohnSevenLacuna = false;
    for (const record of parseTTChapterSequence(fs.readFileSync(path.join(sourceDir, filename), 'utf8'))) {
      if (gospel === 'john' && fileChapter === 7) {
        if (passedJohnSevenLacuna) chapter = 8;
        else if (record.verse === 53) passedJohnSevenLacuna = true;
      }
      if (record.words.length) result.set(`${chapter}:${record.verse}`, record.words);
    }
  }
  return result;
}

function isComparisonSlot(row) {
  return COMPARISON_COLUMNS.some((column) => {
    const cell = row[column];
    return cell && cell.type !== 'empty';
  });
}

const ENGLISH_STOPWORDS = new Set(['a', 'an', 'and', 'at', 'be', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'who', 'with']);

function englishTerms(value) {
  return new Set((value ?? '').toLowerCase().match(/[a-z]+/g)?.filter((term) => term.length > 2 && !ENGLISH_STOPWORDS.has(term)) ?? []);
}

function comparisonTerms(row) {
  const terms = new Set();
  for (const column of ['vaticanus', 'sinaiticus', 'byzantine', 'peshitta']) {
    for (const term of englishTerms(row[column]?.gloss?.gloss)) terms.add(term);
  }
  return terms;
}

function maximumWeightAnchors(candidates) {
  if (candidates.length === 0) return [];
  const scores = candidates.map((candidate) => candidate.weight);
  const prior = Array(candidates.length).fill(-1);
  let best = 0;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < i; j++) {
      if (candidates[j].rowIndex < candidates[i].rowIndex && candidates[j].token < candidates[i].token && scores[j] + candidates[i].weight > scores[i]) {
        scores[i] = scores[j] + candidates[i].weight;
        prior[i] = j;
      }
    }
    if (scores[i] > scores[best]) best = i;
  }
  const result = [];
  for (let at = best; at >= 0; at = prior[at]) {
    result.push(candidates[at]);
    if (prior[at] === -1) break;
  }
  return result.reverse();
}

function distribute(tokens, slots) {
  if (tokens.length === 0) return { assignments: [], unresolved: [] };
  if (slots.length === 0) return { assignments: [], unresolved: tokens };
  const assignments = [];
  if (tokens.length <= slots.length) {
    let previous = -1;
    for (let i = 0; i < tokens.length; i++) {
      let slotIndex = Math.round(((i + 1) * (slots.length + 1)) / (tokens.length + 1)) - 1;
      slotIndex = Math.max(previous + 1, Math.min(slotIndex, slots.length - (tokens.length - i)));
      assignments.push({ rowIndex: slots[slotIndex], tokens: [tokens[i]], method: 'monotonic-positional' });
      previous = slotIndex;
    }
    return { assignments, unresolved: [] };
  }

  for (let i = 0; i < slots.length; i++) {
    const start = Math.floor((i * tokens.length) / slots.length);
    const end = Math.floor(((i + 1) * tokens.length) / slots.length);
    assignments.push({ rowIndex: slots[i], tokens: tokens.slice(start, end), method: 'monotonic-grouped' });
  }
  return { assignments, unresolved: [] };
}

const report = {
  status: 'shadow-only',
  generatedAt: new Date().toISOString(),
  method: 'retain a maximum-weight source-order chain of legacy strong matches and unique within-verse Crum/peer lexical correspondences; distribute remaining source tokens monotonically between anchors',
  warning: 'Monotonic placement is a structural prerequisite, not contextual or scholarly alignment certification.',
  totals: {
    verses: 0, sourceTokens: 0, candidateAnchors: 0, legacyCandidateAnchors: 0,
    lexicalUniqueCandidates: 0, identityUniqueCandidates: 0, retainedAnchors: 0, retainedLegacyAnchors: 0,
    retainedLexicalAnchors: 0, corroboratedAnchors: 0, conflictingEvidenceTokens: 0,
    crossingAnchorsRejected: 0, changedPlacements: 0, groupedTokens: 0,
    copticOnlyRowsRemovedFromGrid: 0, unresolvedTokens: 0, proposedOrderBreaks: 0,
  },
  gospels: {},
  reviewCases: [],
};

for (const gospel of GOSPELS) {
  const sourceWords = loadSourceWords(gospel);
  const totals = Object.fromEntries(Object.keys(report.totals).map((key) => [key, 0]));
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter.name)).filter((name) => /^\d+\.json$/.test(name))) {
      const document = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter.name, filename), 'utf8'));
      const verseSource = sourceWords.get(`${chapter.name}:${filename.slice(0, -5)}`) ?? [];
      const tokens = document.rows.flatMap((row, rowIndex) => row.coptic?.type === 'text' && row.coptic.provenance?.sourceToken
        ? [{ token: row.coptic.provenance.sourceToken, text: row.coptic.text, gloss: row.coptic.gloss?.gloss,
          identity: verseSource[row.coptic.provenance.sourceToken - 1]?.identity,
          currentRowIndex: rowIndex, currentRowId: row.id, draft: row._copticDraft === true }]
        : []).sort((a, b) => a.token - b.token);
      if (tokens.length === 0) continue;

      const comparisonRows = document.rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => isComparisonSlot(row));
      const gridIndex = new Map(comparisonRows.map(({ rowIndex }, index) => [rowIndex, index]));
      const candidateMap = new Map();
      const addCandidate = (candidate) => {
        const key = `${candidate.token}|${candidate.rowIndex}`;
        const prior = candidateMap.get(key);
        if (!prior) candidateMap.set(key, candidate);
        else candidateMap.set(key, { ...prior, weight: prior.weight + candidate.weight, evidence: [...prior.evidence, ...candidate.evidence] });
      };
      const legacyCandidates = tokens.filter((token) => !token.draft && gridIndex.has(token.currentRowIndex));
      for (const token of legacyCandidates) addCandidate({ token: token.token, rowIndex: gridIndex.get(token.currentRowIndex), currentRowId: token.currentRowId, weight: 80, evidence: ['legacy-strong'] });

      let lexicalUniqueCandidates = 0;
      let identityUniqueCandidates = 0;
      for (const token of tokens) {
        const terms = englishTerms(token.gloss);
        if (terms.size === 0) continue;
        const matches = comparisonRows.flatMap(({ row }, rowIndex) => {
          const peers = comparisonTerms(row);
          const overlap = [...terms].filter((term) => peers.has(term));
          return overlap.length ? [{ rowIndex, overlap }] : [];
        });
        if (matches.length !== 1) continue;
        lexicalUniqueCandidates++;
        addCandidate({ token: token.token, rowIndex: matches[0].rowIndex, currentRowId: token.currentRowId, weight: 100 + matches[0].overlap.length * 10, evidence: [`unique-lexical:${matches[0].overlap.join('+')}`] });
      }
      for (const token of tokens) {
        const identity = englishTerms(token.identity);
        if (identity.size === 0) continue;
        const matches = comparisonRows.flatMap(({ row }, rowIndex) => {
          const peers = comparisonTerms(row);
          const overlap = [...identity].filter((term) => peers.has(term));
          return overlap.length ? [{ rowIndex, overlap }] : [];
        });
        if (matches.length !== 1) continue;
        identityUniqueCandidates++;
        addCandidate({ token: token.token, rowIndex: matches[0].rowIndex, currentRowId: token.currentRowId, weight: 180, evidence: [`named-entity:${matches[0].overlap.join('+')}`] });
      }
      const candidates = [...candidateMap.values()].sort((a, b) => a.rowIndex - b.rowIndex || a.token - b.token);
      const anchors = maximumWeightAnchors(candidates);
      const candidateRowsByToken = new Map();
      for (const candidate of candidates) {
        const rows = candidateRowsByToken.get(candidate.token) ?? new Set();
        rows.add(candidate.rowIndex);
        candidateRowsByToken.set(candidate.token, rows);
      }
      const conflictingEvidenceTokens = [...candidateRowsByToken.values()].filter((rows) => rows.size > 1).length;
      const retainedLegacyAnchors = anchors.filter((anchor) => anchor.evidence.some((item) => item === 'legacy-strong')).length;
      const retainedLexicalAnchors = anchors.filter((anchor) => anchor.evidence.some((item) => item.startsWith('unique-lexical:'))).length;
      const corroboratedAnchors = anchors.filter((anchor) => anchor.evidence.includes('legacy-strong') && anchor.evidence.some((item) => item.startsWith('unique-lexical:'))).length;
      const anchorTokens = new Set(anchors.map((anchor) => anchor.token));
      const assignments = anchors.map((anchor) => ({ rowIndex: anchor.rowIndex, tokens: [tokens.find((token) => token.token === anchor.token)], method: 'retained-anchor' }));
      const unresolved = [];
      const boundaries = [
        { token: 0, rowIndex: -1 },
        ...anchors,
        { token: tokens.at(-1).token + 1, rowIndex: comparisonRows.length },
      ];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const left = boundaries[i];
        const right = boundaries[i + 1];
        const segmentTokens = tokens.filter((token) => token.token > left.token && token.token < right.token && !anchorTokens.has(token.token));
        const slots = [];
        for (let rowIndex = left.rowIndex + 1; rowIndex < right.rowIndex; rowIndex++) slots.push(rowIndex);
        const distributed = distribute(segmentTokens, slots);
        assignments.push(...distributed.assignments);
        unresolved.push(...distributed.unresolved);
      }
      assignments.sort((a, b) => a.rowIndex - b.rowIndex);
      const proposedOrder = assignments.flatMap((assignment) => assignment.tokens.map((token) => token.token));
      let proposedOrderBreaks = 0;
      for (let i = 1; i < proposedOrder.length; i++) if (proposedOrder[i] <= proposedOrder[i - 1]) proposedOrderBreaks++;
      const changed = assignments.flatMap((assignment) => assignment.tokens.map((token) => ({ token, target: comparisonRows[assignment.rowIndex]?.row.id })))
        .filter(({ token, target }) => token.currentRowId !== target);
      const copticOnly = document.rows.filter((row) => row.coptic?.type === 'text' && !isComparisonSlot(row)).length;
      const grouped = assignments.filter((assignment) => assignment.tokens.length > 1).reduce((sum, assignment) => sum + assignment.tokens.length, 0);

      const verseTotals = {
        verses: 1, sourceTokens: tokens.length, candidateAnchors: candidates.length,
        legacyCandidateAnchors: legacyCandidates.length, lexicalUniqueCandidates, identityUniqueCandidates, retainedAnchors: anchors.length,
        retainedLegacyAnchors, retainedLexicalAnchors, corroboratedAnchors, conflictingEvidenceTokens,
        crossingAnchorsRejected: candidates.length - anchors.length, changedPlacements: changed.length,
        groupedTokens: grouped, copticOnlyRowsRemovedFromGrid: copticOnly, unresolvedTokens: unresolved.length,
        proposedOrderBreaks,
      };
      for (const [key, value] of Object.entries(verseTotals)) totals[key] += value;
      if ((changed.length || copticOnly || unresolved.length) && report.reviewCases.length < 250) {
        report.reviewCases.push({ gospel, reference: `${chapter.name}:${filename.slice(0, -5)}`, ...verseTotals,
          rejectedAnchors: candidates.filter((candidate) => !anchors.some((anchor) => anchor.token === candidate.token)),
          unresolved: unresolved.map(({ token, text }) => ({ token, text })),
        });
      }
    }
  }
  report.gospels[gospel] = totals;
  for (const [key, value] of Object.entries(totals)) report.totals[key] += value;
}

fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
