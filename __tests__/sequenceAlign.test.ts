import { describe, expect, it } from 'vitest';
import { alignSequences, levenshtein, similarity } from '@/lib/alignment/sequenceAlign.js';

describe('forward sequence alignment', () => {
  it('measures word similarity deterministically', () => {
    expect(levenshtein('δαυειδ', 'δαυιδ')).toBe(1);
    expect(similarity('δαυειδ', 'δαυιδ')).toBeCloseTo(5 / 6);
  });

  it('keeps exact source order and identifies insertions on either side', () => {
    const operations = alignSequences(['εν', 'αρχη', 'ην'], ['εν', 'δε', 'αρχη', 'ην', 'λογοσ']);
    expect(operations.map((operation) => operation.type)).toEqual(['exact', 'display-only', 'exact', 'exact', 'display-only']);
    expect(operations.filter((operation) => operation.sourceIndex !== null).map((operation) => operation.sourceIndex)).toEqual([0, 1, 2]);
  });

  it('classifies close spellings without treating unrelated short words as matches', () => {
    expect(alignSequences(['δαυειδ'], ['δαυιδ'])[0].type).toBe('orthographic');
    expect(alignSequences(['ο'], ['η']).map((operation) => operation.type)).toEqual(['display-only', 'source-only']);
  });
});
