import { describe, expect, it } from 'vitest';
import { parseMesWord } from '@/lib/sources/cntrMes.js';
import { admitPapyrusCell, papyrusWordEvidence } from '@/lib/sources/papyrusEvidence.mjs';
import { buildStreamModel } from '@/lib/alignment/streams';
import type { VerseData } from '@/lib/types';

const reference = 'matthew 1:1';
function fixture(words: Record<string, string>) {
  const entries = Object.entries(words);
  const index = { dates: new Map(entries.map(([id], i) => [id, `c. ${150 + i * 50} CE`])), words: new Map(entries.map(([id, raw]) => [`${reference} ${id}`, [parseMesWord(raw)]])) };
  const text = parseMesWord(entries[0][1]).diplomatic;
  const cell = { type: 'extant', text, fragments: entries.map(([id]) => ({ id, date: index.dates.get(id) })), gloss: { gloss: 'son', source: 'TAGNT' }, provenance: { governingSiglum: entries[0][0], sourceToken: 1, diplomatic: text, sourceAttestations: entries.map(([siglum, raw]) => ({ siglum, sourceToken: 1, diplomatic: parseMesWord(raw).diplomatic })) } };
  return { cell, index };
}

describe('papyrus attestation admission', () => {
  it('retains an editorial reconstruction only as a loss record and note', () => {
    const { cell, index } = fixture({ P1: '~υιου' });
    const result = admitPapyrusCell(cell, reference, index);
    expect(result.type).toBe('lost');
    expect(result).not.toHaveProperty('text');
    expect(result).not.toHaveProperty('gloss');
    expect(result.editorialNotes[0]).toContain('υιου');
    expect(result.provenance.sourceAttestations[0].raw).toBe('~υιου');
  });
  it('recognizes the single plus sign as supplied by vid', () => {
    expect(papyrusWordEvidence(parseMesWord('+υιου')).status).toBe('fully-supplied');
    expect(papyrusWordEvidence(parseMesWord('+υι^ο^υ^')).visible).toBe('υ···');
  });
  it('shows surviving letters without silently completing a partially preserved word', () => {
    const { cell, index } = fixture({ P1: '~υι^ο^υ^' });
    const result = admitPapyrusCell(cell, reference, index);
    expect(result.text).toBe('υ···');
    expect(result.condition.partial).toBe(true);
    expect(result.gloss).toBeUndefined();
    expect(result.editorialNotes[0]).toContain('υιου');
  });
  it('does not treat a word with every letter missing as attested', () => {
    expect(papyrusWordEvidence(parseMesWord('υ^ι^ο^υ^')).status).toBe('fully-supplied');
  });
  it('uses another papyrus that preserves the word without crediting a reconstructed witness', () => {
    const { cell, index } = fixture({ P1: '~υιου', P45: 'υιου' });
    const result = admitPapyrusCell(cell, reference, index);
    expect(result.text).toBe('υιου');
    expect(result.fragments.map((f: { id: string }) => f.id)).toEqual(['P45']);
    expect(result.provenance.governingSiglum).toBe('P45');
    expect(result.provenance.sourceAttestations).toHaveLength(2);
    expect(result.editorialNotes[0]).toContain('P1');
    expect(admitPapyrusCell(result, reference, index)).toEqual(result);
  });
  it('rejects a stale coordinate instead of borrowing an apparent match from another position', () => {
    const { cell, index } = fixture({ P1: 'υιου' });
    cell.provenance.sourceAttestations[0].sourceToken = 2;
    expect(() => admitPapyrusCell(cell, reference, index)).toThrow('Unresolved papyrus coordinate');
  });
  it('does not badge a partial witness as preserving the displayed complete reading', () => {
    const { cell, index } = fixture({ P1: 'υι^ο^υ^', P45: 'υιου' });
    const result = admitPapyrusCell(cell, reference, index);
    expect(result.text).toBe('υιου');
    expect(result.fragments.map((f: { id: string }) => f.id)).toEqual(['P45']);
    expect(result.editorialNotes[0]).toContain('P1: partially preserved');
  });
  it('does not restore an old gloss after switching to a different attested reading', () => {
    const { cell, index } = fixture({ P1: '~υιου', P45: 'θεου' });
    const result = admitPapyrusCell(cell, reference, index);
    expect(result.gloss).toBeUndefined();
    expect(admitPapyrusCell(result, reference, index)).toEqual(result);
  });
  it('excludes reconstructed text from words and hover links while retaining its note', () => {
    const { cell, index } = fixture({ P1: '~υιου' });
    const data = { gospel: 'matthew', chapter: 1, verse: 1, rows: [{ id: 'r7', papyrus: admitPapyrusCell(cell, reference, index), vaticanus: { type: 'text', text: 'υιου' }, sinaiticus: { type: 'empty' }, vulgate: { type: 'empty' }, peshitta: { type: 'empty' }, byzantine: { type: 'empty' } }] } as VerseData;
    const model = buildStreamModel(data);
    expect(model.columns.papyrus.words).toHaveLength(0);
    expect(model.columns.papyrus.absences[0].notes?.[0]).toContain('υιου');
    expect(model.links.every(link => !link.members.includes('papyrus:r7'))).toBe(true);
  });
});
