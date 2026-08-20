import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const pilot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-pilot/manifest.json'), 'utf8'));
const admittedUnits = new Map((pilot.translationUnits ?? []).filter((unit) => unit.decision === 'admit').map((unit) => [unit.id, unit]));
const allocationReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-allocations.json'), 'utf8'));
const allocationUnits = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/admission-ledger.json'), 'utf8')).units.map((unit) => unit.id));
const admittedAllocations = new Map(allocationReport.results.filter((result) => result.classification === 'HORNER_BOUNDED_ALLOCATION_ADMITTED').map((result) => [`${result.sourceReference}:${result.rowIndex}`, result]));
const peerAllocationReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-peer-allocations.json'), 'utf8'));
const admittedPeerAllocations = new Map(peerAllocationReport.results.filter((result) => result.classification === 'HORNER_PEER_ALLOCATION_ADMITTED').map((result) => [`${result.sourceReference}:${result.rowIndex}`, result]));
const adjudication229Report = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-229-adjudication.json'), 'utf8'));
const admittedAdjudications229 = new Map(adjudication229Report.decisions.filter((decision) => decision.decision === 'ADMIT_HORNER_WORD_OR_PHRASE').map((decision) => [decision.key, decision]));
const phraseAdjudicationReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-horner-phrase-span-adjudication.json'), 'utf8'));
const comparativeAdjudicationReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-203-comparative-reviewed-adjudication.json'), 'utf8'));
const admittedComparativeAdjudications = new Map(comparativeAdjudicationReport.decisions.map((decision) => [decision.key, decision]));
const scriptoriumReviewedReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audits/coptic-167-scriptorium-reviewed-adjudication.json'), 'utf8'));
const admittedScriptoriumReviewed = new Map(scriptoriumReviewedReport.decisions.map((decision) => [decision.key, decision]));
const classifiedSourceDiscrepancies = new Map(scriptoriumReviewedReport.discrepancies.map((decision) => [decision.key, decision]));
const admittedPhraseMembers = new Map();
for (const unit of phraseAdjudicationReport.results.filter((result) => result.classification === 'ADMIT_HORNER_PHRASE_SPAN')) {
  for (const [memberIndex, rowIndex] of unit.rowIndexes.entries()) admittedPhraseMembers.set(`${unit.sourceReference}:${rowIndex}`, { unit, memberIndex });
}
const persistentAllocations = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/applied-allocations.json'), 'utf8')).records.map((record) => [record.key, record]));
const totals = { copticTextCells: 0, lexicalAidCells: 0, scholarlyAutomaticEnglishCells: 0, generatedContextualAidCells: 0, displayedTranslationCells: 0, classifiedSourceDiscrepancyCells: 0, blankCells: 0, violations: 0 };
const violations = [];

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const verse = filename.slice(0, -5);
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
      for (const [rowIndex, row] of data.rows.entries()) {
        const cell = row.coptic;
        if (cell?.type !== 'text') continue;
        totals.copticTextCells++;
        if (!cell.gloss) {
          totals.blankCells++;
          const sourceDiscrepancy = cell.provenance?.sourceDiscrepancy;
          if (sourceDiscrepancy) {
            const book = gospel === 'matthew' ? 'Matt' : gospel[0].toUpperCase() + gospel.slice(1);
            const decision = classifiedSourceDiscrepancies.get(`${book}.${chapter}.${verse}:${rowIndex}`);
            const validSourceDiscrepancy = decision
              && sourceDiscrepancy.decisionSha256 === decision.decisionSha256
              && sourceDiscrepancy.classification === decision.classification
              && sourceDiscrepancy.disposition === decision.disposition
              && cell.provenance?.sourceToken === decision.sourceToken
              && cell.text === decision.coptic;
            if (validSourceDiscrepancy) totals.classifiedSourceDiscrepancyCells++;
            else violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Source-discrepancy blank lacks a matching adjudication record' });
          }
          continue;
        }
        if (cell.gloss.source === 'Crum') {
          totals.lexicalAidCells++;
          if (cell.gloss.generated) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Lexical aid cannot be generated English' });
          continue;
        }
        if (cell.gloss.source === 'Horner') {
          totals.displayedTranslationCells++;
          const unitId = cell.provenance?.translationUnitId;
          const unit = admittedUnits.get(unitId);
          const book = gospel === 'matthew' ? 'Matt' : gospel[0].toUpperCase() + gospel.slice(1);
          const allocation = admittedAllocations.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const allocationProvenance = cell.provenance?.hornerAllocation;
          const validAllocation = allocation
            && allocationProvenance?.unitId === allocation.hornerUnitId
            && allocationProvenance?.decisionSha256 === allocation.decisionSha256
            && allocationUnits.has(allocation.hornerUnitId)
            && cell.gloss.gloss === allocation.allocation;
          const peerAllocation = admittedPeerAllocations.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const peerAllocationProvenance = cell.provenance?.hornerPeerAllocation;
          const validPeerAllocation = peerAllocation
            && peerAllocationProvenance?.unitId === peerAllocation.hornerUnitId
            && peerAllocationProvenance?.decisionSha256 === peerAllocation.decisionSha256
            && allocationUnits.has(peerAllocation.hornerUnitId)
            && cell.gloss.gloss === peerAllocation.allocation;
          const adjudication229 = admittedAdjudications229.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const adjudication229Provenance = cell.provenance?.hornerAdjudication229;
          const validAdjudication229 = adjudication229
            && adjudication229Provenance?.unitId === adjudication229.hornerUnitId
            && adjudication229Provenance?.decisionSha256 === adjudication229.decisionSha256
            && allocationUnits.has(adjudication229.hornerUnitId)
            && cell.provenance?.sourceToken === adjudication229.sourceToken
            && cell.gloss.gloss === adjudication229.output;
          const phraseMember = admittedPhraseMembers.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const phraseProvenance = cell.provenance?.hornerPhraseAdjudication229;
          const validPhraseAdjudication = phraseMember
            && phraseProvenance?.unitId === phraseMember.unit.hornerUnitId
            && phraseProvenance?.decisionSha256 === phraseMember.unit.decisionSha256
            && phraseProvenance?.phraseUnitId === phraseMember.unit.id
            && allocationUnits.has(phraseMember.unit.hornerUnitId)
            && cell.provenance?.sourceToken === phraseMember.unit.sourceTokens[phraseMember.memberIndex]
            && cell.gloss.spanId === phraseMember.unit.id
            && cell.gloss.spanRole === (phraseMember.memberIndex === 0 ? 'start' : 'continuation')
            && cell.gloss.gloss === (phraseMember.memberIndex === 0 ? phraseMember.unit.phrase : '');
          const comparativeAdjudication = admittedComparativeAdjudications.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const comparativeProvenance = cell.provenance?.hornerComparativeAdjudication203;
          const validComparativeAdjudication = comparativeAdjudication
            && comparativeProvenance?.decisionSha256 === comparativeAdjudication.decisionSha256
            && cell.provenance?.sourceToken === comparativeAdjudication.sourceToken
            && cell.gloss.gloss === comparativeAdjudication.allocation;
          const persistentAllocation = persistentAllocations.get(`${book}.${chapter}.${verse}:${rowIndex}`);
          const liveAllocationProvenance = allocationProvenance ?? peerAllocationProvenance ?? adjudication229Provenance ?? phraseProvenance;
          const validPersistentAllocation = persistentAllocation
            && liveAllocationProvenance?.unitId === persistentAllocation.hornerUnitId
            && liveAllocationProvenance?.decisionSha256 === persistentAllocation.decisionSha256
            && allocationUnits.has(persistentAllocation.hornerUnitId)
            && cell.gloss.gloss === persistentAllocation.allocation;
          if (!unit && !validAllocation && !validPeerAllocation && !validAdjudication229 && !validPhraseAdjudication && !validComparativeAdjudication && !validPersistentAllocation) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Displayed Horner translation lacks an admitted published-translation unit or verified source-grounded allocation', unitId: unitId ?? allocationProvenance?.unitId ?? peerAllocationProvenance?.unitId ?? adjudication229Provenance?.unitId ?? phraseProvenance?.unitId ?? null });
          if (cell.gloss.generated) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Published Horner translation cannot be marked generated' });
          continue;
        }
        if (cell.gloss.source === 'Scriptorium') {
          totals.scholarlyAutomaticEnglishCells++;
          if (cell.gloss.automaticAnnotation !== true) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'SCRIPTORIUM entity English must be marked as an automatic annotation' });
          const reviewedProvenance = cell.provenance?.scriptoriumReviewedAlignment167;
          if (reviewedProvenance) {
            const book = gospel === 'matthew' ? 'Matt' : gospel[0].toUpperCase() + gospel.slice(1);
            const decision = admittedScriptoriumReviewed.get(`${book}.${chapter}.${verse}:${rowIndex}`);
            const validReviewedAlignment = decision
              && reviewedProvenance.decisionSha256 === decision.decisionSha256
              && cell.provenance?.sourceToken === decision.sourceToken
              && cell.gloss.gloss === decision.allocation
              && cell.gloss.spanId === decision.spanId
              && cell.gloss.spanRole === decision.spanRole;
            if (!validReviewedAlignment) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Reviewed SCRIPTORIUM contextual translation lacks a matching adjudication record' });
          }
          continue;
        }
        if (cell.gloss.source === 'System') {
          totals.generatedContextualAidCells++;
          if (cell.gloss.generated !== true) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'System contextual aid must be visibly marked as generated' });
          continue;
        }
        violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: `Forbidden Sahidic English source: ${cell.gloss.source}` });
      }
    }
  }
}

totals.violations = violations.length;
const report = { status: violations.length ? 'failed' : 'passed', generatedAt: new Date().toISOString(), invariants: ['SAHIDIC_TRANSLATION is a subset of ADMITTED_PUBLISHED_SAHIDIC_TRANSLATION_UNITS', 'SCHOLARLY_AUTOMATIC_ANNOTATION and GENERATED_CONTEXTUAL_AID are visibly labeled and excluded from published-translation totals', 'LEXICAL_AID, TAGNT_EVIDENCE, GENERATED_ENGLISH, and AI_OUTPUT are disjoint from PUBLISHED_SAHIDIC_TRANSLATION', 'Facsimile-controlled OCR translation units remain provisional until upgraded by qualified human transcription review'], totals, violations };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-translation-layer-invariants.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals }, null, 2));
if (violations.length) process.exitCode = 1;
