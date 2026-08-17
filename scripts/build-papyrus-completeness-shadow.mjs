import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-completeness-audit.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const dates = Object.fromEntries(index.papyri.map((item) => [item.siglum, item.date]));
const NON_PAPYRUS = ['coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function others(rows) { return rows.map((row) => Object.fromEntries(NON_PAPYRUS.map((column) => [column, row[column] ?? null]))); }
function dateKey(siglum) { return Number((dates[siglum] ?? '').match(/\d{3,4}/)?.[0] ?? 9999); }
function siglumKey(siglum) { return Number(siglum.match(/\d+/)?.[0] ?? 9999); }

const groups = new Map();
for (const finding of audit.findings) {
  const key = `${finding.gospel}:${finding.reference}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(finding);
}

const summary = { status: 'shadow-not-for-display', generatedAt: new Date().toISOString(), sourceAudit: 'docs/audits/papyrus-completeness-audit.json', totals: { affectedVerses: 0, agreeingBadgesAdded: 0, disagreementsPreserved: 0, insertionCandidatesPreserved: 0, conditionedReadingsPreserved: 0 }, invariantErrors: [], gospels: {} };
const outDir = path.join(ROOT, 'docs/audits/papyrus-completeness-shadow'); fs.mkdirSync(outDir, { recursive: true });

for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const verses = [];
  for (const [key, findings] of groups) {
    if (!key.startsWith(`${gospel}:`)) continue;
    const reference = key.slice(gospel.length + 1), [chapter, verse] = reference.split(':').map(Number);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
    const live = JSON.parse(fs.readFileSync(file, 'utf8')), proposedRows = structuredClone(live.rows), evidence = [];
    for (const finding of findings) {
      if (finding.classification === 'missing-agreeing-badge') {
        const row = proposedRows.find((item) => item.id === finding.rowId);
        if (!row || row.papyrus?.type !== 'extant') { summary.invariantErrors.push(`${gospel} ${reference} ${finding.rowId}: missing extant row`); continue; }
        if (!row.papyrus.fragments.some((fragment) => fragment.id === finding.siglum)) {
          row.papyrus.fragments.push({ id: finding.siglum, date: dates[finding.siglum] ?? 'date unavailable' });
          row.papyrus.fragments.sort((a, b) => dateKey(a.id) - dateKey(b.id) || siglumKey(a.id) - siglumKey(b.id));
          summary.totals.agreeingBadgesAdded++;
        }
        evidence.push(finding);
      } else if (finding.classification === 'unrecorded-disagreement') { summary.totals.disagreementsPreserved++; evidence.push(finding); }
      else if (finding.classification === 'unplaced-source-word') { summary.totals.insertionCandidatesPreserved++; evidence.push(finding); }
      else if (finding.classification === 'conditioned-source-word') { summary.totals.conditionedReadingsPreserved++; evidence.push(finding); }
    }
    if (hash(others(live.rows)) !== hash(others(proposedRows))) summary.invariantErrors.push(`${gospel} ${reference}: non-papyrus mutation`);
    verses.push({ reference: `${gospel} ${reference}`, proposedRows, completenessEvidence: evidence });
    summary.totals.affectedVerses++;
  }
  const out = path.join(outDir, `${gospel}.json`); fs.writeFileSync(out, JSON.stringify({ status: summary.status, generatedAt: summary.generatedAt, gospel, verses }, null, 2) + '\n');
  summary.gospels[gospel] = { affectedVerses: verses.length, artifact: path.relative(ROOT, out).replaceAll('\\', '/') };
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const t = summary.totals;
fs.writeFileSync(path.join(outDir, 'summary.md'), ['# Earliest Papyri Completeness Shadow', '', `Generated: ${summary.generatedAt}`, '', '**Shadow only. No live Gospel data was modified.**', '', `- Affected verses: ${t.affectedVerses}`, `- Safe agreeing badges added: ${t.agreeingBadgesAdded}`, `- Unrecorded disagreements retained in evidence: ${t.disagreementsPreserved}`, `- Unplaced source-word candidates retained: ${t.insertionCandidatesPreserved}`, `- Conditioned readings retained for review: ${t.conditionedReadingsPreserved}`, `- Preservation invariant errors: ${summary.invariantErrors.length}`, '', 'Only exact agreeing badge additions are applied. Disagreements, conditioned readings, and words requiring new rows remain evidence-layer proposals.', ''].join('\n'));
console.log(JSON.stringify({ totals: summary.totals, invariantErrors: summary.invariantErrors }, null, 2));
if (summary.invariantErrors.length) process.exitCode = 1;
