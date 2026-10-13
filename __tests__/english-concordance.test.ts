import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { prepareEnglishConcordances } from '@/scripts/prepare-english-concordances.mjs';
import { buildStreamModel } from '@/lib/alignment/streams';
import { englishOccurrences, englishDisplayOccurrences, englishPlacementPacket } from '@/lib/alignment/englishPresentation';
import { validatePlacementProposal } from '@/lib/verification/placementProposal';
import { prepareEnglishViews } from '@/lib/verification/prepareEnglishViews';
import type { VerseExpectations } from '@/lib/verification/verifyVerse';
import reviews from '@/data/english-groups/reviewed.json';
import records from '@/data/english-groups/concordances.json';

const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const units = { vulgate: read('data/sources/vulgate-english/admitted-units.json').units };
const expected = read('data/verse-verification/matthew.json').verses as Record<string, VerseExpectations>;
const evidence = read('data/alignment-streams/matthew.json').verses;

describe('reviewed translation-boundary concordance', () => {
  it('preserves all 37 original English occurrences once across both pages, including punctuation', () => {
    const mappings = prepareEnglishConcordances(units, records);
    const selected = [5, 6].flatMap(verse => {
      const ref = `matthew 1:${verse}`, unit = expected[`1:${verse}`].english.vulgate!;
      expect(unit.concordance).toEqual(mappings[ref].vulgate);
      expect(unit.english).toBe(units.vulgate[ref].english);
      const data = read(`data/matthew/1/${verse}.json`), model = buildStreamModel(data, evidence[`1:${verse}`]);
      const view = prepareEnglishViews(model, expected[`1:${verse}`], reviews).vulgate!;
      const assigned = Object.values(view.groups).flat();
      expect(assigned).toHaveLength(view.occurrences.length);
      expect(new Set(assigned).size).toBe(assigned.length);
      return englishDisplayOccurrences(unit);
    });
    const original = records[0].unitReferences.flatMap(reference => englishOccurrences(units.vulgate[reference].english).map((o, index) => ({ text: o.text, reference, index })));
    expect(selected.map(o => ({ text: o.text, reference: o.publishedReference, index: o.publishedIndex }))).toEqual(original);
    expect(selected).toHaveLength(37);
  });
  it.each(['drop', 'duplicate', 'reorder', 'outside'] as const)('rejects a %s occurrence mapping before source expectations are prepared', change => {
    const altered = structuredClone(records), pages = altered[0].pages;
    if (change === 'drop') pages[1].selections[0].start++;
    if (change === 'duplicate') pages[1].selections[0].start--;
    if (change === 'reorder') pages.reverse();
    if (change === 'outside') pages[1].selections[0].end = 1000;
    expect(() => prepareEnglishConcordances(units, altered)).toThrow();
  });
  it('rejects stale placement if any borrowed English source or its selected boundary changes', () => {
    const data = read('data/matthew/1/5.json'), model = buildStreamModel(data, evidence['1:5']);
    const original = expected['1:5'].english.vulgate!;
    for (const change of ['wording', 'boundary']) {
      const unit = structuredClone(original);
      if (change === 'wording') unit.concordance!.units[1].english = unit.concordance!.units[1].english.replace('Jesse', 'Changed');
      else unit.concordance!.selections[1].end--;
      const packet = englishPlacementPacket(model.reference, model.columns.vulgate, unit, expected['1:5'].sources.vulgate!.authority);
      expect(validatePlacementProposal(packet, reviews['matthew 1:5'].vulgate, 'follow-source').errors.join(' ')).toContain('stale');
    }
  });
});
