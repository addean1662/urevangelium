// SBL scholarly transliteration for NT polytonic Greek
// Reference: SBL Handbook of Style (2nd ed.), Appendix E

const ROUGH_BREATHING = 0x0314;
const ACUTE           = 0x0301;
const GRAVE           = 0x0300;
const CIRCUMFLEX      = 0x0342;
const IOTA_SUB        = 0x0345;
const DIAERESIS       = 0x0308;

// lowercase Greek code point → Roman string
const BASE: Record<string, string> = {
  'α': 'a',      // α
  'β': 'b',      // β
  'γ': 'g',      // γ
  'δ': 'd',      // δ
  'ε': 'e',      // ε
  'ζ': 'z',      // ζ
  'η': 'ē', // η → ē
  'θ': 'th',     // θ
  'ι': 'i',      // ι
  'κ': 'k',      // κ
  'λ': 'l',      // λ
  'μ': 'm',      // μ
  'ν': 'n',      // ν
  'ξ': 'x',      // ξ
  'ο': 'o',      // ο
  'π': 'p',      // π
  'ρ': 'r',      // ρ
  'ς': 's',      // ς
  'σ': 's',      // σ
  'τ': 't',      // τ
  'υ': 'y',      // υ standalone; becomes 'u' in diphthongs
  'φ': 'ph',     // φ
  'χ': 'ch',     // χ
  'ψ': 'ps',     // ψ
  'ω': 'ō', // ω → ō
};

// First vowels that can open a diphthong with the second vowels in the Set
const DIPHTHONG_FIRSTS: Record<string, Set<string>> = {
  'α': new Set(['ι', 'υ']), // α + ι/υ
  'ε': new Set(['ι', 'υ']), // ε + ι/υ
  'η': new Set(['υ']),           // η + υ
  'ο': new Set(['ι', 'υ']), // ο + ι/υ
  'υ': new Set(['ι']),           // υ + ι
};

// γ before these letters → 'n' (then the consonant follows normally)
const GAMMA_NASALS = new Set(['γ', 'κ', 'ξ', 'χ']);

// Precomposed accented Roman vowels
const ACCENT: Record<'acute' | 'grave' | 'circumflex', Record<string, string>> = {
  acute: {
    'a': 'á', 'e': 'é', 'ē': 'ḗ',
    'i': 'í', 'o': 'ó', 'ō': 'ṓ',
    'u': 'ú', 'y': 'ý',
  },
  grave: {
    'a': 'à', 'e': 'è', 'ē': 'ḕ',
    'i': 'ì', 'o': 'ò', 'ō': 'ṑ',
    'u': 'ù', 'y': 'ỳ',
  },
  circumflex: {
    'a': 'â', 'e': 'ê', 'ē': 'ē̂',
    'i': 'î', 'o': 'ô', 'ō': 'ō̂',
    'u': 'û', 'y': 'ŷ',
  },
};

interface Cluster {
  baseLower: string;
  isCapital: boolean;
  rough: boolean;
  accent: 'acute' | 'grave' | 'circumflex' | null;
  iotaSub: boolean;
  diaeresis: boolean;
}

function buildClusters(text: string): Cluster[] {
  const nfd = text.normalize('NFD');
  const clusters: Cluster[] = [];
  let i = 0;

  while (i < nfd.length) {
    const ch = nfd[i];
    const chLower = ch.toLowerCase();

    if (!(chLower in BASE)) { i++; continue; }

    const cluster: Cluster = {
      baseLower: chLower,
      isCapital: ch !== chLower,
      rough: false,
      accent: null,
      iotaSub: false,
      diaeresis: false,
    };
    i++;

    while (i < nfd.length) {
      const cp = nfd.codePointAt(i)!;
      if      (cp === ROUGH_BREATHING) { cluster.rough = true;           i++; }
      else if (cp === 0x0313)          { /* smooth breathing — ignore */ i++; }
      else if (cp === ACUTE)           { cluster.accent = 'acute';       i++; }
      else if (cp === GRAVE)           { cluster.accent = 'grave';       i++; }
      else if (cp === CIRCUMFLEX)      { cluster.accent = 'circumflex';  i++; }
      else if (cp === IOTA_SUB)        { cluster.iotaSub = true;         i++; }
      else if (cp === DIAERESIS)       { cluster.diaeresis = true;       i++; }
      else if (cp === 0x0304 || cp === 0x0306) { i++; } // macron/breve — skip
      else break;
    }

    clusters.push(cluster);
  }

  return clusters;
}

// Place accent on the last accentable vowel in a Roman string
function accentLastVowel(roman: string, type: 'acute' | 'grave' | 'circumflex'): string {
  const map = ACCENT[type];
  for (let j = roman.length - 1; j >= 0; j--) {
    const mapped = map[roman[j]];
    if (mapped) return roman.slice(0, j) + mapped + roman.slice(j + 1);
  }
  return roman;
}

export function transliterateGreek(text: string): string {
  if (!text) return '';

  const clusters = buildClusters(text);
  const parts: string[] = [];
  let i = 0;

  while (i < clusters.length) {
    const c = clusters[i];
    const { baseLower, isCapital } = c;

    if (!(baseLower in BASE)) { i++; continue; }

    // γγ/γκ/γξ/γχ → emit 'n' and let the following consonant render normally
    if (baseLower === 'γ') {
      const next = clusters[i + 1];
      if (next && GAMMA_NASALS.has(next.baseLower)) {
        parts.push(isCapital ? 'N' : 'n');
        i++;
        continue;
      }
    }

    // ρ with rough breathing → rh
    if (baseLower === 'ρ' && c.rough) {
      parts.push(isCapital ? 'Rh' : 'rh');
      i++;
      continue;
    }

    // Diphthong detection: two adjacent vowels, no diaeresis, no iota subscript on first
    const next = clusters[i + 1];
    const diphFirsts = DIPHTHONG_FIRSTS[baseLower];
    const isDiph = !!diphFirsts && !c.iotaSub && !c.diaeresis &&
      next !== undefined && !next.diaeresis && diphFirsts.has(next.baseLower);

    if (isDiph) {
      const first  = BASE[baseLower];
      const second = next.baseLower === 'υ' ? 'u' : (BASE[next.baseLower] ?? '');
      let combined = first + second;

      const accent = next.accent ?? c.accent;
      if (accent) combined = accentLastVowel(combined, accent);

      const rough = c.rough || next.rough;
      if (rough) combined = (isCapital ? 'H' : 'h') + combined;

      if (next.iotaSub) combined += 'i';

      // Capitalise first letter when appropriate
      if (isCapital && !rough) {
        combined = combined.charAt(0).toUpperCase() + combined.slice(1);
      }

      parts.push(combined);
      i += 2;
      continue;
    }

    // Single character
    let roman = BASE[baseLower];

    if (c.rough) roman = (isCapital ? 'H' : 'h') + roman;
    if (c.accent) roman = accentLastVowel(roman, c.accent);
    if (c.iotaSub) roman = roman + 'i';

    if (isCapital && !c.rough) {
      roman = roman.charAt(0).toUpperCase() + roman.slice(1);
    }

    parts.push(roman);
    i++;
  }

  return parts.join('');
}
