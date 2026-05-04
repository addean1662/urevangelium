import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SiteHeader } from '@/components/SiteHeader';

describe('SiteHeader', () => {
  it('renders the Urevangelium wordmark', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Urevangelium');
  });

  it('renders the pronunciation and translation subtitle', () => {
    render(<SiteHeader />);
    expect(screen.getByText(/ur-eh-van-GAY-lee-um/)).toBeInTheDocument();
    expect(screen.getByText(/the original Gospel/)).toBeInTheDocument();
  });

  it('renders the canonical project tagline', () => {
    render(<SiteHeader />);
    expect(
      screen.getByText(/The Gospels across their earliest witnesses, and the tradition they carried forward/)
    ).toBeInTheDocument();
  });

  it('site header uses bg-band (deepest wood spine)', () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('bg-band');
  });

  it('subtitle is beneath the wordmark — not to its right', () => {
    const { container } = render(<SiteHeader />);
    const wordmark = container.querySelector('h1');
    const subtitle = container.querySelector('h1 + span');
    expect(subtitle).not.toBeNull();
    expect(subtitle?.textContent).toMatch(/ur-eh-van-GAY-lee-um/);
    // Both wordmark and subtitle share a flex-col parent
    expect(wordmark?.parentElement?.className).toContain('flex-col');
  });
});
