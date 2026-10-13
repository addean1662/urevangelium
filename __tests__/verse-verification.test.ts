import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import type { VerseData } from '@/lib/types';
import { verifyVerse, type VerseExpectations } from '@/lib/verification/verifyVerse';
import { placementPacketHash, validatePlacementProposal, type PlacementPacket } from '@/lib/verification/placementProposal';

const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
function fixture(verse = 2) {
  const data = read(`data/matthew/1/${verse}.json`) as VerseData;
  const evidence = read('data/alignment-streams/matthew.json').verses[`1:${verse}`] as StreamEvidence;
  const expected = read('data/verse-verification/matthew.json').verses[`1:${verse}`] as VerseExpectations;
  return { data, evidence, expected };
}
describe('verse verification keeps fidelity separate from interpretation', () => {
  it('does not certify the bad Peshitta allocation when all English words are accounted for', () => {
    const { data, evidence, expected } = fixture();
    const before = JSON.stringify(data);
    const report = verifyVerse(data, buildStreamModel(data, evidence), expected);
    const syriac = report.columns.find(c => c.column === 'peshitta')!;
    expect(syriac.source.status).toBe('compared');
    expect(syriac.order.status).toBe('compared');
    expect(syriac.english.status).toBe('compared');
    expect(syriac.placement.status).toBe('review');
    expect(syriac.placement.detail).toContain('Repeated English');
    expect(JSON.stringify(data)).toBe(before);
  });
  it('detects reordered source occurrences even when spelling and counts are unchanged', () => {
    const { data, evidence, expected } = fixture();
    const model = buildStreamModel(data, evidence);
    [model.columns.peshitta.words[0], model.columns.peshitta.words[1]] = [model.columns.peshitta.words[1], model.columns.peshitta.words[0]];
    const result = verifyVerse(data, model, expected).columns.find(c => c.column === 'peshitta')!;
    expect(result.source.status).toBe('compared');
    expect(result.order.status).toBe('difference');
  });
  it('preserves Zare/Zara and detects harmonization of Vaticanus', () => {
    const { data, evidence, expected } = fixture(3);
    const model = buildStreamModel(data, evidence);
    expect(verifyVerse(data, model, expected).columns.find(c => c.column === 'vaticanus')!.source.status).toBe('compared');
    model.columns.vaticanus.words.find(w => w.text === 'ζαρε')!.text = 'ζαρα';
    expect(verifyVerse(data, model, expected).columns.find(c => c.column === 'vaticanus')!.source.status).toBe('difference');
  });
  it('flags dropped or rewritten English and reports missing expectations honestly', () => {
    const { data, evidence, expected } = fixture();
    const cell = data.rows.find(r => r.peshitta?.type === 'text')!.peshitta;
    if (cell?.type === 'text') cell.gloss!.gloss = 'A new translation';
    const model = buildStreamModel(data, evidence);
    expect(verifyVerse(data, model, expected).columns.find(c => c.column === 'peshitta')!.english.status).toBe('difference');
    expect(verifyVerse(data, model).columns.every(c => c.source.status === 'unavailable')).toBe(true);
  });
  it('reports conflicting papyrus attestation without claiming image certification', () => {
    const { data, evidence, expected } = fixture(4);
    const papyrus = verifyVerse(data, buildStreamModel(data, evidence), expected).columns[0];
    expect(papyrus.evidence.detail).toContain('CNTR and INTF disagree');
    expect(papyrus.evidence.status).toBe('review');
  });
});

