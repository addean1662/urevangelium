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
const displayLexicalAid = (value) => value
  .replace(/\s*\(.*/s, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
const displaySurfaceLexicalAid = (value) => value
  .replace(/\s*\([^)]*\)/g, '')
  .split(',')[0]
  .replace(/\s{2,}/g, ' ')
  .trim();
const normalizeEnglish = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();
const contextualCore = (value) => normalizeEnglish(value)
  .replace(/^(?:and|of|to|the|in|from|by|for)\s+/u, '')
  .trim();
const entityMetadataWords = new Set(['and', 'of', 'the', 'saint', 'son', 'mother', 'father', 'brother', 'sister', 'apostle', 'baptist', 'great', 'less', 'river', 'kingdom', 'tribe', 'roman', 'united', 'monarchy']);
const entityCandidates = (identity) => identity
  .replace(/\s*\([^)]*\)/g, '')
  .split(/[^\p{L}\p{N}]+/u)
  .map((value) => value.trim())
  .filter((value) => value && !entityMetadataWords.has(normalizeEnglish(value)));
const admittedHorner = new Map();
const errors = [];

for (const unit of horner.translationUnits ?? []) {
  if (unit.decision !== 'admit') continue;
  for (const groupId of unit.sahidicaGroupIds ?? []) {
    if (admittedHorner.has(groupId)) errors.push(`Sahidica group ${groupId} belongs to more than one admitted Horner unit`);
    admittedHorner.set(groupId, unit);
  }
}

