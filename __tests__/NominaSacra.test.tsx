import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NominaSacra } from '@/components/AlignmentTable/NominaSacra';

describe('NominaSacra', () => {
  it('displays the contraction text, not the expansion', () => {
    render(<NominaSacra ns={{ contraction: 'ΘΣ', expansion: 'θεὸς' }} />);
    expect(screen.getByText('ΘΣ')).toBeInTheDocument();
    expect(screen.queryByText('θεὸς')).not.toBeInTheDocument();
  });

  it('exposes the expansion via title attribute (hover)', () => {
    render(<NominaSacra ns={{ contraction: 'ΘΣ', expansion: 'θεὸς' }} />);
    expect(screen.getByTitle('θεὸς')).toBeInTheDocument();
  });

  it('includes expansion in aria-label for accessibility', () => {
    const { container } = render(
      <NominaSacra ns={{ contraction: 'ΙΥ', expansion: 'Ἰησοῦ' }} />
    );
    const abbr = container.querySelector('abbr');
    expect(abbr?.getAttribute('aria-label')).toMatch(/Ἰησοῦ/);
  });

  it('renders as an abbr element', () => {
    const { container } = render(
      <NominaSacra ns={{ contraction: 'ΧΥ', expansion: 'Χριστοῦ' }} />
    );
    expect(container.querySelector('abbr')).not.toBeNull();
  });
});
