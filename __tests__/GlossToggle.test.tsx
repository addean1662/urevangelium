import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import { GlossCell } from '@/components/AlignmentTable/GlossCell';
import type { VerseData, GlossCell as GlossCellType } from '@/lib/types';

import matthewData from '@/data/matthew/1/1.json';
import markData from '@/data/mark/1/1.json';

describe('GlossToggle — button state', () => {
  it('renders "Show glosses" button by default', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    const btn = screen.getByRole('button', { name: /show glosses/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles to "Hide glosses" on click', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    const btn = screen.getByRole('button', { name: /show glosses/i });
    await user.click(btn);
    expect(screen.getByRole('button', { name: /hide glosses/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns to "Show glosses" on second click', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    const btn = screen.getByRole('button', { name: /show glosses/i });
    await user.click(btn);
    await user.click(screen.getByRole('button', { name: /hide glosses/i }));
    expect(screen.getByRole('button', { name: /show glosses/i })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('GlossToggle — 12-column layout', () => {
  it('renders 6 column headers when glosses are hidden', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(6);
  });

  it('renders 12 column headers when glosses are shown', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    const headers = screen.getAllByRole('columnheader');
    // 6 primary + 6 sub-headers (Text / Gloss · Source)
    expect(headers.length).toBeGreaterThanOrEqual(12);
  });

  it('shows gloss sub-headers with correct lexicon names', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    expect(screen.getAllByText(/Gloss · TAGNT/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Gloss · Whitaker/i)).toBeInTheDocument();
    expect(screen.getByText(/Gloss · PayneSmith/i)).toBeInTheDocument();
  });

  it('shows Text sub-headers for each witness', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    const textHeaders = screen.getAllByText('Text');
    expect(textHeaders).toHaveLength(6);
  });
});

describe('GlossToggle — gloss content', () => {
  it('shows English glosses after toggling on (Matthew 1:1)', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={matthewData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    // Greek gloss for Βίβλος
    expect(screen.getAllByText('book').length).toBeGreaterThan(0);
    // Latin gloss from DouayRheims
    expect(screen.getAllByText('of the generation').length).toBeGreaterThan(0);
    // Syriac gloss
    expect(screen.getAllByText('of his generation').length).toBeGreaterThan(0);
  });

  it('shows "no gloss" dash cells for alignment-gap rows (Mark 1:1 τοῦ row)', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={markData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    const noGlossCells = screen.getAllByLabelText('no gloss');
    expect(noGlossCells.length).toBeGreaterThan(0);
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
    const badge = screen.getByText('DouayRheims');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Non-default source: DouayRheims');
  });

  it('does not render deviation badge when deviation is false or absent', () => {
    const gloss: GlossCellType = { gloss: 'book', source: 'TAGNT' };
    render(<table><tbody><tr><GlossCell gloss={gloss} /></tr></tbody></table>);
    expect(screen.queryByTitle(/Non-default source/i)).toBeNull();
  });

  it('renders deviation badge for Mark 1:1 r7 ΘΥ Greek cells', async () => {
    const user = userEvent.setup();
    render(<AlignmentTable data={markData as VerseData} />);
    await user.click(screen.getByRole('button', { name: /show glosses/i }));
    // Mark r7 Greek cells have deviation=true gloss "God" from DouayRheims
    const deviationBadges = screen.getAllByTitle('Non-default source: DouayRheims');
    expect(deviationBadges.length).toBeGreaterThan(0);
  });
});
