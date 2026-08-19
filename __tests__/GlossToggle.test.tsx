import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import { GlossCell } from '@/components/AlignmentTable/GlossCell';
import type { VerseData, GlossCell as GlossCellType } from '@/lib/types';

import matthewData from '@/data/matthew/1/1.json';
import markData from '@/data/mark/1/1.json';

describe('AlignmentTable — witness header band token', () => {
  it('witness header row uses bg-witness-band, not bg-band', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    const headerRow = container.querySelectorAll('thead tr')[1];
    expect(headerRow?.className).toContain('bg-witness-band');
    expect(headerRow?.className).not.toMatch(/(?<![a-z-])bg-band(?![a-z-])/);
  });
});

describe('AlignmentTable — seven-tradition always-on layout', () => {
  it('renders seven tradition and seven witness headers', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    expect(container.querySelectorAll('thead tr')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader')).toHaveLength(14);
  });

  it('shows gloss source names in primary headers', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('TAGNT').length).toBeGreaterThan(0);
    expect(screen.queryByText('Whitaker')).toBeNull();
    expect(screen.getByText(/Clementine 1592\/1598/)).toBeInTheDocument();
    expect(screen.getByText('PayneSmith')).toBeInTheDocument();
  });

  it('does not render a Show/Hide glosses button', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.queryByRole('button', { name: /glosses/i })).toBeNull();
  });
});

describe('AlignmentTable — gloss content always visible', () => {
  it('shows English glosses on initial render (Matthew 1:1)', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('book').length).toBeGreaterThan(0);
    expect(screen.getAllByText('of the generation').length).toBeGreaterThan(0);
    expect(screen.queryByText('of his generation')).toBeNull();
  });

  it('shows "no gloss" dash cells for alignment-gap rows (Mark 1:1 τοῦ row)', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    const noGlossCells = screen.getAllByLabelText('no gloss');
    expect(noGlossCells.length).toBeGreaterThan(0);
  });

  it('does not carry the former Douay-Rheims/Whitaker Vulgate English layer', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    expect(screen.queryByText('DouayRheims')).toBeNull();
    expect(screen.queryByText('Whitaker')).toBeNull();
  });
});

describe('GlossCell — unit', () => {
  it('renders dash with aria-label when gloss is null', () => {
    render(<table><tbody><tr><GlossCell gloss={null} /></tr></tbody></table>);
    expect(screen.getByLabelText('no gloss')).toBeInTheDocument();
    expect(screen.getByLabelText('no gloss')).toHaveTextContent('—');
  });

  it('renders gloss text when gloss is provided', () => {
    const gloss: GlossCellType = { gloss: 'beginning', source: 'TAGNT' };
    render(<table><tbody><tr><GlossCell gloss={gloss} /></tr></tbody></table>);
    expect(screen.getByText('beginning')).toBeInTheDocument();
    expect(screen.queryByLabelText('no gloss')).toBeNull();
  });

  it('renders deviation badge when deviation is true', () => {
    const gloss: GlossCellType = { gloss: 'God', source: 'DouayRheims', deviation: true };
    render(<table><tbody><tr><GlossCell gloss={gloss} /></tr></tbody></table>);
    expect(screen.getByText('God')).toBeInTheDocument();
    expect(screen.getByText('DouayRheims')).toBeInTheDocument();
  });

  it('does not render deviation badge when deviation is false or absent', () => {
    const gloss: GlossCellType = { gloss: 'book', source: 'TAGNT' };
    render(<table><tbody><tr><GlossCell gloss={gloss} /></tr></tbody></table>);
    expect(screen.queryByText('TAGNT')).toBeNull();
  });
});