describe('AI placement proposal boundary', () => {
  const packet: PlacementPacket = { reference: 'matthew 1:2', column: 'peshitta', sourceAuthority: 'Peshitta', englishAuthority: 'Murdock 1851',
    source: [{ id: 's1', text: 'ܠܐܝܤܚܩ' }, { id: 's2', text: 'ܐܝܤܚܩ' }], english: [{ id: 'e1', text: 'Isaac:' }, { id: 'e2', text: 'Isaac' }],
    current: [{ sourceId: 's1', englishIds: ['e1', 'e2'] }, { sourceId: 's2', englishIds: [] }] };
  const proposal = () => ({ packetSha256: placementPacketHash(packet), assignments: [{ sourceId: 's1', englishIds: ['e1'] }, { sourceId: 's2', englishIds: ['e2'] }], evidence: ['Pinned source occurrences 1 and 2'], rationale: 'Distinct name occurrences in the source.' });
  it('accepts placement-only proposals without mutating either word bank', () => {
    const before = JSON.stringify(packet);
    expect(validatePlacementProposal(packet, proposal()).errors).toEqual([]);
    expect(JSON.stringify(packet)).toBe(before);
  });
  it('allows grouping and unglossed source words while preserving both sequences', () => {
    const p = proposal();
    p.assignments[0].englishIds = ['e1', 'e2'];
    p.assignments[1].englishIds = [];
    expect(validatePlacementProposal(packet, p).errors).toEqual([]);
  });
  it('rejects reordered source groups', () => {
    const p = proposal(); p.assignments.reverse();
    expect(validatePlacementProposal(packet, p).errors).toContain('Source occurrences must remain in their authoritative order.');
  });
  it('rejects English transpositions between groups even when every word survives', () => {
    const p = proposal();
    p.assignments[0].englishIds = ['e2'];
    p.assignments[1].englishIds = ['e1'];
    expect(validatePlacementProposal(packet, p).errors).toContain('English grouping must preserve the scholarly translation’s complete occurrence order.');
  });
  it('allows crossing associations only in the explicitly selected follow-source display mode', () => {
    const p = proposal();
    p.assignments[0].englishIds = ['e2']; p.assignments[1].englishIds = ['e1'];
    const before = JSON.stringify(packet);
    expect(validatePlacementProposal(packet, p, 'follow-source').errors).toEqual([]);
    expect(JSON.stringify(packet)).toBe(before);
    expect(validatePlacementProposal(packet, { ...p, mode: 'follow-source' }).proposal).toBeUndefined();
  });
  it('rejects English reordering inside a group', () => {
    const p = proposal();
    p.assignments[0].englishIds = ['e2', 'e1'];
    p.assignments[1].englishIds = [];
    expect(validatePlacementProposal(packet, p).proposal).toBeUndefined();
    expect(validatePlacementProposal(packet, p, 'follow-source').proposal).toBeUndefined();
  });
  it('rejects discontiguous English groups while preserving repeated-name identities', () => {
    const longer = { ...packet, english: [...packet.english, { id: 'e3', text: 'begat' }] };
    const p = { ...proposal(), packetSha256: placementPacketHash(longer) };
    p.assignments[0].englishIds = ['e1', 'e3'];
    p.assignments[1].englishIds = ['e2'];
    expect(validatePlacementProposal(longer, p).proposal).toBeUndefined();
    expect(validatePlacementProposal(longer, p, 'follow-source').proposal).toBeUndefined();
  });
  it.each(['reference', 'column', 'sourceAuthority', 'englishAuthority'] as const)('rejects a stale or changed %s', field => {
    expect(validatePlacementProposal({ ...packet, [field]: 'changed' }, proposal()).proposal).toBeUndefined();
  });
  it('rejects source or translation changes after review', () => {
    const edited = structuredClone(packet);
    (edited.source[0] as { text: string }).text = 'replacement';
    expect(validatePlacementProposal(edited, proposal()).proposal).toBeUndefined();
    expect(validatePlacementProposal({ ...packet, english: [...packet.english].reverse() }, proposal()).proposal).toBeUndefined();
  });
  it('rejects replacement text, unknown IDs, duplicated and dropped English', () => {
    expect(validatePlacementProposal(packet, { ...proposal(), replacementText: 'new wording' }).proposal).toBeUndefined();
    for (const ids of [['e1', 'e2'], [], ['new']]) {
      const p = proposal(); p.assignments[0].englishIds = ids;
      expect(validatePlacementProposal(packet, p).proposal).toBeUndefined();
    }
    const p = proposal(); p.assignments[0].sourceId = 'other-verse';
    expect(validatePlacementProposal(packet, p).proposal).toBeUndefined();
  });
});
