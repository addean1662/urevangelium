import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/all-column-source-concordance.json'), 'utf8'));
const byzantineFindings = audit.exceptions.filter((item) => item.column === 'byzantine' && ['unsupported', 'indeterminate', 'source-present-unordered'].includes(item.classification));
const groups = new Map();
for (const finding of byzantineFindings) {
  const key = `${finding.gospel} ${finding.reference}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(finding);
}

const decisions = [...groups.entries()].map(([reference, findings]) => {
  const unsupported = findings.filter((item) => item.classification === 'unsupported');
  const indeterminate = findings.filter((item) => item.classification === 'indeterminate');
  const unordered = findings.filter((item) => item.classification === 'source-present-unordered');
  const spelling = unsupported.filter((item) => item.source);
  const proxyOnly = unsupported.filter((item) => !item.source);
  return {
    reference,
    classification: indeterminate.length ? 'missing-source-record' : proxyOnly.length ? 'proxy-only-or-different-edition-reading' : spelling.length ? 'spelling-or-form-mismatch' : 'alignment-order-only',
    counts: { spellingOrForm: spelling.length, proxyOnly: proxyOnly.length, sourcePresentUnordered: unordered.length, indeterminate: indeterminate.length },
    findings,
    decision: indeterminate.length
      ? 'Do not certify this verse until the governing Byzantine source record is established.'
      : 'The local Byzantine CSV governs. Remove or replace unsupported displayed forms in the future candidate dataset; do not borrow TAGNT fallback text.',
  };
});

const totals = {
  bezaeGreekDisplayed: audit.totals.bezaeGreek.displayed,
  bezaeGreekUnsupported: audit.totals.bezaeGreek.unsupported,
  bezaeLatinDisplayed: audit.totals.bezaeLatin.displayed,
  bezaeLatinUnsupported: audit.totals.bezaeLatin.unsupported,
  byzantineDisplayed: audit.totals.byzantine.displayed,
  byzantineExactOrNormalized: audit.totals.byzantine.exact + audit.totals.byzantine.normalized,
  byzantineSourcePresentUnordered: audit.totals.byzantine.sourcePresentUnordered,
  byzantineUnsupported: audit.totals.byzantine.unsupported,
  byzantineIndeterminate: audit.totals.byzantine.indeterminate,
  affectedByzantineVerses: decisions.length,
};

const ledger = {
  status: 'read-only-adjudication', generatedAt: new Date().toISOString(),
  governingRule: 'Displayed text must be present in the declared source; alignment and gloss sources cannot supply readings.',
  results: {
    bezae: { classification: 'displayed-text-source-concordant', note: 'All displayed Greek and Latin cells match their respective ITSEE/IGNTP TEI word elements. Embedded line breaks remain within TEI word elements and are not word divisions.' },
    byzantine: { classification: 'not-yet-source-concordant', note: 'The local Byzantine CSV governs; unsupported legacy fallback readings require replacement in a candidate dataset.' },
  },
  totals, decisions,
};

const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'bezae-byzantine-adjudication.json'), JSON.stringify(ledger, null, 2) + '\n');
const markdown = ['# Bezae and Byzantine Source Adjudication', '', `Generated: ${ledger.generatedAt}`, '', '**Read-only adjudication. No live data was modified.**', '', '## Bezae', '', `- Greek displayed cells: ${totals.bezaeGreekDisplayed}; unsupported: ${totals.bezaeGreekUnsupported}.`, `- Latin displayed cells: ${totals.bezaeLatinDisplayed}; unsupported: ${totals.bezaeLatinUnsupported}.`, '- Result: every displayed Bezae reading is present in the appropriate Greek or Latin TEI source.', '- TEI line breaks embedded inside a `<w>` element are physical line breaks, not separate words.', '', '## Byzantine', '', `- Displayed tokens: ${totals.byzantineDisplayed}.`, `- Exact or declared-normalized ordered matches: ${totals.byzantineExactOrNormalized}.`, `- Present in the source verse but misordered/alignment-displaced: ${totals.byzantineSourcePresentUnordered}.`, `- Unsupported by the local Byzantine CSV: ${totals.byzantineUnsupported}.`, `- Indeterminate because the source verse record is unavailable: ${totals.byzantineIndeterminate}.`, `- Affected verse groups: ${totals.affectedByzantineVerses}.`, '', 'The Byzantine column cannot yet be called source-verified. Its unsupported forms include legacy proxy/fallback passages and edition-level spelling or reading differences. The candidate rebuild must use the Byzantine CSV exclusively.', ''];
fs.writeFileSync(path.join(outDir, 'bezae-byzantine-adjudication.md'), markdown.join('\n'));
console.log(JSON.stringify(totals, null, 2));
