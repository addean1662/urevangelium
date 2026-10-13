import fs from 'node:fs';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { papyrusCharacters, papyrusEnglish } from '@/lib/alignment/papyrusPresentation';
import { AlignmentExplorer } from '@/components/AlignmentTable/AlignmentExplorer';
import type { PapyrusExtantCell, VerseData } from '@/lib/types';
import { buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import { verifyVerse, type VerseExpectations } from '@/lib/verification/verifyVerse';

const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const data = read('data/matthew/1/6.json') as VerseData;
const incomplete = () => structuredClone(data.rows.find(row => row.id === 'r1')!.papyrus) as PapyrusExtantCell;

describe('English for incomplete papyrus readings', () => {
  it('shows the archived TAGNT wording with an explicit proposed-reading marker without completing Greek', () => {
    const cell = incomplete(), before = JSON.stringify(cell);
    expect(cell.gloss).toBeUndefined();
    expect(papyrusEnglish(cell)).toMatchObject({ gloss: 'Jesse', source: 'TAGNT', proposedReading: 'ιεσσαι' });
    expect(papyrusCharacters(cell)?.map(c => c.text).join('')).toBe('ιεσσ··');
    expect(JSON.stringify(cell)).toBe(before);
  });
  it('does not expose English for a fully lost word', () => {
    const verse = read('data/matthew/1/1.json') as VerseData;
    const lost = verse.rows.find(row => row.id === 'r7')!.papyrus;
    expect(lost.type).toBe('lost');
    expect(papyrusEnglish(lost)).toBeUndefined();
  });
  it('rejects a different reading, missing provenance, generated English, or a stale character projection', () => {
    const different = incomplete(); different.provenance!.archivalGlossReading = 'θεου';
    expect(papyrusEnglish(different)).toBeUndefined();
    const absent = incomplete(); delete absent.provenance!.archivalGlossReading;
    expect(papyrusEnglish(absent)).toBeUndefined();
    const generated = incomplete(); (generated.provenance!.archivalGloss as Record<string, unknown>).generated = true;
    expect(papyrusEnglish(generated)).toBeUndefined();
    const stale = incomplete(); stale.text = 'ιεσσαι';
    expect(papyrusEnglish(stale)).toBeUndefined();
  });
  it('uses the same marked English in streams and comparison rows, with honest coverage in the checker', () => {
    const evidence = read('data/alignment-streams/matthew.json').verses['1:6'] as StreamEvidence;
    const expectations = read('data/verse-verification/matthew.json').verses['1:6'] as VerseExpectations;
    const { container } = render(<AlignmentExplorer data={data} evidence={evidence} expectations={expectations} />);
    expect(container.querySelectorAll('[data-proposed-reading-english]')).toHaveLength(3);
    expect(container.querySelector('[data-word-id="papyrus:r1"] [data-papyrus-text]')).toHaveTextContent('ιεσσ··');
    expect(screen.getByLabelText('English for proposed reading: Jesse')).toHaveTextContent('Jesse†');
    fireEvent.click(screen.getByRole('button', { name: 'Comparison rows' }));
    expect(container.querySelectorAll('[data-proposed-reading-english]')).toHaveLength(3);
    expect(verifyVerse(data, buildStreamModel(data, evidence), expectations).columns.find(c => c.column === 'papyrus')!.english.detail).toContain('3 TAGNT glosses of proposed readings');
  });
});
