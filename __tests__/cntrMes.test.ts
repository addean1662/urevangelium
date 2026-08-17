import { describe, expect, it } from 'vitest';
import { baseWords, comparisonForm, parseMesLine, parseMesText, parseMesWord, splitMesSegments } from '@/lib/sources/cntrMes.js';

describe('CNTR MES parser', () => {
  it('keeps edited text containing spaces in one correction segment', () => {
    expect(splitMesSegments('και x{λογοσ} {ο λογοσ} a{λογοσ}')).toEqual(['και', 'x{λογοσ}', '{ο λογοσ}', 'a{λογοσ}']);
  });

  it('preserves breaks, conditions, supply, and nomina sacra', () => {
    const word = parseMesWord('/~=ισ');
    expect(word.breaks).toEqual([{ kind: 'line', number: null, offset: 0 }]);
    expect(word.supplied).toBe('editor');
    expect(word.abbreviation).toBe('nomina-sacra');
    expect(word.diplomatic).toBe('ισ');
  });

  it('projects the unlettered base edit while preserving other hands', () => {
    const segments = parseMesText('και x{αυτο} {αυτω} a{αυτον}');
    expect(baseWords(segments).map((word) => word.diplomatic)).toEqual(['και', 'αυτω']);
    const correction = segments[1];
    expect(correction.type).toBe('correction');
    if (correction.type === 'correction') expect(correction.edits.map((edit) => edit.marker)).toEqual(['x', 'base', 'a']);
  });

  it('parses a real Vaticanus-style line without losing raw evidence', () => {
    const line = parseMesLine('40001001 \\1186βιβλοσ γενεσεωσ =ιυ =χυ /υιου');
    expect(line.reference).toEqual({ code: '40001001', book: 40, chapter: 1, verse: 1 });
    expect(line.baseWords.map((word) => word.diplomatic)).toEqual(['βιβλοσ', 'γενεσεωσ', 'ιυ', 'χυ', 'υιου']);
    expect(line.baseWords[0].breaks[0]).toEqual({ kind: 'page', number: 1186, offset: 0 });
    expect(line.baseWords[2].abbreviation).toBe('nomina-sacra');
    expect(line.raw).toContain('\\1186');
  });

  it('records damaged and missing character conditions for comparison', () => {
    const word = parseMesWord('πα%σ^');
    expect(word.conditions).toEqual([{ kind: 'damaged', after: 2 }, { kind: 'missing', after: 3 }]);
    expect(comparisonForm(word)).toBe('πασ');
  });

  it('expands CNTR special glyphs for comparison without changing diplomatic text', () => {
    const word = parseMesWord('λεγω¯');
    expect(word.diplomatic).toBe('λεγω¯');
    expect(comparisonForm(word)).toBe('λεγων');
  });

  it('expands nomina sacra only for collation', () => {
    const word = parseMesWord('=χυ');
    expect(word.diplomatic).toBe('χυ');
    expect(comparisonForm(word)).toBe('χριστου');
  });
});
