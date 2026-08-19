import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyriacCell } from '@/components/AlignmentTable/SyriacCell';

describe('SyriacCell', () => {
  it('applies dir="rtl" scoped to the td for text cells', () => {
    const { container } = render(
      <table><tbody><tr>
        <SyriacCell cell={{ type: 'text', text: 'ܒܪܫܝܬ' }} />
      </tr></tbody></table>
    );
    const td = container.querySelector('td');
    expect(td?.getAttribute('dir')).toBe('rtl');
  });

  it('does not propagate RTL beyond the td — parent table has no dir attribute', () => {
    const { container } = render(
      <table><tbody><tr>
        <SyriacCell cell={{ type: 'text', text: 'ܒܪܫܝܬ' }} />
      </tr></tbody></table>
    );
    const table = container.querySelector('table');
    expect(table?.getAttribute('dir')).toBeNull();
  });

  it('renders the explicit lost-state marker', () => {
    const { container } = render(
      <table><tbody><tr>
        <SyriacCell cell={{ type: 'lost' }} />
      </tr></tbody></table>
    );
    const td = container.querySelector('td');
    expect(td?.textContent).toContain('lost');
    expect(td?.querySelector('.bg-semantic-lacuna')).not.toBeNull();
  });

  it('renders dash for empty cells (alignment gap)', () => {
    const { container } = render(
      <table><tbody><tr>
        <SyriacCell cell={{ type: 'empty' }} />
      </tr></tbody></table>
    );
    expect(container.querySelector('td')?.textContent).toContain('—');
  });

  it('displays Syriac text content', () => {
    const { container } = render(
      <table><tbody><tr>
        <SyriacCell cell={{ type: 'text', text: 'ܡܠܬܐ' }} />
      </tr></tbody></table>
    );
    expect(container.querySelector('td')?.textContent).toContain('ܡܠܬܐ');
  });
});
