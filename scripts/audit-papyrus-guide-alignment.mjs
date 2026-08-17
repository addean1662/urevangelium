import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const input = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-completeness-audit.json'), 'utf8'));
const candidates = input.findings.filter((finding) => finding.classification === 'unplaced-source-word');

const NOMINA = {
  ισ: 'ιησουσ', ιη: 'ιησουσ', ιησ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν',
  χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
  κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω',
  θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
  πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
  υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω', δαδ: 'δαυιδ', ιηλ: 'ισραηλ',
};

function normalizeGreek(text = '') {
  const form = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ς/g, 'σ').replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/[^α-ω]/g, '');
  return NOMINA[form] ?? form;
}

function cellText(row, column) {
  const cell = row[column];
  return cell?.type === 'text' || cell?.type === 'extant' ? cell.text : null;
}

const hierarchy = ['vaticanus', 'sinaiticus', 'byzantine'];
const totals = {
  candidates: candidates.length,
  uniqueGuideMatches: 0,
  outOfIntervalGuideMatches: 0,
  inIntervalMatches: 0,
  multipleGuideMatches: 0,
  noGuideSurfaceMatch: 0,
  genuineAdditionsCertified: 0,
  tokenCoverageErrors: 0,
};
const decisions = [];
const seen = new Set();

for (const item of candidates) {
  const tokenKey = `${item.gospel}:${item.reference}:${item.siglum}:${item.sourceWord}`;
  if (seen.has(tokenKey)) {
    totals.tokenCoverageErrors++;
    decisions.push({ ...item, tokenKey, classification: 'duplicate-source-token', decision: 'Reject: this source token occurs more than once in the candidate inventory.' });
    continue;
  }
  seen.add(tokenKey);

  const [chapter, verse] = item.reference.split(':');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', item.gospel, chapter, `${verse}.json`), 'utf8'));
  const rowPositions = new Map(data.rows.map((row, index) => [row.id, index]));
  const after = item.insertAfterRowId === null ? -1 : rowPositions.get(item.insertAfterRowId);
  const before = item.insertBeforeRowId === null ? data.rows.length : rowPositions.get(item.insertBeforeRowId);
  const sourceForm = normalizeGreek(item.diplomatic);
  const matchesByRow = new Map();

  for (const column of hierarchy) {
    for (let rowIndex = 0; rowIndex < data.rows.length; rowIndex++) {
      const text = cellText(data.rows[rowIndex], column);
      if (!text || normalizeGreek(text) !== sourceForm) continue;
      const existing = matchesByRow.get(data.rows[rowIndex].id) ?? { rowId: data.rows[rowIndex].id, rowIndex, evidence: [] };
      existing.evidence.push({ column, text });
      matchesByRow.set(existing.rowId, existing);
    }
    if (matchesByRow.size) break; // Respect the guide hierarchy.
  }

  const matches = [...matchesByRow.values()];
  if (matches.length === 1) {
    const match = matches[0];
    const inInterval = match.rowIndex > (after ?? -1) && match.rowIndex < (before ?? data.rows.length);
    totals.uniqueGuideMatches++;
    if (inInterval) totals.inIntervalMatches++; else totals.outOfIntervalGuideMatches++;
    decisions.push({ ...item, tokenKey, classification: inInterval ? 'unique-guide-row' : 'out-of-interval-guide-row', targetRowId: match.rowId, guideEvidence: match.evidence, sourceOrder: item.sourceWord, visualRowIndex: match.rowIndex, decision: inInterval ? 'Align to the unique Vaticanus-first guide row.' : 'The prior interval is displaced. Use this unique guide-row candidate, then compare the complete source-token order before classifying an actual transposition.' });
  } else if (matches.length > 1) {
    totals.multipleGuideMatches++;
    decisions.push({ ...item, tokenKey, classification: 'ambiguous-repeated-guide-form', possibleRows: matches, decision: 'Do not place automatically; repeated surface forms require contextual semantic adjudication.' });
  } else {
    totals.noGuideSurfaceMatch++;
    decisions.push({ ...item, tokenKey, classification: 'semantic-review-required', decision: 'Do not create a row automatically. Determine whether this is a variant form, substitution, or genuine papyrus addition.' });
  }
}

if (seen.size !== candidates.length) totals.tokenCoverageErrors += Math.abs(candidates.length - seen.size);

const report = {
  status: 'read-only-transposition-aware-pilot',
  generatedAt: new Date().toISOString(),
  rules: {
    structuralGuide: 'Vaticanus (GA 03)',
    fallbacks: ['Sinaiticus (GA 01)', 'Byzantine textform'],
    lexicalAid: 'TAGNT (not used to supply displayed text)',
    textualAuthority: 'The cited papyrus transcription alone',
    newRowThreshold: 'A genuine additional propositional contribution established by review; absence of a surface match is insufficient.',
  },
  totals,
  decisions,
};

const outDir = path.join(ROOT, 'docs/audits');
fs.writeFileSync(path.join(outDir, 'papyrus-guide-alignment-pilot.json'), `${JSON.stringify(report, null, 2)}\n`);
const t = totals;
fs.writeFileSync(path.join(outDir, 'papyrus-guide-alignment-pilot.md'), [
  '# Papyrus Guide-Alignment Pilot', '', `Generated: ${report.generatedAt}`, '',
  '**Read-only. No live Gospel data was modified.**', '',
  'Vaticanus is the primary structural guide; Sinaiticus and Byzantine are fallbacks. Guide columns locate rows but never supply papyrus text.', '',
  `- Candidate source tokens: ${t.candidates}`,
  `- Unique guide-row matches: ${t.uniqueGuideMatches}`,
  `- Matches within the prior interval: ${t.inIntervalMatches}`,
  `- Unique matches outside the prior interval: ${t.outOfIntervalGuideMatches}`,
  `- Ambiguous repeated guide forms: ${t.multipleGuideMatches}`,
  `- Semantic review required: ${t.noGuideSurfaceMatch}`,
  `- Genuine additions certified automatically: ${t.genuineAdditionsCertified}`,
  `- Exactly-once inventory errors: ${t.tokenCoverageErrors}`, '',
  'No new rows or manuscript transpositions are certified by this pilot. Surface mismatch alone cannot establish a genuine addition, and an out-of-interval match must be checked against the complete source-token order before it is called a transposition.', '',
].join('\n'));

console.log(JSON.stringify(totals, null, 2));
