import { englishOccurrences } from '../lib/alignment/englishPresentation.ts';

/** Reconcile declared edition boundaries, never generate translation wording.
 * Fail preparation unless every original occurrence is accounted for exactly
 * once across the involved pages and in its canonical published order. */
export function prepareEnglishConcordances(englishByColumn, records) {
  /** @type {Record<string, Record<string, NonNullable<import('../lib/verification/verifyVerse.ts').TranslationUnit['concordance']>>>} */
  const output = {};
  for (const record of records) {
    if (!record.id || !record.evidence?.length || !record.rationale || !record.unitReferences?.length || !record.pages?.length) throw new Error('Incomplete English concordance record.');
    if (new Set(record.unitReferences).size !== record.unitReferences.length) throw new Error('Duplicate published translation unit.');
    const editions = englishByColumn[record.column];
    const units = record.unitReferences.map(reference => {
      const unit = editions?.[reference];
      if (!unit || unit.sourceReference !== reference) throw new Error(`Missing admitted translation unit: ${reference}`);
      return { reference, english: unit.english, translatorEdition: unit.translatorEdition, sourceFile: unit.sourceFile };
    });
    if (new Set(units.map(u => u.translatorEdition)).size !== 1) throw new Error('A concordance cannot silently mix translation editions.');
    const banks = new Map(units.map(unit => [unit.reference, englishOccurrences(unit.english)]));
    const expected = units.flatMap(unit => banks.get(unit.reference).map((_, i) => `${unit.reference}:e${i}`));
    const selected = [];
    for (const page of record.pages) {
      if (!record.unitReferences.includes(page.reference)) throw new Error('Display page is outside the reviewed passage.');
      const columns = output[page.reference] ??= {};
      if (columns[record.column]) throw new Error('Overlapping English concordance pages.');
      if (!page.selections?.length) throw new Error('Empty English concordance page.');
      for (const { reference, start, end } of page.selections) {
        const bank = banks.get(reference);
        if (!bank || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > bank.length || start >= end) throw new Error('Invalid English occurrence interval.');
        for (let index = start; index < end; index++) selected.push(`${reference}:e${index}`);
      }
      columns[record.column] = { id: record.id, units, selections: page.selections, evidence: record.evidence, rationale: record.rationale };
    }
    if (JSON.stringify(selected) !== JSON.stringify(expected)) throw new Error(`${record.id}: English occurrences were dropped, duplicated, or reordered across pages.`);
  }
  return output;
}
