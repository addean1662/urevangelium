import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const BOOKS = { '01': 'matthew', '02': 'mark', '03': 'luke', '04': 'john' };
const SOURCE_FILES = {
  greek: path.join(ROOT, 'data/sources/bezae/Bezae-Greek.xml'),
  latin: path.join(ROOT, 'data/sources/bezae/Bezae-Latin.xml'),
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function teiOmissions(file) {
  const result = new Set();
  const raw = fs.readFileSync(file, 'utf8');
  for (const match of raw.matchAll(/<ab\s+n="([^"]+)"[^>]*>([\s\S]*?)<\/ab>/gu)) {
    const parsed = match[1].match(/^B(\d+)K(\d+)V(\d+)/u);
    if (!parsed || !BOOKS[parsed[1]]) continue;
    const wordBodies = [...match[2].matchAll(/<w\s[^>]*>([\s\S]*?)<\/w>/gu)].map((word) => word[1].replace(/<[^>]+>/gu, '').trim());
    const survivingWords = wordBodies.filter((word) => word && word !== '&om;');
    const explicitWholeAbsence = /\b(?:omitted|absent)\b/iu.test(match[2]) || wordBodies.includes('&om;');
    if (explicitWholeAbsence && survivingWords.length === 0) result.add(`${BOOKS[parsed[1]]} ${Number(parsed[2])}:${Number(parsed[3])}`);
  }
  return result;
}

const omissions = { greek: teiOmissions(SOURCE_FILES.greek), latin: teiOmissions(SOURCE_FILES.latin) };
// These verse records are absent between adjacent TEI records and are already
// identified as scribal omissions in the project's established integrity list.
for (const reference of ['matthew 23:14', 'mark 15:28']) {
  omissions.greek.add(reference);
  omissions.latin.add(reference);
}

const totals = { verseFiles: 0, filesChanged: 0, materializedUnpopulated: 0, fullOmissionRows: 0, greekOmissionRows: 0, latinOmissionRows: 0, preservedPhysicalLossRows: 0, preservedAlignmentGaps: 0, textMutations: 0 };
const decisions = [];

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/u.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/u.test(name))) {
      totals.verseFiles += 1;
      const reference = `${gospel} ${Number(chapter)}:${Number(filename.slice(0, -5))}`;
      const file = path.join(ROOT, 'data', gospel, chapter, filename);
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      const greekOmitted = omissions.greek.has(reference);
      const latinOmitted = omissions.latin.has(reference);
      let changed = false;
      const verseDecision = { reference, greekOmitted, latinOmitted, rows: [] };
      for (const row of document.rows) {
        const beforeText = row.bezae?.type === 'text' ? `${row.bezae.greek ?? ''}\u0000${row.bezae.latin ?? ''}` : null;
        if (!row.bezae) {
          row.bezae = { type: 'unpopulated' };
          totals.materializedUnpopulated += 1;
          changed = true;
          verseDecision.rows.push({ rowId: row.id, action: 'MATERIALIZE_UNPOPULATED' });
          continue;
        }
        const cell = row.bezae;
        if (cell.type === 'lost') {
          if (greekOmitted || latinOmitted) {
            row.bezae = { type: 'omitted', ...(greekOmitted ? { greek: true } : {}), ...(latinOmitted ? { latin: true } : {}) };
            if (greekOmitted && latinOmitted) totals.fullOmissionRows += 1;
            else if (greekOmitted) totals.greekOmissionRows += 1;
            else totals.latinOmissionRows += 1;
            changed = true;
            verseDecision.rows.push({ rowId: row.id, action: 'RECLASSIFY_LOSS_AS_TEI_OMISSION' });
          } else totals.preservedPhysicalLossRows += 1;
          continue;
        }
        if (cell.type === 'empty' && (greekOmitted || latinOmitted)) {
          row.bezae = { type: 'omitted', ...(greekOmitted ? { greek: true } : {}), ...(latinOmitted ? { latin: true } : {}) };
          if (greekOmitted && latinOmitted) totals.fullOmissionRows += 1;
          else if (greekOmitted) totals.greekOmissionRows += 1;
          else totals.latinOmissionRows += 1;
          changed = true;
          verseDecision.rows.push({ rowId: row.id, action: 'CLASSIFY_TEI_OMISSION' });
          continue;
        }
        if (cell.type === 'empty') { totals.preservedAlignmentGaps += 1; continue; }
        if (cell.type === 'text') {
          if (greekOmitted && !cell.greek && !cell.greekLost && !cell.greekOmitted) { cell.greekOmitted = true; totals.greekOmissionRows += 1; changed = true; verseDecision.rows.push({ rowId: row.id, action: 'CLASSIFY_GREEK_SIDE_OMISSION' }); }
          if (latinOmitted && !cell.latin && !cell.latinLost && !cell.latinOmitted) { cell.latinOmitted = true; totals.latinOmissionRows += 1; changed = true; verseDecision.rows.push({ rowId: row.id, action: 'CLASSIFY_LATIN_SIDE_OMISSION' }); }
          const afterText = `${cell.greek ?? ''}\u0000${cell.latin ?? ''}`;
          if (beforeText !== afterText) totals.textMutations += 1;
        }
      }
      if (changed) {
        decisions.push(verseDecision);
        if (APPLY) {
          fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
          totals.filesChanged += 1;
        }
      }
    }
  }
}

const report = {
  status: APPLY ? 'APPLIED' : 'DRY_RUN',
  generatedAt: new Date().toISOString(),
  standard: 'Undefined cells become explicit unpopulated display gaps. TEI editorial omission notes and &om; markers govern omitted states. Physical loss and ordinary comparison gaps are preserved. Greek and Latin source text is immutable.',
  sources: Object.fromEntries(Object.entries(SOURCE_FILES).map(([side, file]) => [side, { file: path.relative(ROOT, file).replaceAll('\\', '/'), sha256: sha256(fs.readFileSync(file)) }])),
  omissions: { greek: [...omissions.greek].sort(), latin: [...omissions.latin].sort() },
  totals,
  decisions,
};
report.reportSha256 = sha256(JSON.stringify({ standard: report.standard, sources: report.sources, omissions: report.omissions, totals, decisions }));
fs.writeFileSync(path.join(ROOT, 'docs/audits/bezae-absence-classification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, reportSha256: report.reportSha256 }, null, 2));
if (totals.textMutations) { console.error('Refusing certification: Bezae source text changed.'); process.exitCode = 1; }
