import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PapyrusCell } from '@/components/AlignmentTable/PapyrusCell';
import type { PapyrusCell as PapyrusCellType } from '@/lib/types';

describe('PapyrusCell', () => {
  it('shows fragment ID badge for extant cells', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [{ id: 'P66', date: 'c. 175–225 CE' }],
      text: 'Ἐν',
    };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    expect(screen.getByText('P66')).toBeInTheDocument();
    expect(screen.getByText('Ἐν')).toBeInTheDocument();
  });

  it('shows both fragment IDs joined by · for multi-papyrus cells', () => {
    const cell: PapyrusCellType = {
      type: 'extant',
      fragments: [
        { id: 'P66', date: 'c. 175–225 CE' },
        { id: 'P75', date: 'c. 175–225 CE' },
      ],
      text: 'ἀρχῇ',
    };
    render(<table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>);
    const badge = screen.getByText('P66 · P75');
    expect(badge).toBeInTheDocument();
  });

  it('renders lost dots for lost cells', () => {
    const cell: PapyrusCellType = { type: 'lost' };
    const { container } = render(
      <table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>
    );
    expect(container.querySelector('td')?.textContent).toContain('·');
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
});
