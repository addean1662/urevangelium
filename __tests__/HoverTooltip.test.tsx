import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HoverTooltip } from '@/components/HoverTooltip';

describe('HoverTooltip', () => {
  it('renders children without tooltip content initially', () => {
    render(
      <HoverTooltip content={<span>tooltip text</span>}>
        <span>trigger text</span>
      </HoverTooltip>
    );
    expect(screen.getByText('trigger text')).toBeInTheDocument();
    expect(screen.queryByText('tooltip text')).toBeNull();
  });

  it('shows tooltip content on mouse enter', () => {
    render(
      <HoverTooltip content={<span>tooltip text</span>}>
        <span>trigger text</span>
      </HoverTooltip>
    );
    const trigger = screen.getByText('trigger text').parentElement!;
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('tooltip text')).toBeInTheDocument();
  });

  it('hides tooltip content on mouse leave', () => {
    render(
      <HoverTooltip content={<span>tooltip text</span>}>
        <span>trigger text</span>
      </HoverTooltip>
    );
    const trigger = screen.getByText('trigger text').parentElement!;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText('tooltip text')).toBeNull();
  });

  it('does not render tooltip when content is null', () => {
    render(
      <HoverTooltip content={null}>
        <span>trigger text</span>
      </HoverTooltip>
    );
    const trigger = screen.getByText('trigger text').parentElement!;
    fireEvent.mouseEnter(trigger);
    // No tooltip span should appear
    const fixed = document.querySelector('span[style*="position: fixed"]');
    expect(fixed).toBeNull();
  });

  it('renders string content in tooltip', () => {
    render(
      <HoverTooltip content="plain string tooltip">
        <span>trigger</span>
      </HoverTooltip>
    );
    const trigger = screen.getByText('trigger').parentElement!;
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('plain string tooltip')).toBeInTheDocument();
  });
});

describe('mark/3/1 Vulgate gloss brevity', () => {
  it('homo gloss is "man" not the full multi-sense string', async () => {
    const markData = await import('@/data/cache/mark/3/1.json');
    const homoRow = (markData as { rows: Array<{ vulgate: { type: string; text?: string; gloss?: { gloss: string } } }> }).rows.find(
      r => r.vulgate.type === 'text' && r.vulgate.text === 'homo'
    );
    expect(homoRow).toBeDefined();
    expect(homoRow!.vulgate.gloss?.gloss).toBe('man');
  });

  it('Et gloss is "and" not the full multi-sense string', async () => {
    const markData = await import('@/data/cache/mark/3/1.json');
    const etRow = (markData as { rows: Array<{ vulgate: { type: string; text?: string; gloss?: { gloss: string } } }> }).rows.find(
      r => r.vulgate.type === 'text' && r.vulgate.text === 'Et'
    );
    expect(etRow).toBeDefined();
    expect(etRow!.vulgate.gloss?.gloss).toBe('and');
  });
});
