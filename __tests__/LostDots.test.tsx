import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LostDots } from '@/components/AlignmentTable/LostDots';

describe('LostDots', () => {
  it('renders red dot characters', () => {
    const { container } = render(<LostDots />);
    const span = container.querySelector('span');
    expect(span?.textContent).toContain('·');
  });

  it('has aria-label describing the lacuna', () => {
    const { container } = render(<LostDots />);
    const span = container.querySelector('span');
    expect(span?.getAttribute('aria-label')).toMatch(/not extant/i);
  });

  it('applies semantic-lacuna text color class', () => {
    const { container } = render(<LostDots />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('semantic-lacuna');
  });
});
