import type { NominaSacraExpansion } from '@/lib/types';

// Strong's base → case letter → uppercase Greek contraction
// Case letters match TAGNT grammar codes: N=nominative, G=genitive, D=dative, A=accusative, V=vocative
const CONTRACTIONS: Record<string, Record<string, string>> = {
  G2424: { N: 'ΙΣ', G: 'ΙΥ', D: 'ΙΥ', A: 'ΙΝ', V: 'ΙΥ' },  // Jesus
  G5547: { N: 'ΧΣ', G: 'ΧΥ', D: 'ΧΩ', A: 'ΧΝ', V: 'ΧΕ' },  // Christ
  G2316: { N: 'ΘΣ', G: 'ΘΥ', D: 'ΘΩ', A: 'ΘΝ', V: 'ΘΕ' },  // God
  G2962: { N: 'ΚΣ', G: 'ΚΥ', D: 'ΚΩ', A: 'ΚΝ', V: 'ΚΕ' },  // Lord
  G4151: { N: 'ΠΝΑ', G: 'ΠΝΣ', D: 'ΠΝΙ', A: 'ΠΝΑ', V: 'ΠΝΑ' },  // Spirit
  G3962: { N: 'ΠΡΣ', G: 'ΠΡΣ', D: 'ΠΡΙ', A: 'ΠΡΑ', V: 'ΠΡΕ' },  // Father
};

export const NOMINA_SACRA_STRONGS = new Set(Object.keys(CONTRACTIONS));

// Strip trailing disambiguation letter from TAGNT Strong's (e.g. "G2424G" → "G2424")
function baseStrong(strong: string): string {
  return strong.replace(/[A-Z]$/, '');
}

// Returns nomina sacra markup for a TAGNT word, or null if not applicable.
// expansion is the full accented Greek word from TAGNT.
export function getNominaSacra(
  strong: string,
  grammar: string,
  expansion: string,
): NominaSacraExpansion | null {
  const base = baseStrong(strong);
  const table = CONTRACTIONS[base];
  if (!table) return null;

  // Grammar: "N-GSM-P" → case is first char of second segment
  const caseLetter = grammar.split('-')[1]?.[0]?.toUpperCase() ?? 'N';
  const contraction = table[caseLetter] ?? table['N'];
  if (!contraction) return null;

  return { contraction, expansion };
}
