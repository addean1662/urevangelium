import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourceOrder = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const held = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-held-token-adjudication.json'), 'utf8'));
const certified = new Map(held.decisions.filter((item) => item.certified).map((item) => [`${item.gospel}|${item.reference}|${item.siglum}|${item.sourceToken}`, item.targetRowId]));
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
function similarity(a, b) {
  if (a === b) return 1; if (!a.length || !b.length) return 0;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let diag = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const above = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1)); diag = above; } }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

const totals = { unresolvedSourceTokens: 0, uniqueExactCandidate: 0, uniqueHighCandidate: 0, multipleExactCandidates: 0, multipleHighCandidates: 0, noHighCandidate: 0, emptyIntervals: 0 };
const cases = [];
for (const sequence of sourceOrder.sequences) {
  const effective = sequence.tokens.map((token) => token.targetRowId ?? certified.get(`${sequence.gospel}|${sequence.reference}|${sequence.siglum}|${token.sourceIndex + 1}`) ?? null);
  const unresolved = sequence.tokens.filter((token, index) => !effective[index]);
  if (!unresolved.length) continue;
  const [chapter, verse] = sequence.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', sequence.gospel, chapter, `${verse}.json`), 'utf8'));
  const rowIndex = new Map(data.rows.map((row, index) => [row.id, index]));
  const used = new Set(effective.filter(Boolean));
  for (const token of unresolved) {
    totals.unresolvedSourceTokens++;
    const sourceIndex = token.sourceIndex;
    const beforeId = effective.slice(0, sourceIndex).filter(Boolean).at(-1) ?? null;
    const afterId = effective.slice(sourceIndex + 1).find(Boolean) ?? null;
    const low = beforeId ? rowIndex.get(beforeId) + 1 : 0;
    const high = afterId ? rowIndex.get(afterId) - 1 : data.rows.length - 1;
    const candidates = [];
    if (high >= low) for (let i = low; i <= high; i++) {
      const row = data.rows[i];
      if (used.has(row.id)) continue;
      const forms = ['vaticanus', 'sinaiticus', 'byzantine'].flatMap((column) => row[column]?.text ? [{ column, text: row[column].text, form: normalize(row[column].text) }] : []);
      if (!forms.length) continue;
      const sourceForm = normalize(token.diplomatic);
      const scored = forms.map((form) => ({ ...form, similarity: similarity(sourceForm, form.form) })).sort((a, b) => b.similarity - a.similarity);
      candidates.push({ rowId: row.id, rowIndex: i, best: scored[0], forms: scored });
    }
    candidates.sort((a, b) => b.best.similarity - a.best.similarity || a.rowIndex - b.rowIndex);
    const exact = candidates.filter((candidate) => candidate.best.similarity === 1);
    const sourceLength = normalize(token.diplomatic).length;
    const highCandidates = candidates.filter((candidate) => sourceLength >= 4 && candidate.best.form.length >= 4 && candidate.best.similarity >= 0.8);
    let classification;
    if (exact.length === 1) classification = 'unique-exact-unused-guide-row';
    else if (exact.length > 1) classification = 'multiple-exact-unused-guide-rows';
    else if (highCandidates.length === 1) classification = 'unique-high-unused-guide-row';
    else if (highCandidates.length > 1) classification = 'multiple-high-unused-guide-rows';
    else if (high < low) classification = 'empty-source-order-interval';
    else classification = 'no-high-guide-candidate';
    const counter = { 'unique-exact-unused-guide-row': 'uniqueExactCandidate', 'multiple-exact-unused-guide-rows': 'multipleExactCandidates', 'unique-high-unused-guide-row': 'uniqueHighCandidate', 'multiple-high-unused-guide-rows': 'multipleHighCandidates', 'empty-source-order-interval': 'emptyIntervals', 'no-high-guide-candidate': 'noHighCandidate' }[classification];
    totals[counter]++;
    cases.push({ gospel: sequence.gospel, reference: sequence.reference, siglum: sequence.siglum, sourceToken: sourceIndex + 1, diplomatic: token.diplomatic, priorClassification: token.classification, beforeRowId: beforeId, afterRowId: afterId, interval: [low, high], classification, candidates: (exact.length ? exact : highCandidates.length ? highCandidates : candidates.slice(0, 3)).map((candidate) => ({ rowId: candidate.rowId, bestColumn: candidate.best.column, guideText: candidate.best.text, similarity: candidate.best.similarity, guideForms: candidate.forms.map((form) => ({ column: form.column, text: form.text, similarity: form.similarity })) })) });
  }
}
const report = { status: 'read-only-held-row-candidate-audit', generatedAt: new Date().toISOString(), totals, cases };
const output = path.join(ROOT, 'docs/audits/papyrus-held-row-candidates.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals, output: path.relative(ROOT, output) }, null, 2));
