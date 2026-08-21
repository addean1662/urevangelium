import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import { PapyrusIndicator } from '@/components/AlignmentTable/IndicatorCell';
import { PapyrusCell } from '@/components/AlignmentTable/PapyrusCell';
import type { VerseData } from '@/lib/types';

import matthewData from '@/data/matthew/1/1.json';
import markData from '@/data/mark/1/1.json';
import lukeData from '@/data/luke/1/1.json';
import johnData from '@/data/john/1/1.json';

describe('AlignmentTable — column headers', () => {
  it('renders seven tradition bands and seven primary witness headers', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    const rows = container.querySelectorAll('thead tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll('th')).toHaveLength(7);
    const witnessHeaders = rows[1].querySelectorAll('th');
    expect(witnessHeaders).toHaveLength(7);
    const labels = Array.from(witnessHeaders).map((header) => header.textContent ?? '');
    for (const label of ['Earliest Papyri', 'Sahidic', 'Vaticanus', 'Vulgate', 'Bezae', 'Peshitta', 'Byzantine']) {
      expect(labels.some((value) => value.includes(label))).toBe(true);
    }
  });
});

describe('papyrus condition presentation', () => {
  const suppliedDamaged = {
    type: 'extant' as const,
    fragments: [{ id: 'P1' as const, date: 'c. 250 CE' }],
    text: 'λογος',
    condition: { damaged: true, supplied: 'editor' as const, missingAfter: [2] },
  };

  it('keeps a damaged supplied reading green because the word is displayed', () => {
    const { container } = render(<table><tbody><tr><PapyrusIndicator cell={suppliedDamaged} /></tr></tbody></table>);
    expect(container.querySelector('.bg-semantic-extant')).toBeInTheDocument();
    expect(container.querySelector('.bg-semantic-lacuna')).toBeNull();
  });

  it('shows damaged but does not repeat supplied or missing labels', () => {
    render(<table><tbody><tr><PapyrusCell cell={suppliedDamaged} /></tr></tbody></table>);
    expect(screen.getByText('damaged')).toBeInTheDocument();
    expect(screen.queryByText('supplied')).toBeNull();
    expect(screen.queryByText('missing/supplied')).toBeNull();
  });
});

describe('Matthew 1:1 proof row', () => {
  it('renders the admitted Horner English across all eight Sahidic word-groups', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    const allocated = [...container.querySelectorAll('td[title*="display allocation within translation unit horner-matt-1-1-control-candidate"]')];
    expect(allocated.map((cell) => cell.textContent)).toEqual([
      'The book', 'of the generation', 'of Jesus', 'the Christ,',
      'the son', 'of Daveid,', 'the son', 'of Abraham.',
    ]);
    expect(container.querySelector('[rowspan="8"]')).toBeNull();
    expect(container.textContent).not.toContain('↳');
  });

  it('renders P1 papyrus indicator for Matthew 1:1', () => {
    const { container } = render(<AlignmentTable data={matthewData as VerseData} />);
    expect(container.querySelectorAll('[title*="P1"]').length).toBeGreaterThan(0);
  });

  it('preserves Vaticanus nomina sacra and the expanded RP2018 Byzantine forms', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('ιυ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('χυ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ἰησοῦ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('χριστοῦ').length).toBeGreaterThan(0);
  });

  it('displays the RP2018 expansion Ἰησοῦ as Byzantine source text', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('Ἰησοῦ').length).toBeGreaterThan(0);
  });

  it('renders Greek, Latin, and Syriac text', () => {
    render(<AlignmentTable data={matthewData as VerseData} />);
    expect(screen.getAllByText('Βίβλος').length).toBeGreaterThan(0);
    expect(screen.getByText('Liber')).toBeInTheDocument();
    expect(document.querySelectorAll('td[lang="syr"]').length).toBeGreaterThan(0);
  });
});

describe('Mark 1:1 proof row', () => {
  it('does not falsely assign P45 to the unattested opening of Mark 1:1', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    expect(screen.queryByText(/P45/)).toBeNull();
    expect(screen.getAllByText('lost').length).toBeGreaterThan(0);
  });

  it('renders alignment-gap dashes for Greek article τοῦ row', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    const gaps = screen.getAllByLabelText('alignment gap');
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('preserves Vaticanus θυ and renders RP2018 θεοῦ', () => {
    render(<AlignmentTable data={markData as VerseData} />);
    expect(screen.getAllByText('θυ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('θεοῦ').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('sunt').length).toBeGreaterThan(0);
  });
});

describe('John 1:1 proof row — multi-papyrus and nomina sacra', () => {
  it('renders P66 · P75 papyrus indicator for John 1:1 (both fragments in tooltip)', () => {
    render(<AlignmentTable data={johnData as VerseData} />);
    expect(screen.getAllByText(/P66/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/P75/).length).toBeGreaterThan(0);
  });

  it('renders the papyrus diplomatic ΘΝ contraction', () => {
    render(<AlignmentTable data={johnData as VerseData} />);
    expect(screen.getAllByText('θν').length).toBeGreaterThan(0);
  });

  it('renders the papyrus diplomatic ΘΣ contraction', () => {
    render(<AlignmentTable data={johnData as VerseData} />);
    expect(screen.getAllByText('θσ').length).toBeGreaterThan(0);
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
    const { buildPassagePath } = await import('@/lib/passageNav');
    expect(buildPassagePath('john', 1, 1)).toBe('/john/1/1');
    expect(buildPassagePath('matthew', 3, 16)).toBe('/matthew/3/16');
  });

  it('nextVerse increments within chapter', async () => {
    const { nextVerse } = await import('@/lib/passageNav');
    const counts = [31, 25];
    expect(nextVerse('john', 1, 1, counts)).toBe('/john/1/2');
    expect(nextVerse('john', 1, 31, counts)).toBe('/john/2/1');
    expect(nextVerse('john', 2, 25, counts)).toBeNull();
  });

  it('prevVerse decrements within chapter', async () => {
    const { prevVerse } = await import('@/lib/passageNav');
    const counts = [31, 25];
    expect(prevVerse('john', 1, 5, counts)).toBe('/john/1/4');
    expect(prevVerse('john', 2, 1, counts)).toBe('/john/1/31');
    expect(prevVerse('john', 1, 1, counts)).toBeNull();
  });
});
