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
    // Fragment badge has moved to IndicatorCell — not rendered in PapyrusCell
    expect(screen.queryByText('P66')).toBeNull();
  });

  it('renders an empty cell for lost cells (dot indicator lives in IndicatorCell)', () => {
    const cell: PapyrusCellType = { type: 'lost' };
    const { container } = render(
      <table><tbody><tr><PapyrusCell cell={cell} /></tr></tbody></table>
    );
    expect(container.querySelector('td')?.textContent?.trim()).toBe('');
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
