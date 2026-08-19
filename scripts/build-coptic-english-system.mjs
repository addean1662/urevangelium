import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const manifestFile = path.join(ROOT, 'data/sources/coptic-english/manifest.json');
const hornerFile = path.join(ROOT, 'data/sources/horner-pilot/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const horner = JSON.parse(fs.readFileSync(hornerFile, 'utf8'));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const manifestSha256 = sha(fs.readFileSync(manifestFile));
const hornerSha256 = sha(fs.readFileSync(hornerFile));
const coordinate = (gospel, reference, sourceToken) => `${gospel}.${reference.replace(':', '.')}.${sourceToken}`;
const admittedHorner = new Map();
const errors = [];

for (const unit of horner.translationUnits ?? []) {
  if (unit.decision !== 'admit') continue;
  for (const groupId of unit.sahidicaGroupIds ?? []) {
    if (admittedHorner.has(groupId)) errors.push(`Sahidica group ${groupId} belongs to more than one admitted Horner unit`);
    admittedHorner.set(groupId, unit);
  }
}

const totals = { sourceWordGroups: 0, publishedTranslation: 0, publishedLexicalAid: 0, scholarlyAutomaticEnglish: 0, withheldNoEnglish: 0, liveChanges: 0, invariantErrors: 0 };
const byGospel = {};
const outputDir = path.join(ROOT, 'docs/audits/coptic-english-system');
fs.mkdirSync(outputDir, { recursive: true });

for (const gospel of GOSPELS) {
  const shadowFile = path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`);
  if (!fs.existsSync(shadowFile)) throw new Error(`Run npm run audit:coptic:english first: ${shadowFile} is missing`);
  const shadow = JSON.parse(fs.readFileSync(shadowFile, 'utf8'));
  const gospelTotals = { sourceWordGroups: 0, publishedTranslation: 0, publishedLexicalAid: 0, scholarlyAutomaticEnglish: 0, withheldNoEnglish: 0 };
  const decisions = [];
  const files = new Map();

  for (const item of shadow.decisions) {
    const key = coordinate(gospel, item.reference, item.sourceToken);
    const unit = admittedHorner.get(key);
    const evidence = [
      { sourceId: 'sahidica-4.1.0', role: 'governing-coptic-text', value: item.coptic },
      { sourceId: 'sahidica-4.1.0', role: 'lemma', value: item.lemma },
      { sourceId: 'sahidica-4.1.0', role: 'part-of-speech', value: item.pos },
      { sourceId: 'sahidica-4.1.0', role: 'language', value: item.language }
    ];
    if (item.identity) evidence.push({ sourceId: 'sahidica-4.1.0', role: 'automatic-entity-evidence', value: item.identity });
    if (item.cclCandidate) evidence.push({ sourceId: 'kellia-ccl-1.2', role: 'published-lexical-aid', value: item.cclCandidate, matchMethod: item.matchMethod });

    let decision;
    if (unit) {
      evidence.push({ sourceId: 'horner-southern-dialect', role: 'admitted-published-translation-unit', unitId: unit.id, value: unit.hornerEnglishVerbatim });
      decision = { layer: 'published-translation', status: 'admitted', sourceId: 'horner-southern-dialect', output: unit.hornerEnglishVerbatim, unitId: unit.id, rule: 'CSE-001-ADMITTED-HORNER-UNIT' };
    } else if (item.cclCandidate && ['exact-scriptorium-lemma', 'declared-bound-form-normalization', 'exact-surface-form'].includes(item.matchMethod)) {
      const rules = { 'exact-scriptorium-lemma': 'CSE-101-EXACT-LEMMA-CCL', 'declared-bound-form-normalization': 'CSE-102-DECLARED-BOUND-FORM-CCL', 'exact-surface-form': 'CSE-103-EXACT-SURFACE-CCL' };
      decision = { layer: 'lexical-aid', status: 'admitted', sourceId: 'kellia-ccl-1.2', output: item.cclCandidate, rule: rules[item.matchMethod] };
    } else if (item.identity) {
      decision = { layer: 'scholarly-automatic-annotation', status: 'source-attributed-automatic-pending-corroboration', sourceId: 'sahidica-4.1.0', output: item.identity, contributingSources: ['sahidica-4.1.0'], rule: 'CSE-A201-DIRECT-SCRIPTORIUM-ENTITY' };
    } else {
      decision = { layer: 'none', status: 'withheld', sourceId: null, output: null, rule: item.cclCandidate ? 'CSE-W301-SURFACE-ONLY-LEXICON-MATCH' : 'CSE-W302-NO-PUBLISHED-ENGLISH' };
    }

    totals.sourceWordGroups++; gospelTotals.sourceWordGroups++;
    if (decision.layer === 'published-translation') { totals.publishedTranslation++; gospelTotals.publishedTranslation++; }
    else if (decision.layer === 'lexical-aid') { totals.publishedLexicalAid++; gospelTotals.publishedLexicalAid++; }
    else if (decision.layer === 'scholarly-automatic-annotation') { totals.scholarlyAutomaticEnglish++; gospelTotals.scholarlyAutomaticEnglish++; }
    else { totals.withheldNoEnglish++; gospelTotals.withheldNoEnglish++; }

    const record = { coordinate: key, gospel, reference: item.reference, rowId: item.rowId, sourceToken: item.sourceToken, coptic: item.coptic, evidence, decision };
    record.decisionSha256 = sha(JSON.stringify(record));
    decisions.push(record);

    if (APPLY) {
      const [chapter, verse] = item.reference.split(':');
      const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
      let data = files.get(file);
      if (!data) { data = JSON.parse(fs.readFileSync(file, 'utf8')); files.set(file, data); }
      const row = data.rows.find((candidate) => candidate.id === item.rowId);
      const cell = row?.coptic;
      if (cell?.type !== 'text' || cell.provenance?.sourceToken !== item.sourceToken || cell.text !== item.coptic) {
        errors.push(`${key}: live source coordinate does not match the evidence ledger`);
        continue;
      }
      const before = JSON.stringify(cell.gloss ?? null);
      // Decisions remain in the external ledger keyed by the existing Sahidica
      // source coordinate; do not duplicate the ledger into 48,275 live cells.
      delete cell.provenance.englishEvidence;
      if (decision.layer === 'lexical-aid') {
        cell.gloss = { gloss: decision.output, source: 'Crum', tooltip: `KELLIA CCL v1.2 · ${item.lemma} · ${decision.output}` };
      } else if (decision.layer === 'published-translation') {
        const members = unit.sahidicaGroupIds ?? [];
        const start = members[0] === key;
        cell.provenance.translationUnitId = unit.id;
        cell.gloss = { gloss: start ? decision.output : '↳', source: 'Horner', tooltip: `George W. Horner · translation unit ${unit.id}`, spanId: unit.id, spanRole: start ? 'start' : 'continuation' };
      } else if (decision.layer === 'scholarly-automatic-annotation') {
        cell.gloss = { gloss: decision.output, source: 'Scriptorium', automaticAnnotation: true, tooltip: `Scholarly automatic annotation pending corroboration · Coptic SCRIPTORIUM entity identity · ${item.identity}` };
      } else {
        delete cell.gloss;
        delete cell.provenance.translationUnitId;
      }
      const after = JSON.stringify(cell.gloss ?? null);
      if (before !== after) totals.liveChanges++;
    }
  }

  if (APPLY && !errors.length) for (const [file, data] of files) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  byGospel[gospel] = gospelTotals;
  fs.writeFileSync(path.join(outputDir, `${gospel}.json`), `${JSON.stringify({ gospel, totals: gospelTotals, decisions }, null, 2)}\n`);
}

if (totals.sourceWordGroups !== 48275) errors.push(`Expected 48,275 Sahidica word-groups, found ${totals.sourceWordGroups}`);
if (totals.publishedTranslation + totals.publishedLexicalAid + totals.scholarlyAutomaticEnglish + totals.withheldNoEnglish !== totals.sourceWordGroups) errors.push('Decision classes do not exhaust the source corpus');
totals.invariantErrors = errors.length;
const decisionLedgerSha256 = sha(GOSPELS.map((g) => fs.readFileSync(path.join(outputDir, `${g}.json`))).join('\0'));
const report = { status: errors.length ? 'failed' : APPLY ? 'applied-and-validated' : 'shadow-validated', generatedAt: new Date().toISOString(), systemId: manifest.systemId, manifestSha256, hornerManifestSha256: hornerSha256,
  invariants: ['Every Sahidica source word-group receives exactly one deterministic decision.', 'Only an admitted published translation unit may populate certified contextual English.', 'KELLIA/CCL output is lexical aid and never contextual translation.', 'SCRIPTORIUM entity identity may display only as a source-attributed scholarly automatic annotation pending corroboration.', 'Cross-tradition, OCR, AI, and unqualified digital English cannot populate certified Sahidic translation.'],
  totals, byGospel, decisionLedgerSha256, errors };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-english-system.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
