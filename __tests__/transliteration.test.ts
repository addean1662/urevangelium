import { describe, it, expect } from 'vitest';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { transliterateSyriac } from '@/lib/transliteration/syriac';

describe('transliterateGreek — basic vowels', () => {
  it('η → ē', () => {
    expect(transliterateGreek('η')).toBe('ē');
  });
  it('ω → ō', () => {
    expect(transliterateGreek('ω')).toBe('ō');
  });
  it('υ standalone → y', () => {
    expect(transliterateGreek('υ')).toBe('y');
  });
  it('α → a', () => {
    expect(transliterateGreek('α')).toBe('a');
  });
  it('ε → e', () => {
    expect(transliterateGreek('ε')).toBe('e');
  });
  it('ι → i', () => {
    expect(transliterateGreek('ι')).toBe('i');
  });
  it('ο → o', () => {
    expect(transliterateGreek('ο')).toBe('o');
  });
});

describe('transliterateGreek — digraph consonants', () => {
  it('θ → th', () => {
    expect(transliterateGreek('θ')).toBe('th');
  });
  it('φ → ph', () => {
    expect(transliterateGreek('φ')).toBe('ph');
  });
  it('χ → ch', () => {
    expect(transliterateGreek('χ')).toBe('ch');
  });
  it('ψ → ps', () => {
    expect(transliterateGreek('ψ')).toBe('ps');
  });
});

describe('transliterateGreek — diphthongs', () => {
  it('αι → ai', () => {
    expect(transliterateGreek('αι')).toBe('ai');
  });
  it('ει → ei', () => {
    expect(transliterateGreek('ει')).toBe('ei');
  });
  it('οι → oi', () => {
    expect(transliterateGreek('οι')).toBe('oi');
  });
  it('αυ → au', () => {
    expect(transliterateGreek('αυ')).toBe('au');
  });
  it('ευ → eu', () => {
    expect(transliterateGreek('ευ')).toBe('eu');
  });
  it('ου → ou', () => {
    expect(transliterateGreek('ου')).toBe('ou');
  });
});

describe('transliterateGreek — breathings and accents', () => {
  it('rough breathing → h prefix (ἁ)', () => {
    expect(transliterateGreek('ἁ')).toBe('ha');
  });
  it('smooth breathing is silent (ἀ)', () => {
    expect(transliterateGreek('ἀ')).toBe('a');
  });
  it('acute accent preserved (ά)', () => {
    expect(transliterateGreek('ά')).toBe('á');
  });
  it('grave accent preserved (ὰ)', () => {
    expect(transliterateGreek('ὰ')).toBe('à');
  });
  it('circumflex preserved (χεῖρα contains eî)', () => {
    const result = transliterateGreek('χεῖρα');
    expect(result).toContain('eî');
  });
  it('rough breathing on rho → rh', () => {
    expect(transliterateGreek('ῥ')).toBe('rh');
  });
});

describe('transliterateGreek — gamma nasal rule', () => {
  it('γγ → ng', () => {
    expect(transliterateGreek('γγ')).toBe('ng');
  });
  it('γκ → nk', () => {
    expect(transliterateGreek('γκ')).toBe('nk');
  });
  it('γχ → nch', () => {
    expect(transliterateGreek('γχ')).toBe('nch');
  });
});

describe('transliterateGreek — full words from spec examples', () => {
  it('ἄνθρωπος → ánthrōpos', () => {
    expect(transliterateGreek('ἄνθρωπος')).toBe('ánthrōpos');
  });
  it('εἰσῆλθεν starts with eis', () => {
    expect(transliterateGreek('εἰσῆλθεν')).toMatch(/^eis/);
  });
  it('Ἰησοῦ → Iēsoû', () => {
    expect(transliterateGreek('Ἰησοῦ')).toBe('Iēsoû');
  });
  it('capital Κ renders as K', () => {
    expect(transliterateGreek('Κ')).toBe('K');
  });
  it('iota subscript appends i (ᾳ → ai)', () => {
    expect(transliterateGreek('ᾳ')).toBe('ai');
  });
  it('empty string returns empty', () => {
    expect(transliterateGreek('')).toBe('');
  });
});

describe('transliterateSyriac', () => {
  it('yodh → y', () => {
    expect(transliterateSyriac('ܝ')).toBe('y');
  });
  it('shin → š', () => {
    expect(transliterateSyriac('ܫ')).toBe('š');
  });
  it('ܝܫܘܥ contains y, š, w, ʿ', () => {
    const result = transliterateSyriac('ܝܫܘܥ');
    expect(result).toContain('y');
    expect(result).toContain('š');
    expect(result).toContain('w');
    expect(result).toContain('ʿ');
  });
  it('ܠܟܢܘܫܬܐ starts with l', () => {
    expect(transliterateSyriac('ܠܟܢܘܫܬܐ')).toMatch(/^l/);
  });
  it('heth → ḥ', () => {
    expect(transliterateSyriac('ܚ')).toBe('ḥ');
  });
  it('empty string returns empty', () => {
    expect(transliterateSyriac('')).toBe('');
  });
});
