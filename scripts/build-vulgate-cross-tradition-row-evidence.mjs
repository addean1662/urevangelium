import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const input = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json'), 'utf8'));
const outputFile = path.join(ROOT, 'docs/audits/vulgate-cross-tradition-row-evidence.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizeLatin = (value) => String(value ?? '').normalize('NFD').replace(/[^A-Za-z]/gu, '').toLowerCase().replaceAll('j', 'i');
const parseReference = (reference) => {
  const match = /^(matthew|mark|luke|john) (\d+):(\d+)$/u.exec(reference);
  if (!match) throw new Error(`Invalid reference: ${reference}`);
  return { gospel: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
};
const cellEvidence = (cell, side = null) => {
  if (!cell) return null;
  if (cell.type !== 'text' && cell.type !== 'extant') return { state: cell.type };
  const text = side ? cell[side] ?? null : cell.text ?? null;
  return { state: text ? 'text' : side && cell[`${side}Lost`] ? 'lost' : 'empty', text, english: cell.gloss?.gloss ?? null, englishSource: cell.gloss?.source ?? null };
};

const totals = { unresolved: 0, located: 0, bezaeLatinPresent: 0, bezaeLatinExact: 0, bezaeLatinDifferent: 0, bezaeGreekPresent: 0, vaticanusPresent: 0, byzantinePresent: 0, sinaiticusPresent: 0, noBezaeLatin: 0, locationErrors: 0 };
const decisions = [];
const errors = [];

for (const unit of input.units) {
  const unresolved = new Map(unit.rows.filter((row) => row.action === 'blank-unresolved').map((row) => [row.latinIndex, row]));
  totals.unresolved += unresolved.size;
  const found = new Set();
  for (const displayReference of unit.displayReferences) {
    const { gospel, chapter, verse } = parseReference(displayReference);
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, String(chapter), `${verse}.json`), 'utf8'));
    for (const row of data.rows) {
      if (row.vulgate?.type !== 'text') continue;
      const latinIndex = row.vulgate.provenance?.englishAlignment?.latinIndex;
      if (!unresolved.has(latinIndex) || found.has(latinIndex)) continue;
      found.add(latinIndex);
      totals.located++;
      const unresolvedRow = unresolved.get(latinIndex);
      const bezaeLatin = row.bezae?.type === 'text' ? row.bezae.latin ?? null : null;
      const bezaeGreek = row.bezae?.type === 'text' ? row.bezae.greek ?? null : null;
      if (bezaeLatin) {
        totals.bezaeLatinPresent++;
        if (normalizeLatin(bezaeLatin) === normalizeLatin(unresolvedRow.latin)) totals.bezaeLatinExact++;
        else totals.bezaeLatinDifferent++;
      } else totals.noBezaeLatin++;
      if (bezaeGreek) totals.bezaeGreekPresent++;
      if (row.vaticanus?.type === 'text') totals.vaticanusPresent++;
      if (row.byzantine?.type === 'text') totals.byzantinePresent++;
      if (row.sinaiticus?.type === 'text') totals.sinaiticusPresent++;
      decisions.push({
        sourceReference: unit.sourceReference,
        displayReference,
        latinIndex,
        rowId: row.id,
        vulgateLatin: unresolvedRow.latin,
        classification: bezaeLatin
          ? normalizeLatin(bezaeLatin) === normalizeLatin(unresolvedRow.latin)
            ? 'BEZAE_LATIN_EXACT_ROW_CORROBORATION'
            : 'BEZAE_LATIN_DIFFERENT_READING_OR_EQUIVALENT'
          : 'NO_EXTANT_BEZAE_LATIN_ON_ROW',
        evidence: {
          bezaeLatin: cellEvidence(row.bezae, 'latin'),
          bezaeGreek: cellEvidence(row.bezae, 'greek'),
          vaticanus: cellEvidence(row.vaticanus),
          byzantine: cellEvidence(row.byzantine),
          sinaiticus: cellEvidence(row.sinaiticus),
        },
      });
    }
  }
  for (const latinIndex of unresolved.keys()) {
    if (found.has(latinIndex)) continue;
    totals.locationErrors++;
    errors.push({ sourceReference: unit.sourceReference, latinIndex, message: 'Unresolved Latin token was not located in its display rows.' });
  }
}

const report = {
  status: errors.length ? 'blocked-location-errors' : 'cross-tradition-row-evidence-complete',
  generatedAt: new Date().toISOString(),
  scope: 'Alignment evidence only. No English crosses from another tradition into the Vulgate.',
  inputAdjudicationSha256: input.adjudicationSha256,
  totals,
  errors,
  decisions,
};
report.reportSha256 = sha256(JSON.stringify(report));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, errors, reportSha256: report.reportSha256, output: path.relative(ROOT, outputFile) }, null, 2));
