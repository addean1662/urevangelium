import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import type { VerseData } from '@/lib/types';

import matthewData from '@/data/matthew/1/1.json';
import markData from '@/data/mark/1/1.json';
import lukeData from '@/data/luke/1/1.json';
import johnData from '@/data/john/1/1.json';

describe('AlignmentTable — column headers', () => {
  it('renders all six witness headers in order', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    const headers = screen.getAllByRole('columnheader');
    // 6 primary headers only — sub-header row removed
    expect(headers).toHaveLength(6);
    const labels = headers.map((h) => h.textContent ?? '');
    expect(labels[0]).toMatch(/Earliest Papyrus/i);
    expect(labels[1]).toMatch(/Vaticanus/i);
    expect(labels[2]).toMatch(/Sinaiticus/i);
    expect(labels[3]).toMatch(/Vulgate/i);
    expect(labels[4]).toMatch(/Peshitta/i);
    expect(labels[5]).toMatch(/Byzantine/i);
  });
});

describe('Matthew 1:1 proof row', () => {
  it('renders P1 papyrus indicator for Matthew 1:1', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    expect(container.querySelectorAll('[title*="P1"]').length).toBeGreaterThan(0);
  });

  it('shows nomina sacra contractions ΙΥ and ΧΥ', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('ΙΥ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ΧΥ').length).toBeGreaterThan(0);
  });

  it('does not display the expansion Ἰησοῦ as bare text', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    // Ἰησοῦ should only appear in title/aria attrs, not as visible text node
    const expanded = screen.queryAllByText('Ἰησοῦ');
    expect(expanded).toHaveLength(0);
  });

  it('renders Greek, Latin, and Syriac text', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('Βίβλος').length).toBeGreaterThan(0);
    expect(screen.getByText('Liber')).toBeInTheDocument();
    expect(screen.getAllByText('ܣܦܪܐ').length).toBeGreaterThan(0);
  });
});

describe('Mark 1:1 proof row', () => {
  it('renders P45 papyrus indicator for Mark 1:1', () => {
    const { container } = render(<AlignmentTable data={markData as VerseData} />);
    expect(container.querySelectorAll('[title*="P45"]').length).toBeGreaterThan(0);
  });

  it('renders alignment-gap dashes for Greek article τοῦ row', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    const gaps = screen.getAllByLabelText('alignment gap');
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('renders ΘΥ nomina sacra', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    expect(screen.getAllByText('ΘΥ').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('θεοῦ').length).toBeGreaterThan(0);
  });
});

describe('Luke 1:1 proof row — lost-dots acceptance test', () => {
  it('renders red papyrus indicator for every row (no extant papyrus in Luke 1:1)', () => {
    const { container } = render(<AlignmentTable data={lukeData as VerseData} />);
    // PapyrusIndicator renders aria-label="papyrus not extant — …" for lost cells
    const lostSpans = container.querySelectorAll('span[aria-label*="not extant"]');
    expect(lostSpans.length).toBe(lukeData.rows.length);
  });

  it('does not render any papyrus fragment badge for Luke 1:1', () => {
    render(<AlignmentTable data={lukeData as VerseData} />);
    // No fragment ID badge text should appear
    expect(screen.queryByText(/^P\d+/)).toBeNull();
  });

  it('renders the Latin two-word expansion: conati and sunt on separate rows', () => {
    render(<AlignmentTable data={lukeData as VerseData} />);
    expect(screen.getByText('conati')).toBeInTheDocument();
    expect(screen.getByText('sunt')).toBeInTheDocument();
  });
});

describe('John 1:1 proof row — multi-papyrus and nomina sacra', () => {
  it('renders P66 · P75 papyrus indicator for John 1:1 (both fragments in tooltip)', () => {
    const { container } = render(<AlignmentTable data={johnData as VerseData} />);
    expect(container.querySelectorAll('[title*="P66"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[title*="P75"]').length).toBeGreaterThan(0);
  });

  it('renders ΘΝ nomina sacra (accusative θεόν)', () => {
    render(<AlignmentTable data={johnData as VerseData} />);
    expect(screen.getAllByText('ΘΝ').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('θεόν').length).toBeGreaterThan(0);
  });

  it('renders ΘΣ nomina sacra (nominative θεὸς)', () => {
    render(<AlignmentTable data={johnData as VerseData} />);
    expect(screen.getAllByText('ΘΣ').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('θεὸς').length).toBeGreaterThan(0);
  });

  it('renders lost-dots for papyrus-empty rows (Syriac auxiliary ܗܘܐ rows)', () => {
    const { container } = render(<AlignmentTable data={johnData as VerseData} />);
    const lostSpans = container.querySelectorAll('span[aria-label*="not extant"]');
    expect(lostSpans.length).toBeGreaterThan(0);
  });

  it('renders Syriac text in cells without propagating RTL to table', () => {
    const { container } = render(<AlignmentTable data={johnData as VerseData} />);
    const table = container.querySelector('table');
    expect(table?.getAttribute('dir')).toBeNull();
    // At least one td should have dir=rtl (Syriac column)
    const rtlTds = container.querySelectorAll('td[dir="rtl"]');
    expect(rtlTds.length).toBeGreaterThan(0);
  });
});

describe('data module helpers', () => {
  it('buildPassagePath produces correct URLs', async () => {
    const { buildPassagePath } = await import('@/lib/data');
    expect(buildPassagePath('john', 1, 1)).toBe('/john/1/1');
    expect(buildPassagePath('matthew', 3, 16)).toBe('/matthew/3/16');
  });

  it('nextVerse increments within chapter', async () => {
    const { nextVerse } = await import('@/lib/data');
    const counts = [31, 25];
    expect(nextVerse('john', 1, 1, counts)).toBe('/john/1/2');
    expect(nextVerse('john', 1, 31, counts)).toBe('/john/2/1');
    expect(nextVerse('john', 2, 25, counts)).toBeNull();
  });

  it('prevVerse decrements within chapter', async () => {
    const { prevVerse } = await import('@/lib/data');
    const counts = [31, 25];
    expect(prevVerse('john', 1, 5, counts)).toBe('/john/1/4');
    expect(prevVerse('john', 2, 1, counts)).toBe('/john/1/31');
    expect(prevVerse('john', 1, 1, counts)).toBeNull();
  });
});
