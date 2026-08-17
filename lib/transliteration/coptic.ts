// Sahidic Coptic phonetic romanization
// Convention follows Layton, A Coptic Grammar (3rd ed., 2011).
// Handles both the Coptic Unicode block (U+2C80–U+2CBF) and the older
// Greek-block Coptic letters (U+03E2–U+03EF) used in many digital corpora.

// Lowercase Coptic character → romanized form
const BASE: Record<string, string> = {
  // ── Coptic Unicode block (U+2C80–U+2CB1) ─────────────────────────────────
  'ⲁ': 'a',   // alfa
  'ⲃ': 'b',   // vida
  'ⲅ': 'g',   // gamma
  'ⲇ': 'd',   // dalda
  'ⲉ': 'e',   // ei
  'ⲋ': 'st',  // soou (rare digraph letter)
  'ⲍ': 'z',   // zēta
  'ⲏ': 'ē',   // ēta
  'ⲑ': 'th',  // thēta
  'ⲓ': 'i',   // yōta
  'ⲕ': 'k',   // kappa
  'ⲗ': 'l',   // lauda
  'ⲙ': 'm',   // mi
  'ⲛ': 'n',   // ni
  'ⲝ': 'ks',  // ksi
  'ⲟ': 'o',   // o
  'ⲡ': 'p',   // pi
  'ⲣ': 'r',   // ro
  'ⲥ': 's',   // sima
  'ⲧ': 't',   // tau
  'ⲩ': 'u',   // upsilon (Greek loanwords)
  'ⲫ': 'ph',  // phi
  'ⲭ': 'kh',  // khi
  'ⲯ': 'ps',  // psi
  'ⲱ': 'ō',   // ōmega

  // ── Greek-block Coptic letters (U+03E2–U+03EF) ───────────────────────────
  // These are the same phonemes encoded in the older Greek-block allocation.
  'ϣ': 'sh',  // shai   (U+03E3)
  'ϥ': 'f',   // fai    (U+03E5)
  'ϧ': 'kh',  // khei   (U+03E7) — Akhmimic, rare in Sahidic
  'ϩ': 'h',   // hori   (U+03E9)
  'ϫ': 'j',   // gangia (U+03EB)
  'ϭ': 'č',   // shima  (U+03ED)
  'ϯ': 'ti',  // dei    (U+03EF)
};

// Combining marks to silently skip (supralinear strokes, diacritics)
const SKIP_CP = new Set([
  0x0300, // COMBINING GRAVE ACCENT
  0x0301, // COMBINING ACUTE ACCENT
  0x0302, // COMBINING CIRCUMFLEX ACCENT
  0x0304, // COMBINING MACRON
  0x0305, // COMBINING OVERLINE (Coptic supralinear stroke)
  0x0308, // COMBINING DIAERESIS
  0xFE26, // COMBINING CONJOINING MACRON
]);

function isUpperCoptic(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  // Coptic block: U+2C80–U+2CBF — even = uppercase, odd = lowercase
  if (cp >= 0x2C80 && cp <= 0x2CBF) return cp % 2 === 0;
  // Greek-block Coptic: U+03E2–U+03EF — even = uppercase, odd = lowercase
  if (cp >= 0x03E2 && cp <= 0x03EF) return cp % 2 === 0;
  return false;
}

function toLowerCoptic(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x2C80 && cp <= 0x2CBF && cp % 2 === 0) return String.fromCodePoint(cp + 1);
  if (cp >= 0x03E2 && cp <= 0x03EF && cp % 2 === 0) return String.fromCodePoint(cp + 1);
  return ch;
}

export function transliterateCoptic(text: string): string {
  if (!text) return '';

  const parts: string[] = [];

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;

    // Skip combining marks
    if (SKIP_CP.has(cp)) continue;

    const lower = toLowerCoptic(ch);
    const roman = BASE[lower];

    if (!roman) {
      // Preserve spaces; skip all other non-Coptic characters (brackets, digits, etc.)
      if (ch === ' ') parts.push(' ');
      continue;
    }

    if (isUpperCoptic(ch)) {
      parts.push(roman.charAt(0).toUpperCase() + roman.slice(1));
    } else {
      parts.push(roman);
    }
  }

  return parts.join('');
}
