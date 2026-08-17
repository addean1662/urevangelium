import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-selection-audit.json'), 'utf8'));
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const NON_PAPYRUS = ['coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];

function projection(diplomatic) {
  const expanded = diplomatic.replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/⳨/g, 'τρ').replace(/\ue001/g, 'μου');
  return expanded.endsWith('σ') ? `${expanded.slice(0, -1)}ς` : expanded;
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function otherColumns(rows) { return rows.map((row) => Object.fromEntries(NON_PAPYRUS.map((column) => [column, row[column] ?? null]))); }

const grouped = new Map();
for (const finding of audit.findings) {
  const key = `${finding.gospel}:${finding.reference}`;
  if (!grouped.has(key)) grouped.set(key, new Map());
  const rows = grouped.get(key);
  if (!rows.has(finding.rowId)) rows.set(finding.rowId, []);
  rows.get(finding.rowId).push(finding);
}

const master = { status: 'shadow-not-for-display', generatedAt: new Date().toISOString(), sourceAudit: 'docs/audits/papyrus-selection-audit.json', rankingRule: audit.rankingRule, totals: { affectedVerses: 0, selectedReadingsApplied: 0, badgesCorrected: 0, provisionalMarked: 0, unsupportedSetLost: 0 }, invariantErrors: [], gospels: {} };
const outDir = path.join(ROOT, 'docs/audits/papyrus-shadow'); fs.mkdirSync(outDir, { recursive: true });

for (const gospel of GOSPELS) {
  const verses = [];
  for (const [key, rowFindings] of grouped) {
    if (!key.startsWith(`${gospel}:`)) continue;
    const reference = key.slice(gospel.length + 1), [chapter, verse] = reference.split(':').map(Number);
    const file = path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`);
    const live = JSON.parse(fs.readFileSync(file, 'utf8'));
    const proposedRows = structuredClone(live.rows);
    const evidence = [];

    for (const [rowId, findings] of rowFindings) {
      const row = proposedRows.find((item) => item.id === rowId);
      if (!row) { master.invariantErrors.push(`${gospel} ${reference} ${rowId}: missing row`); continue; }
      const disagreement = findings.find((item) => item.classification === 'papyrus-disagreement');
      const wrong = findings.find((item) => item.classification === 'wrong-governing-reading');
      const provisional = findings.find((item) => item.classification === 'provisional-coverage-stub');
      const unsupported = findings.find((item) => item.classification === 'unsupported-placement');
      const governing = disagreement ?? wrong;

      if (governing?.selected) {
        const oldFragments = row.papyrus.fragments ?? [];
        const agreeing = governing.agreeing ?? [governing.selected.siglum];
        const dateBySiglum = Object.fromEntries(oldFragments.map((fragment) => [fragment.id, fragment.date]));
        row.papyrus = { ...row.papyrus, text: projection(governing.selected.diplomatic), fragments: agreeing.map((id) => ({ id, date: dateBySiglum[id] ?? governing.selected.date })) };
        master.totals.selectedReadingsApplied++;
        master.totals.badgesCorrected += oldFragments.filter((fragment) => !agreeing.includes(fragment.id)).length;
        evidence.push({ rowId, status: 'source-transcription-selected', selected: governing.selected, agreeing, dissenting: disagreement?.dissenting ?? [], previousText: wrong?.displayed ?? disagreement?.displayed });
      }
      if (provisional && !governing) {
        master.totals.provisionalMarked++;
        evidence.push({ rowId, status: 'provisional-reconstruction', displayed: provisional.displayed, stubSigla: provisional.stubSigla, authority: 'TAGNT alignment proxy; not papyrus transcription' });
      }
      if (unsupported && !governing && !provisional) {
        row.papyrus = { type: 'lost' };
        master.totals.unsupportedSetLost++;
        evidence.push({ rowId, status: 'proposed-lost-after-cntr-intf-failure', previousText: unsupported.displayed, citedSigla: unsupported.sigla });
      }
    }

    if (hash(otherColumns(live.rows)) !== hash(otherColumns(proposedRows))) master.invariantErrors.push(`${gospel} ${reference}: non-papyrus mutation`);
    verses.push({ reference: `${gospel} ${reference}`, sourceFile: path.relative(ROOT, file), proposedRows, papyrusEvidence: evidence });
    master.totals.affectedVerses++;
  }
  const artifact = { status: master.status, generatedAt: master.generatedAt, gospel, verses };
  const out = path.join(outDir, `${gospel}.json`); fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n');
  master.gospels[gospel] = { affectedVerses: verses.length, artifact: path.relative(ROOT, out).replaceAll('\\', '/') };
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(master, null, 2) + '\n');
const t = master.totals;
const markdown = ['# Earliest Papyri Corrected Shadow', '', `Generated: ${master.generatedAt}`, '', '**Shadow only. No live Gospel data was modified.**', '', `- Affected verses: ${t.affectedVerses}`, `- Governing source readings applied: ${t.selectedReadingsApplied}`, `- Non-agreeing or unattested badge associations removed: ${t.badgesCorrected}`, `- Provisional TAGNT reconstructions explicitly marked: ${t.provisionalMarked}`, `- Unsupported placements proposed as lost: ${t.unsupportedSetLost}`, `- Preservation invariant errors: ${master.invariantErrors.length}`, '', 'The shadow applies only adjudicated findings for currently cited sigla. Discovery and placement of papyri missing entirely from a word’s current badges remains a separate completeness pass and is not inferred through Vaticanus.', ''];
fs.writeFileSync(path.join(outDir, 'summary.md'), markdown.join('\n'));
console.log(JSON.stringify({ totals: master.totals, invariantErrors: master.invariantErrors }, null, 2));
if (master.invariantErrors.length) process.exitCode = 1;
