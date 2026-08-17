import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PapyrusCell } from '@/components/AlignmentTable/PapyrusCell';
import type { PapyrusCell as PapyrusCellType } from '@/lib/types';

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
});
