import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PapyrusCell } from '@/components/AlignmentTable/PapyrusCell';
import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import fs from 'node:fs';
import { papyrusCharacters, papyrusConflictNotes } from '@/lib/alignment/papyrusPresentation';

const matthew4 = JSON.parse(fs.readFileSync('data/matthew/1/4.json', 'utf8'));
const conflicts = JSON.parse(fs.readFileSync('data/verse-verification/matthew.json', 'utf8')).verses['1:4'].sources.papyrus.conflicts;
const p1Cell = (rowId: string): PapyrusCellType => matthew4.rows.find((row: { id: string }) => row.id === rowId).papyrus;

describe('PapyrusCell', () => {
  it('renders source text for extant cells', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [{ id: 'P66', date: 'c. 175–225 CE' }],
      text: 'Ἐν',
    };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    expect(screen.getByText('Ἐν')).toBeInTheDocument();
    expect(screen.getByText('P66')).toBeInTheDocument();
  });

  it('renders "lost" label for lost cells', () => {
    const cell: PapyrusCellType = { type: 'lost' };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    expect(screen.getByText('lost')).toBeInTheDocument();
  });

  it('renders nomina sacra contraction, not expansion', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [{ id: 'P1', date: 'c. 250 CE' }],
      text: 'ΙΥ',
      nominaSacra: { contraction: 'ΙΥ', expansion: 'Ἰησοῦ' },
    };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    expect(screen.getByText('ΙΥ')).toBeInTheDocument();
    expect(screen.queryByText('Ἰησοῦ')).not.toBeInTheDocument();
    expect(screen.getByTitle('Ἰησοῦ')).toBeInTheDocument();
  });

  it('renders a compact damaged label inside the papyrus text cell', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [{ id: 'P66', date: 'c. 175–225 CE' }],
      text: 'αληθια',
      condition: { damaged: true, damagedAfter: [3] },
    };
    const { container } = render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    const label = screen.getByText('damaged');
    expect(label).toHaveClass('text-semantic-damaged', 'whitespace-nowrap');
    expect(label.closest('td')).toBe(container.querySelector('td'));
  });

  it('links damaged only when an exact free image has been verified', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [{ id: 'P66', date: 'c. 175–225 CE' }],
      text: 'αληθια',
      condition: {
        damaged: true,
        sourceImageUrl: 'https://example.org/free-scan/p66-folio.jpg',
      },
    };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    expect(screen.getByRole('link', { name: /open a free image/i })).toHaveAttribute(
      'href',
      cell.condition?.sourceImageUrl,
    );
  });

  it('marks the damaged letters of Amminadab without rewriting or removing its gloss', () => {
    const cell = p1Cell('r5'), before = JSON.stringify(cell);
    const { container } = render(<table><tbody><tr><PapyrusCell cell={cell} conflicts={conflicts} /></tr></tbody></table>);
    expect(container.querySelector('[data-papyrus-text]')!.textContent).toBe('αμμιναδαβ');
    expect([...container.querySelectorAll('[data-papyrus-character="damaged"]')].map(c => c.textContent)).toEqual(['ι', 'ν']);
    expect(JSON.stringify(cell)).toBe(before);
    expect(cell.type === 'extant' && cell.gloss?.gloss).toBe('Amminadab;');
  });

  it('distinguishes missing letters, damaged traces and a conflicting transcription', () => {
    const cell = p1Cell('r15');
    const { container } = render(<table><tbody><tr><PapyrusCell cell={cell} conflicts={conflicts} /></tr></tbody></table>);
    expect(container.querySelector('[data-papyrus-text]')!.textContent).toBe('σαλ·ων');
    expect([...container.querySelectorAll('[data-papyrus-character="damaged"]')].map(c => c.textContent)).toEqual(['λ', 'ω']);
    expect(container.querySelector('[data-papyrus-character="missing"]')!.textContent).toBe('·');
    expect(container.querySelector('[data-papyrus-conflict]')!.getAttribute('title')).toContain('σαλ··ν');
    expect(cell.type === 'extant' && cell.gloss).toBeUndefined();
  });

  it('does not borrow character conditions or conflicts for a different witness or changed display', () => {
    const cell = structuredClone(p1Cell('r15'));
    if (cell.type !== 'extant') throw new Error('Expected papyrus word');
    cell.text = 'different text';
    expect(papyrusCharacters(cell)).toBeUndefined();
    cell.provenance!.governingSiglum = 'P45';
    expect(papyrusConflictNotes(cell, conflicts)).toEqual([]);
  });

  it('flags all three known Matthew 1:4 conflicts and discloses the existing nu expansion', () => {
    expect(matthew4.rows.filter((r: { papyrus: PapyrusCellType }) => papyrusConflictNotes(r.papyrus, conflicts).length).map((r: { id: string }) => r.id)).toEqual(['r1', 'r6', 'r15']);
    expect(papyrusCharacters(p1Cell('r10'))!.at(-1)).toEqual({ text: 'ν', state: 'unmarked', sourceGlyph: '¯' });
    expect(papyrusConflictNotes(p1Cell('r1'), conflicts)[0]).toContain('····');
  });
});
