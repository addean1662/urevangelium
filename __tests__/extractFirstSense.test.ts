import { describe, it, expect } from 'vitest';
import { extractFirstSense } from '@/lib/glosses/extractFirstSense';

describe('extractFirstSense', () => {
  it('splits on first comma', () => {
    expect(extractFirstSense('man, human being, person, fellow')).toBe('man');
  });
  it('splits on first comma — "and, and even"', () => {
    expect(extractFirstSense('and, and even')).toBe('and');
  });
  it('splits on first comma — "in, on, at (space)"', () => {
    expect(extractFirstSense('in, on, at (space)')).toBe('in');
  });
  it('splits on first comma — "there, in that place"', () => {
    expect(extractFirstSense('there, in that place')).toBe('there');
  });
  it('splits on first comma — "rule, guide"', () => {
    expect(extractFirstSense('rule, guide')).toBe('rule');
  });
  it('splits semicolon group first, then comma', () => {
    expect(extractFirstSense('first sense, second; completely different')).toBe('first sense');
  });
  it('no comma — returns unchanged single sense', () => {
    expect(extractFirstSense('therefore')).toBe('therefore');
  });
  it('no comma — returns unchanged multi-word sense', () => {
    expect(extractFirstSense('again')).toBe('again');
  });
  it('preserves parenthetical qualifier in first sense', () => {
    expect(extractFirstSense('but (postpositive), on the other hand')).toBe('but (postpositive)');
  });
  it('handles "by (agent), from (departure...)"', () => {
    expect(extractFirstSense('by (agent), from (departure, cause)')).toBe('by (agent)');
  });
  it('empty string returns empty string', () => {
    expect(extractFirstSense('')).toBe('');
  });
  it('trims whitespace around first sense', () => {
    expect(extractFirstSense('  foo , bar ')).toBe('foo');
  });
});
