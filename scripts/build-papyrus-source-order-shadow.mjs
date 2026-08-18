import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json'), 'utf8'));
const transpositionAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-transposition-adjudication.json'), 'utf8'));
const orthographicAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/papyrus-orthographic-adjudication.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'), 'utf8'));
const dates = Object.fromEntries(coverage.papyri.map((papyrus) => [papyrus.siglum, papyrus.date]));
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const NON_PAPYRUS = ['coptic', 'vaticanus', 'sinaiticus', 'bezae', 'vulgate', 'peshitta', 'byzantine'];
const accepted = new Set(['unique-guide-row', 'contextual-repeated-guide-row']);
const conditionedMapped = new Set(['conditioned-unique-guide-row', 'conditioned-contextual-guide-row']);
const certifiedTranspositions = new Map(transpositionAudit.decisions.filter((decision) => decision.classification === 'corroborated-clean-transposition').map((decision) => [`${decision.gospel}:${decision.reference}:${decision.siglum}`, decision]));

function dateKey(siglum) {
  return Number((dates[siglum] ?? '').match(/\d{3,4}/)?.[0] ?? 9999);
}
function siglumKey(siglum) {
  return Number(siglum.match(/\d+/)?.[0] ?? 9999);
}
function rank(a, b) {
  return dateKey(a.siglum) - dateKey(b.siglum) || siglumKey(a.siglum) - siglumKey(b.siglum);
}
function displayText(text) {
  return text.replace(/¯/g, 'ν').replace(/ϗ/g, 'και').replace(/ϫ/g, 'τρ').replace(/\ue001/g, 'μου');
}
function normalized(text = '') {
  return displayText(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
}
function stable(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function damageOnly(token) {
  return !token.supplied && token.conditions?.length > 0 && token.conditions.every((condition) => condition.kind === 'damaged');
}
function sourceIdentifiedMissing(token) {
  return token.conditions?.some((condition) => condition.kind === 'missing');
}
function sourceSupplied(token) {
  return token.supplied === 'editor' || token.supplied === 'vid';
}
function otherColumns(rows) {
  return rows.map((row) => Object.fromEntries(NON_PAPYRUS.map((column) => [column, row[column] ?? null])));
}

const byVerse = new Map();
const acceptedTokenKeys = new Set();
let acceptedTokenCount = 0;
let damageOnlyTokenCount = 0;
let sourceSuppliedTokenCount = 0;
let sourceIdentifiedMissingTokenCount = 0;
let conditionedAdmittedTokenCount = 0;
for (const sequence of audit.sequences) {
  const tokens = sequence.tokens.filter((token) => token.targetRowId && (accepted.has(token.classification) || (conditionedMapped.has(token.classification) && (damageOnly(token) || sourceSupplied(token) || sourceIdentifiedMissing(token)))));
  if (!tokens.length) continue;
  const key = `${sequence.gospel}:${sequence.reference}`;
  const record = byVerse.get(key) ?? { gospel: sequence.gospel, reference: sequence.reference, attestations: [] };
  for (const token of tokens) {
    const tokenKey = `${sequence.gospel}:${sequence.reference}:${sequence.siglum}:${token.sourceIndex}`;
    if (acceptedTokenKeys.has(tokenKey)) continue;
    acceptedTokenKeys.add(tokenKey);
    acceptedTokenCount++;
    if (damageOnly(token)) damageOnlyTokenCount++;
    if (sourceSupplied(token)) sourceSuppliedTokenCount++;
    if (sourceIdentifiedMissing(token)) sourceIdentifiedMissingTokenCount++;
    if (conditionedMapped.has(token.classification)) conditionedAdmittedTokenCount++;
    record.attestations.push({ siglum: sequence.siglum, sourceIndex: token.sourceIndex, rowId: token.targetRowId, diplomatic: token.diplomatic, form: token.form, classification: token.classification, conditions: token.conditions ?? [], supplied: token.supplied ?? null });
  }
  byVerse.set(key, record);
}
for (const decision of orthographicAudit.decisions.filter((item) => item.certified)) {
  const key = `${decision.gospel}:${decision.reference}`;
  const tokenKey = `${decision.gospel}:${decision.reference}:${decision.siglum}:${decision.sourceToken - 1}`;
  if (acceptedTokenKeys.has(tokenKey)) continue;
  acceptedTokenKeys.add(tokenKey);
  const record = byVerse.get(key) ?? { gospel: decision.gospel, reference: decision.reference, attestations: [] };
  acceptedTokenCount++;
  record.attestations.push({ siglum: decision.siglum, sourceIndex: decision.sourceToken - 1, rowId: decision.targetRowId, diplomatic: decision.diplomatic, form: normalized(decision.diplomatic), classification: 'certified-orthographic-existing-row', adjudication: decision.adjudication, conditions: decision.source.conditions ?? [], supplied: decision.source.supplied ?? null });
  byVerse.set(key, record);
}

const summary = {
  status: 'read-only-papyrus-source-order-shadow',
  generatedAt: new Date().toISOString(),
  sourceAudit: 'docs/audits/papyrus-source-order-audit.json',
  totals: {
    acceptedSourceTokens: acceptedTokenCount,
    affectedVerses: 0,
    rowsWithEvidence: 0,
    rowsChanged: 0,
    rowsAlreadyMatching: 0,
    agreeingBadgesAttached: 0,
    disagreementsPreserved: 0,
    certifiedTranspositionSequences: certifiedTranspositions.size,
    transpositionAttestations: 0,
    certifiedOrthographicMappings: orthographicAudit.totals.certified,
    damagedReadableTokensAdmitted: damageOnlyTokenCount,
    sourceTokenCollisions: 0,
    missingTargetRows: 0,
    sourceEditorSuppliedTokensAdmitted: sourceSuppliedTokenCount,
    sourceIdentifiedMissingTokensAdmitted: sourceIdentifiedMissingTokenCount,
    conditionedTokensHeld: audit.totals.conditionedMappedTokens - conditionedAdmittedTokenCount,
    unresolvedTokensHeld: audit.totals.ambiguousRepeatedTokens + audit.totals.semanticReviewTokens,
    nonPapyrusMutationErrors: 0,
    zeroCoverageChapterErrors: 0,
    applicationCoverageErrors: 0,
  },
  gospels: {},
  invariantErrors: [],
};
const outDir = path.join(ROOT, 'docs/audits/papyrus-source-order-shadow');
fs.mkdirSync(outDir, { recursive: true });
const outputByGospel = Object.fromEntries(GOSPELS.map((gospel) => [gospel, []]));
const appliedTokens = new Set();

for (const record of byVerse.values()) {
  const [chapter, verse] = record.reference.split(':');
  const file = path.join(ROOT, 'data', record.gospel, chapter, `${verse}.json`);
  const live = JSON.parse(fs.readFileSync(file, 'utf8'));
  const proposed = structuredClone(live);
  const rowMap = new Map(proposed.rows.map((row) => [row.id, row]));
  const byRow = new Map();

  for (const attestation of record.attestations) {
    const tokenKey = `${record.gospel}:${record.reference}:${attestation.siglum}:${attestation.sourceIndex}`;
    if (appliedTokens.has(tokenKey)) {
      summary.totals.applicationCoverageErrors++;
      summary.invariantErrors.push(`duplicate application ${tokenKey}`);
      continue;
    }
    appliedTokens.add(tokenKey);
    if (!rowMap.has(attestation.rowId)) {
      summary.totals.missingTargetRows++;
      summary.invariantErrors.push(`missing row ${record.gospel} ${record.reference} ${attestation.rowId}`);
      continue;
    }
    const items = byRow.get(attestation.rowId) ?? [];
    if (items.some((item) => item.siglum === attestation.siglum)) {
      summary.totals.sourceTokenCollisions++;
      summary.invariantErrors.push(`same-witness row collision ${record.gospel} ${record.reference} ${attestation.siglum} ${attestation.rowId}`);
    }
    items.push(attestation);
    byRow.set(attestation.rowId, items);
  }

  const evidence = [];
  for (const [rowId, attestations] of byRow) {
    summary.totals.rowsWithEvidence++;
    attestations.sort(rank);
    const selected = attestations[0];
    const selectedForm = normalized(selected.diplomatic);
    const agreeing = attestations.filter((item) => normalized(item.diplomatic) === selectedForm).sort(rank);
    const dissenting = attestations.filter((item) => normalized(item.diplomatic) !== selectedForm).sort(rank);
    const row = rowMap.get(rowId);
    const previous = row.papyrus;
    const fragments = agreeing.map((item) => ({ id: item.siglum, date: dates[item.siglum] ?? 'date unavailable' }));
    const transpositions = agreeing.map((item) => {
      const certification = certifiedTranspositions.get(`${record.gospel}:${record.reference}:${item.siglum}`);
      if (!certification) return null;
      summary.totals.transpositionAttestations++;
      return {
        siglum: item.siglum,
        certification: 'CNTR and cached INTF source-order corroborated',
        sourceTokenOrder: certification.sourceOrder.map((token) => ({ sourceToken: token.sourceToken, diplomatic: token.diplomatic, targetRowId: token.targetRowId })),
        guideRowOrder: certification.guideOrder.map((token) => ({ rowId: token.rowId, sourceToken: token.sourceToken })),
      };
    }).filter(Boolean);
    const next = {
      type: 'extant',
      fragments,
      text: displayText(selected.diplomatic),
      ...((selected.conditions?.length || selected.supplied) ? { condition: {
        ...(selected.conditions?.some((condition) => condition.kind === 'damaged') ? { damaged: true, damagedAfter: [...new Set(selected.conditions.filter((condition) => condition.kind === 'damaged').map((condition) => condition.after))].sort((a, b) => a - b) } : {}),
        ...(selected.conditions?.some((condition) => condition.kind === 'missing') ? { missingAfter: [...new Set(selected.conditions.filter((condition) => condition.kind === 'missing').map((condition) => condition.after))].sort((a, b) => a - b) } : {}),
        ...(selected.supplied ? { supplied: selected.supplied } : {}),
      } } : {}),
      ...(previous?.gloss ? { gloss: previous.gloss } : {}),
      provenance: {
        authority: 'CNTR papyrus transcription',
        governingSiglum: selected.siglum,
        sourceToken: selected.sourceIndex + 1,
        diplomatic: selected.diplomatic,
        agreeingSigla: agreeing.map((item) => item.siglum),
        dissentingReadings: dissenting.map((item) => ({ siglum: item.siglum, sourceToken: item.sourceIndex + 1, diplomatic: item.diplomatic })),
        ...(transpositions.length ? { certifiedTranspositions: transpositions } : {}),
        verification: 'machine-compared-rule-qualified',
      },
    };
    row.papyrus = next;
    if (stable(previous) === stable(next)) summary.totals.rowsAlreadyMatching++; else summary.totals.rowsChanged++;
    summary.totals.agreeingBadgesAttached += agreeing.length;
    summary.totals.disagreementsPreserved += dissenting.length;
    evidence.push({ rowId, selected: { siglum: selected.siglum, sourceToken: selected.sourceIndex + 1, diplomatic: selected.diplomatic }, agreeingSigla: agreeing.map((item) => item.siglum), dissenting: next.provenance.dissentingReadings, previous });
  }

  if (stable(otherColumns(live.rows)) !== stable(otherColumns(proposed.rows))) {
    summary.totals.nonPapyrusMutationErrors++;
    summary.invariantErrors.push(`non-papyrus mutation ${record.gospel} ${record.reference}`);
  }
  outputByGospel[record.gospel].push({ reference: record.reference, proposedRows: proposed.rows, evidence });
}

summary.totals.affectedVerses = [...byVerse.values()].length;
if (appliedTokens.size !== acceptedTokenCount) {
  summary.totals.applicationCoverageErrors += Math.abs(acceptedTokenCount - appliedTokens.size);
  summary.invariantErrors.push(`accepted/applied token mismatch ${acceptedTokenCount}/${appliedTokens.size}`);
}

const ZERO_COVERAGE = { matthew: new Set([6, 7, 8, 9, 15, 16, 22]), mark: new Set([3, 10, 13, 14, 15, 16]), luke: new Set([19, 20, 21]), john: new Set() };
for (const gospel of GOSPELS) {
  for (const verse of outputByGospel[gospel]) {
    const chapter = Number(verse.reference.split(':')[0]);
    if (ZERO_COVERAGE[gospel].has(chapter)) {
      summary.totals.zeroCoverageChapterErrors++;
      summary.invariantErrors.push(`papyrus evidence proposed in zero-coverage chapter ${gospel} ${verse.reference}`);
    }
  }
  const artifact = path.join(outDir, `${gospel}.json`);
  fs.writeFileSync(artifact, `${JSON.stringify({ status: summary.status, generatedAt: summary.generatedAt, gospel, verses: outputByGospel[gospel] }, null, 2)}\n`);
  summary.gospels[gospel] = { affectedVerses: outputByGospel[gospel].length, artifact: path.relative(ROOT, artifact).replaceAll('\\', '/') };
}

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
const t = summary.totals;
fs.writeFileSync(path.join(outDir, 'summary.md'), [
  '# Papyrus Source-Order Shadow', '', `Generated: ${summary.generatedAt}`, '', '**Read-only. No live Gospel data was modified.**', '',
  `- Accepted unconditioned source tokens: ${t.acceptedSourceTokens}`,
  `- Affected verses: ${t.affectedVerses}`,
  `- Rows carrying mapped evidence: ${t.rowsWithEvidence}`,
  `- Proposed row changes: ${t.rowsChanged}`,
  `- Rows already identical to the proposed cell: ${t.rowsAlreadyMatching}`,
  `- Agreeing badge attestations attached: ${t.agreeingBadgesAttached}`,
  `- Dissenting readings retained in provenance: ${t.disagreementsPreserved}`,
  `- Certified transposition sequences: ${t.certifiedTranspositionSequences}`,
  `- Row attestations carrying certified transposition provenance: ${t.transpositionAttestations}`,
  `- Certified orthographic mappings admitted: ${t.certifiedOrthographicMappings}`,
  `- Damaged-but-readable source tokens admitted: ${t.damagedReadableTokensAdmitted}`,
  `- Source-identified missing-character tokens admitted: ${t.sourceIdentifiedMissingTokensAdmitted}`,
  `- Source-editor supplied tokens admitted: ${t.sourceEditorSuppliedTokensAdmitted}`,
  `- Conditioned/supplied tokens held: ${t.conditionedTokensHeld}`,
  `- Ambiguous or semantic-review tokens held: ${t.unresolvedTokensHeld}`,
  `- Same-witness row collisions: ${t.sourceTokenCollisions}`,
  `- Missing target rows: ${t.missingTargetRows}`,
  `- Non-papyrus mutation errors: ${t.nonPapyrusMutationErrors}`,
  `- Zero-coverage chapter errors: ${t.zeroCoverageChapterErrors}`,
  `- Application coverage errors: ${t.applicationCoverageErrors}`,
  `- Total invariant errors: ${summary.invariantErrors.length}`, '',
  'Tokens with unique or contextually resolved guide-row matches are proposed when CNTR records them as extant, damaged-but-readable, editor-supplied, or as identified letters bearing the MES missing-character condition. Ambiguous and unmatched tokens remain held for review.', '',
].join('\n'));
console.log(JSON.stringify(summary.totals, null, 2));
