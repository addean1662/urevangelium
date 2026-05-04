import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SiteFooter } from '@/components/SiteFooter';

describe('SiteFooter — source attributions', () => {
  it('credits Center for New Testament Restoration (CNTR)', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/CNTR/)).toBeInTheDocument();
  });

  it('credits Robinson-Pierpont Byzantine Textform', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Robinson-Pierpont/)).toBeInTheDocument();
  });

  it('credits Clementine Vulgate', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Clementine Vulgate/)).toBeInTheDocument();
  });

  it('credits Peshitta', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Peshitta/)).toBeInTheDocument();
  });

  it('credits TAGNT (STEP Bible)', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/TAGNT/)).toBeInTheDocument();
  });

  it("credits Whitaker's Words", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Whitaker/)).toBeInTheDocument();
  });

  it('credits Payne Smith Syriac dictionary', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Payne Smith/)).toBeInTheDocument();
  });
});

describe('SiteFooter — license statement', () => {
  it('names CC BY-SA 4.0 in the license section', () => {
    render(<SiteFooter />);
    expect(screen.getAllByText(/CC BY-SA 4\.0/).length).toBeGreaterThan(0);
  });

  it('names Creative Commons Attribution-ShareAlike', () => {
    render(<SiteFooter />);
    expect(screen.getAllByText(/Creative Commons Attribution-ShareAlike/).length).toBeGreaterThan(0);
  });
});

describe('SiteFooter — hyperlinks', () => {
  it('links to greekcntr.org', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /greekcntr\.org/ });
    expect(link).toHaveAttribute('href', 'https://greekcntr.org');
  });

  it('links to byzantinetext.com', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /byzantinetext\.com/ });
    expect(link).toHaveAttribute('href', 'https://byzantinetext.com');
  });

  it('links to the CC BY-SA 4.0 deed', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /Creative Commons Attribution-ShareAlike/ });
    expect(link).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
  });
});

describe('SiteFooter — layout and structure', () => {
  it('renders a footer landmark element', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('applies two-column grid class for large viewports', () => {
    const { container } = render(<SiteFooter />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('lg:grid-cols-2');
  });

  it('has a top border to separate footer from content', () => {
    const { container } = render(<SiteFooter />);
    const footer = container.querySelector('footer');
    expect(footer?.className).toContain('border-t');
  });

  it('shows the copyright notice', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/© 2026 Urevangelium/)).toBeInTheDocument();
  });
});
