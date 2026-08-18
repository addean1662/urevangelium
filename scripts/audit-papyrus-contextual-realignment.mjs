import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const held = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json'), 'utf8'));
const decisions = held.decisions.filter((item) => item.adjudication === 'source-attested-unharmonized-papyrus-row-within-certified-context');
const columns = ['vaticanus', 'sinaiticus', 'byzantine', 'bezae'];

function normalize(text = '') {
  let value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/[^α-ω]/g, '');
  const nomina = { ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιην: 'ιησουν', ιυ: 'ιησου', ιηυ: 'ιησου', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω', κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω', πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ', μρι: 'μητρι' };
  return nomina[value] ?? value;
}
function similarity(a, b) {
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
}
function cellText(cell) {
  if (!cell || !['text', 'extant'].includes(cell.type)) return [];
  if (typeof cell.text === 'string') return [cell.text];
  return [cell.greek, cell.latin].filter(Boolean);
}

const formLemmas = new Map();
for (const filename of ['61-Mt-morphgnt.txt', '62-Mk-morphgnt.txt', '63-Lk-morphgnt.txt', '64-Jn-morphgnt.txt']) {
  for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/morphgnt', filename), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    const lemma = normalize(fields.at(-1));
    for (const form of fields.slice(3, -1)) {
      const key = normalize(form);
      if (!key || !lemma) continue;
      const lemmas = formLemmas.get(key) ?? new Set();
      lemmas.add(lemma);
      formLemmas.set(key, lemmas);
    }
  }
}
for (const filename of ['MT.txt', 'MR.txt', 'LU.txt', 'JOH.txt']) {
  for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/tischendorf-morphgnt', filename), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    const lemma = normalize(fields.at(-1));
    if (!lemma) continue;
    for (const form of fields.slice(2, -1)) {
      const key = normalize(form);
      if (!key) continue;
      const lemmas = formLemmas.get(key) ?? new Set();
      lemmas.add(lemma);
      formLemmas.set(key, lemmas);
    }
  }
}
function lemmas(text) { return formLemmas.get(normalize(text)) ?? new Set(); }

const groups = new Map();
for (const decision of decisions) {
  const key = `${decision.gospel}|${decision.reference}|${decision.siglum}|${decision.contextualBounds?.before?.rowId ?? 'START'}|${decision.contextualBounds?.after?.rowId ?? 'END'}`;
  const group = groups.get(key) ?? { key, gospel: decision.gospel, reference: decision.reference, siglum: decision.siglum, before: decision.contextualBounds?.before ?? null, after: decision.contextualBounds?.after ?? null, rowIds: decision.priorComparisonInterval ?? [], words: [] };
  group.words.push({ sourceWord: decision.sourceToken, diplomatic: decision.diplomatic, currentRowId: decision.targetRowId });
  groups.set(key, group);
}

const cases = [];
const totals = { sourceWords: decisions.length, contextualRuns: groups.size, uniqueStrongCounterpart: 0, uniqueLemmaCounterpart: 0, ambiguousStrongCounterpart: 0, noStrongCounterpart: 0, exactNominaSacraCounterpart: 0 };
for (const group of groups.values()) {
  const [chapter, verse] = group.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', group.gospel, chapter, `${verse}.json`), 'utf8'));
  const rows = new Map(data.rows.map((row) => [row.id, row]));
  group.words.sort((a, b) => a.sourceWord - b.sourceWord);
  for (const word of group.words) {
    const candidates = group.rowIds.map((rowId) => {
      const row = rows.get(rowId);
      const forms = columns.flatMap((column) => cellText(row?.[column]).map((text) => ({ column, text, similarity: similarity(word.diplomatic, text) })));
      forms.sort((a, b) => b.similarity - a.similarity);
      const sourceLemmas = lemmas(word.diplomatic);
      const rowLemmas = new Set(forms.flatMap((form) => [...lemmas(form.text)]));
      const lemmaAgreement = [...sourceLemmas].filter((lemma) => rowLemmas.has(lemma));
      return { rowId, best: forms[0] ?? null, forms, lemmaAgreement };
    }).sort((a, b) => (b.best?.similarity ?? 0) - (a.best?.similarity ?? 0));
    const strong = candidates.filter((candidate) => (candidate.best?.similarity ?? 0) >= 0.65);
    const lemmaCandidates = candidates.filter((candidate) => candidate.lemmaAgreement.length);
    const classification = strong.length === 1 ? 'unique-strong-contextual-counterpart' : lemmaCandidates.length === 1 ? 'unique-lemma-contextual-counterpart' : strong.length > 1 || lemmaCandidates.length > 1 ? 'ambiguous-strong-contextual-counterpart' : 'no-strong-contextual-counterpart';
    if (strong.length === 1) totals.uniqueStrongCounterpart++;
    else if (lemmaCandidates.length === 1) totals.uniqueLemmaCounterpart++;
    else if (strong.length > 1) totals.ambiguousStrongCounterpart++;
    else totals.noStrongCounterpart++;
    if (strong.length === 1 && strong[0].best.similarity === 1 && normalize(word.diplomatic) !== word.diplomatic) totals.exactNominaSacraCounterpart++;
    cases.push({ ...group, words: undefined, word, classification, candidates: candidates.slice(0, 4) });
  }
}
const report = { status: 'read-only-contextual-realignment', generatedAt: new Date().toISOString(), rule: 'Comparison traditions locate structural counterparts only. Different papyrus wording remains admissible and is not changed.', totals, cases };
const output = path.join(ROOT, 'docs/audits/papyrus-contextual-realignment.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...totals, output: path.relative(ROOT, output) }, null, 2));
