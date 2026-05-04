// Beth Mardutho / SBL standard consonantal transliteration for Syriac
// Vowel points are not present in the Peshitta source data, so this is
// a consonant-only mapping — sufficient for pronunciation guidance.

const MAP: Record<string, string> = {
  'ܐ': 'ʾ', // ܐ alaph → ʾ
  'ܒ': 'b',      // ܒ beth
  'ܓ': 'g',      // ܓ gamal
  'ܕ': 'd',      // ܕ dalath
  'ܗ': 'h',      // ܗ he
  'ܘ': 'w',      // ܘ waw
  'ܙ': 'z',      // ܙ zayn
  'ܚ': 'ḥ', // ܚ heth → ḥ
  'ܛ': 'ṭ', // ܛ teth → ṭ
  'ܝ': 'y',      // ܝ yodh
  'ܟ': 'k',      // ܟ kaph
  'ܠ': 'l',      // ܠ lamadh
  'ܡ': 'm',      // ܡ mim
  'ܢ': 'n',      // ܢ nun
  'ܣ': 's',      // ܣ semkath
  'ܤ': 's',      // ܤ final semkath
  'ܥ': 'ʿ', // ܥ ayn → ʿ
  'ܦ': 'p',      // ܦ pe
  'ܨ': 'ṣ', // ܨ sadhe → ṣ
  'ܩ': 'q',      // ܩ qaph
  'ܪ': 'r',      // ܪ rish
  'ܫ': 'š', // ܫ shin → š
  'ܬ': 't',      // ܬ taw
  // Less common forms
  'ܖ': 'r',      // ܖ dotless dalath rish
  'ܜ': 'ṭ', // ܜ teth garshuni
  'ܞ': 's',      // ܞ final semkath variant
};

export function transliterateSyriac(text: string): string {
  if (!text) return '';
  const parts: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // Skip Syriac combining diacritics and cantillation (U+0730–U+074A)
    if (cp >= 0x0730 && cp <= 0x074A) continue;
    const mapped = MAP[ch];
    if (mapped !== undefined) parts.push(mapped);
  }
  return parts.join('');
}