// Build a same-lemma evidence index from direct live Crum and SCRIPTORIUM
// outputs only. Generated outputs never bootstrap further generated outputs.
const directEnglishByLemma = new Map();
for (const gospel of GOSPELS) {
  const shadowFile = path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`);
  const shadow = JSON.parse(fs.readFileSync(shadowFile, 'utf8'));
  const sourceFiles = new Map();
  for (const item of shadow.decisions) {
    if (!item.lemma) continue;
    const [chapter, verse] = item.reference.split(':');
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    let data = sourceFiles.get(file);
    if (!data) { data = JSON.parse(fs.readFileSync(file, 'utf8')); sourceFiles.set(file, data); }
    const cell = data.rows.find((row) => row.id === item.rowId)?.coptic;
    if (cell?.type !== 'text' || !['Crum', 'Scriptorium'].includes(cell.gloss?.source) || !cell.gloss?.gloss) continue;
    const record = directEnglishByLemma.get(item.lemma) ?? { outputs: new Map(), sources: new Set() };
    record.outputs.set(cell.gloss.gloss, (record.outputs.get(cell.gloss.gloss) ?? 0) + 1);
    record.sources.add(cell.gloss.source);
    directEnglishByLemma.set(item.lemma, record);
  }
}

const totals = { sourceWordGroups: 0, publishedTranslation: 0, publishedLexicalAid: 0, scholarlyAutomaticEnglish: 0, generatedContextualAid: 0, withheldNoEnglish: 0, liveChanges: 0, invariantErrors: 0 };
const byGospel = {};
const outputDir = path.join(ROOT, 'docs/audits/coptic-english-system');
fs.mkdirSync(outputDir, { recursive: true });

for (const gospel of GOSPELS) {
  const shadowFile = path.join(ROOT, 'docs/audits/coptic-english-shadow', `${gospel}.json`);
  if (!fs.existsSync(shadowFile)) throw new Error(`Run npm run audit:coptic:english first: ${shadowFile} is missing`);
  const shadow = JSON.parse(fs.readFileSync(shadowFile, 'utf8'));
  const gospelTotals = { sourceWordGroups: 0, publishedTranslation: 0, publishedLexicalAid: 0, scholarlyAutomaticEnglish: 0, generatedContextualAid: 0, withheldNoEnglish: 0 };
  const decisions = [];
  const files = new Map();

  for (const item of shadow.decisions) {
    const [chapter, verse] = item.reference.split(':');
    const file = path.join(ROOT, 'data', gospel, chapter, `${verse}.json`);
    let data = files.get(file);
    if (!data) { data = JSON.parse(fs.readFileSync(file, 'utf8')); files.set(file, data); }
    const row = data.rows.find((candidate) => candidate.id === item.rowId);
    const witnessKeys = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
    const rowIndex = data.rows.indexOf(row);
    const contextRows = data.rows.slice(Math.max(0, rowIndex - 2), rowIndex + 3);
    const peerEnglish = witnessKeys.map((witness) => ({ witness, value: row?.[witness]?.gloss?.gloss ?? null })).filter((peer) => peer.value && peer.value !== '↳');
    const key = coordinate(gospel, item.reference, item.sourceToken);
    const entityOverride = manifest.entityOverrides?.[key];
    const contextualOverride = manifest.contextualOverrides?.[key];
    const effectiveIdentity = item.identity ?? entityOverride?.identity;
    const allCandidateMatches = (effectiveIdentity ? entityCandidates(effectiveIdentity) : []).map((candidate) => ({
      candidate,
      exactWitnesses: peerEnglish.filter((peer) => contextualCore(peer.value) === normalizeEnglish(candidate)).map((peer) => peer.witness),
      windowWitnesses: witnessKeys.filter((witness) => contextRows.some((contextRow) => contextualCore(contextRow[witness]?.gloss?.gloss) === normalizeEnglish(candidate))),
    }));
    const exactCandidateMatches = allCandidateMatches.filter((candidate) => candidate.exactWitnesses.length > 0);
    const candidateMatches = exactCandidateMatches.length > 0
      ? exactCandidateMatches
      : allCandidateMatches.filter((candidate) => candidate.windowWitnesses.length >= 2);
    const entityOutput = candidateMatches.length === 1 ? candidateMatches[0].candidate : null;
    const entityPeerSupport = candidateMatches.length === 1
      ? (candidateMatches[0].exactWitnesses.length > 0 ? candidateMatches[0].exactWitnesses : candidateMatches[0].windowWitnesses)
      : [];
    const entityAlignmentMode = candidateMatches.length !== 1 ? null : candidateMatches[0].exactWitnesses.length > 0 ? 'exact-row' : 'neighboring-row-window';
    const lexicalOutput = item.cclCandidate ? displayLexicalAid(item.cclCandidate) : null;
    const surfaceLexicalOutput = item.cclCandidate ? displaySurfaceLexicalAid(item.cclCandidate) : null;
    const surfaceLexicalPeerSupport = surfaceLexicalOutput
      ? peerEnglish.filter((peer) => contextualCore(peer.value) === normalizeEnglish(surfaceLexicalOutput)).map((peer) => peer.witness)
      : [];
    const sameLemmaRecord = directEnglishByLemma.get(item.lemma);
    const sameLemmaOutput = sameLemmaRecord?.outputs.size === 1 ? [...sameLemmaRecord.outputs.keys()][0] : null;
    const sameLemmaExactSupport = sameLemmaOutput
      ? peerEnglish.filter((peer) => contextualCore(peer.value) === normalizeEnglish(sameLemmaOutput)).map((peer) => peer.witness)
      : [];
    const sameLemmaWindowSupport = sameLemmaOutput
      ? witnessKeys.filter((witness) => contextRows.some((contextRow) => contextualCore(contextRow[witness]?.gloss?.gloss) === normalizeEnglish(sameLemmaOutput)))
      : [];
    const comparativeContext = contextRows.map((contextRow) => ({
      rowId: contextRow.id,
      coptic: contextRow.coptic?.type === 'text' ? contextRow.coptic.text : null,
      witnesses: Object.fromEntries(witnessKeys.map((witness) => [witness, contextRow[witness]?.gloss?.gloss ?? null])),
    }));
    const unit = admittedHorner.get(key);
    const unitDisplayOutput = unit?.displayAllocations?.[key] ?? unit?.hornerEnglishVerbatim;
    const evidence = [
      { sourceId: 'sahidica-4.1.0', role: 'governing-coptic-text', value: item.coptic },
      { sourceId: 'sahidica-4.1.0', role: 'lemma', value: item.lemma },
      { sourceId: 'sahidica-4.1.0', role: 'part-of-speech', value: item.pos },
      { sourceId: 'sahidica-4.1.0', role: 'language', value: item.language }
    ];
    if (effectiveIdentity) evidence.push({ sourceId: 'sahidica-4.1.0', role: entityOverride ? 'verse-translation-proper-name-evidence' : 'automatic-entity-evidence', value: effectiveIdentity, sourceReference: entityOverride?.sourceReference, sourceValue: entityOverride?.sourceValue });
    if (effectiveIdentity) evidence.push({ sourceId: 'comparative-grid', role: 'contextual-corroboration-only', sameRow: peerEnglish, neighboringRows: comparativeContext, candidateMatches });
    if (contextualOverride) evidence.push({ sourceId: 'sahidica-4.1.0', role: 'verse-translation-source-span-evidence', value: contextualOverride.output, sourceReference: contextualOverride.sourceReference, sourceValue: contextualOverride.sourceValue });
    if (item.cclCandidate) evidence.push({ sourceId: 'kellia-ccl-1.2', role: 'published-lexical-aid', value: item.cclCandidate, matchMethod: item.matchMethod });

    let decision;
    if (unit) {
      evidence.push({ sourceId: 'horner-southern-dialect', role: 'admitted-published-translation-unit', unitId: unit.id, value: unit.hornerEnglishVerbatim });
      decision = { layer: 'published-translation', status: 'admitted', sourceId: 'horner-southern-dialect', output: unitDisplayOutput, unitId: unit.id, rule: unit.displayAllocations ? 'CSE-002-ADMITTED-HORNER-DISPLAY-ALLOCATION' : 'CSE-001-ADMITTED-HORNER-UNIT' };
    } else if (contextualOverride) {
      decision = { layer: 'scholarly-automatic-annotation', status: 'source-attributed-verse-translation-source-span', sourceId: 'sahidica-4.1.0', output: contextualOverride.output, sourceValue: contextualOverride.sourceValue, contributingSources: ['sahidica-4.1.0'], corroboratingWitnesses: [], alignmentMode: 'source-coordinate', rule: contextualOverride.rule };
    } else if (lexicalOutput && ['exact-scriptorium-lemma', 'declared-bound-form-normalization', 'exact-surface-form'].includes(item.matchMethod)) {
      const rules = { 'exact-scriptorium-lemma': 'CSE-101-EXACT-LEMMA-CCL', 'declared-bound-form-normalization': 'CSE-102-DECLARED-BOUND-FORM-CCL', 'exact-surface-form': 'CSE-103-EXACT-SURFACE-CCL' };
      decision = { layer: 'lexical-aid', status: 'admitted', sourceId: 'kellia-ccl-1.2', output: lexicalOutput, sourceValue: item.cclCandidate, rule: rules[item.matchMethod] };
    } else if (surfaceLexicalOutput && surfaceLexicalPeerSupport.length > 0) {
      decision = { layer: 'lexical-aid', status: 'admitted-contextually-corroborated-surface-match', sourceId: 'kellia-ccl-1.2', output: surfaceLexicalOutput, sourceValue: item.cclCandidate, corroboratingWitnesses: surfaceLexicalPeerSupport, rule: 'CSE-104-SURFACE-LEXICON-CANDIDATE-WITH-EXACT-SAME-ROW-COMPARATIVE-CORROBORATION' };
    } else if (effectiveIdentity && entityOutput && entityPeerSupport.length > 0) {
      decision = { layer: 'scholarly-automatic-annotation', status: 'source-attributed-automatic-contextually-corroborated', sourceId: 'sahidica-4.1.0', output: entityOutput, sourceValue: effectiveIdentity, contributingSources: ['sahidica-4.1.0'], corroboratingWitnesses: entityPeerSupport, alignmentMode: entityAlignmentMode, rule: entityOverride?.rule ?? (entityAlignmentMode === 'exact-row' ? 'CSE-A202-SCRIPTORIUM-ENTITY-COMPONENT-WITH-EXACT-SAME-ROW-COMPARATIVE-CORROBORATION' : 'CSE-A203-SCRIPTORIUM-ENTITY-COMPONENT-WITH-MULTI-WITNESS-NEIGHBORING-ROW-CORROBORATION') };
    } else if (sameLemmaOutput && (sameLemmaExactSupport.length > 0 || sameLemmaWindowSupport.length >= 2)) {
      const exact = sameLemmaExactSupport.length > 0;
      decision = { layer: 'generated-contextual-aid', status: 'same-lemma-source-output-contextually-corroborated', sourceId: 'urevangelium-comparative-context', output: sameLemmaOutput, lemma: item.lemma, contributingSources: [...sameLemmaRecord.sources], corroboratingWitnesses: exact ? sameLemmaExactSupport : sameLemmaWindowSupport, alignmentMode: exact ? 'exact-row' : 'neighboring-row-window', rule: exact ? 'CSE-G401-UNANIMOUS-DIRECT-SAME-LEMMA-OUTPUT-WITH-EXACT-CONTEXT' : 'CSE-G402-UNANIMOUS-DIRECT-SAME-LEMMA-OUTPUT-WITH-MULTI-WITNESS-NEIGHBORING-CONTEXT' };
    } else {
      decision = { layer: 'none', status: 'withheld', sourceId: null, output: null, sourceValue: effectiveIdentity ?? item.cclCandidate ?? null, rule: effectiveIdentity && candidateMatches.length > 1 ? 'CSE-W303-AMBIGUOUS-COMPARATIVE-ENTITY-MATCH' : effectiveIdentity ? 'CSE-W304-ENTITY-WITHOUT-EXACT-SAME-ROW-CORROBORATION' : item.cclCandidate ? 'CSE-W301-SURFACE-ONLY-LEXICON-MATCH' : 'CSE-W302-NO-PUBLISHED-ENGLISH' };
    }

    totals.sourceWordGroups++; gospelTotals.sourceWordGroups++;
    if (decision.layer === 'published-translation') { totals.publishedTranslation++; gospelTotals.publishedTranslation++; }
    else if (decision.layer === 'lexical-aid') { totals.publishedLexicalAid++; gospelTotals.publishedLexicalAid++; }
    else if (decision.layer === 'scholarly-automatic-annotation') { totals.scholarlyAutomaticEnglish++; gospelTotals.scholarlyAutomaticEnglish++; }
    else if (decision.layer === 'generated-contextual-aid') { totals.generatedContextualAid++; gospelTotals.generatedContextualAid++; }
    else { totals.withheldNoEnglish++; gospelTotals.withheldNoEnglish++; }

    const record = { coordinate: key, gospel, reference: item.reference, rowId: item.rowId, sourceToken: item.sourceToken, coptic: item.coptic, evidence, decision };
    record.decisionSha256 = sha(JSON.stringify(record));
    decisions.push(record);

    if (APPLY) {
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
        cell.gloss = { gloss: decision.output, source: 'Crum', tooltip: `KELLIA CCL v1.2 · ${item.lemma} · ${item.cclCandidate}` };
      } else if (decision.layer === 'published-translation') {
        const members = unit.sahidicaGroupIds ?? [];
        const start = members[0] === key;
        cell.provenance.translationUnitId = unit.id;
        cell.gloss = unit.displayAllocations
          ? { gloss: decision.output, source: 'Horner', tooltip: `George W. Horner · provisional facsimile-controlled OCR · display allocation within translation unit ${unit.id}` }
          : { gloss: start ? decision.output : '', source: 'Horner', tooltip: `George W. Horner · provisional facsimile-controlled OCR · translation unit ${unit.id}`, spanId: unit.id, spanRole: start ? 'start' : 'continuation' };
      } else if (decision.layer === 'scholarly-automatic-annotation') {
        cell.gloss = { gloss: decision.output, source: 'Scriptorium', automaticAnnotation: true, tooltip: `Coptic SCRIPTORIUM name annotation · comparative ${decision.alignmentMode} corroboration: ${decision.corroboratingWitnesses.join(', ')}` };
      } else if (decision.layer === 'generated-contextual-aid') {
        cell.gloss = { gloss: decision.output, source: 'System', generated: true, tooltip: `Urevangelium contextual aid · unanimous direct same-lemma evidence from ${decision.contributingSources.join(', ')} · comparative ${decision.alignmentMode} corroboration: ${decision.corroboratingWitnesses.join(', ')}` };
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
if (totals.publishedTranslation + totals.publishedLexicalAid + totals.scholarlyAutomaticEnglish + totals.generatedContextualAid + totals.withheldNoEnglish !== totals.sourceWordGroups) errors.push('Decision classes do not exhaust the source corpus');
totals.invariantErrors = errors.length;
const decisionLedgerSha256 = sha(GOSPELS.map((g) => fs.readFileSync(path.join(outputDir, `${g}.json`))).join('\0'));
const report = { status: errors.length ? 'failed' : APPLY ? 'applied-and-validated' : 'shadow-validated', generatedAt: new Date().toISOString(), systemId: manifest.systemId, manifestSha256, hornerManifestSha256: hornerSha256,
  invariants: ['Every Sahidica source word-group receives exactly one deterministic decision.', 'Only an admitted published translation unit may populate contextual English.', 'KELLIA/CCL output is lexical aid and never contextual translation.', 'A SCRIPTORIUM entity component may display only after exact-row corroboration or multi-witness neighboring-row corroboration in the comparative grid.', 'Comparative traditions establish context and alignment but never become the Sahidic English source.', 'Unmarked or facsimile-uncontrolled OCR, AI-authored English, and unqualified digital English cannot populate the Sahidic translation layer.', 'Facsimile-controlled OCR admissions remain explicitly provisional until upgraded by qualified human transcription review.'],
  totals, byGospel, decisionLedgerSha256, errors };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-english-system.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
