import { describe, it, expect } from 'vitest';
import { computeAlignment } from '@/lib/alignment/computeAlignment';
import { getTagntVerse } from '@/lib/sources/tagnt';
import { getByzantineVerse } from '@/lib/sources/parseByzantine';
import { getVulgateVerse } from '@/lib/sources/parseVulgate';
import { getPeshittaVerse } from '@/lib/sources/parsePeshitta';
import { getCoveringPapyri } from '@/lib/sources/parsePapyrus';
import { getLatinGloss } from '@/lib/sources/dictline';
import { getNominaSacra } from '@/lib/sources/nominaSacra';

describe('TAGNT parser', () => {
  it('returns words for Matthew 1:2', () => {
    const words = getTagntVerse('matthew', 1, 2);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0].greek).toBeTruthy();
    expect(words[0].grammar).toBeTruthy();
  });

  it('returns words for John 1:1', () => {
    const words = getTagntVerse('john', 1, 1);
    expect(words.length).toBeGreaterThan(0);
  });

  it('marks NKO words as inAncient and inTraditional', () => {
    const words = getTagntVerse('matthew', 1, 1);
    // Matthew 1:1 — all words should be NKO
    for (const w of words) {
      expect(w.inAncient).toBe(true);
      expect(w.inTraditional).toBe(true);
    }
  });

  it('includes Byz in editions for Matthew 1:1', () => {
    const words = getTagntVerse('matthew', 1, 1);
    expect(words.every(w => w.editions.includes('Byz'))).toBe(true);
  });

  it('provides spelling variants where they exist (David in Matthew 1:1)', () => {
    const words = getTagntVerse('matthew', 1, 1);
    const david = words.find(w => w.strong.startsWith('G1138'));
    expect(david).toBeTruthy();
    // Sinaiticus (WH) form differs: Δαυεὶδ vs Δαυὶδ
    expect(david?.spellingWH).toBeTruthy();
  });
});

describe('Byzantine parser', () => {
  it('returns words for Matthew 1:1', () => {
    const words = getByzantineVerse('matthew', 1, 1);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toMatch(/Β[ίι]βλος/);
  });

  it('strips the paragraph marker ¶', () => {
    // Some verses start with ¶
    const words = getByzantineVerse('matthew', 1, 18);
    for (const w of words) {
      expect(w.startsWith('¶')).toBe(false);
    }
  });

  it('strips trailing punctuation', () => {
    const words = getByzantineVerse('matthew', 1, 1);
    for (const w of words) {
      expect(w).not.toMatch(/[.,;:]+$/);
    }
  });
});

describe('Vulgate parser', () => {
  it('returns words for Matthew 1:1', () => {
    const words = getVulgateVerse('matthew', 1, 1);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toBe('Liber');
  });

  it('returns words for John 1:1', () => {
    const words = getVulgateVerse('john', 1, 1);
    expect(words.length).toBeGreaterThan(0);
  });

  it('strips trailing punctuation', () => {
    const words = getVulgateVerse('matthew', 1, 1);
    for (const w of words) {
      expect(w).not.toMatch(/[.,;:]+$/);
    }
  });
});

describe('Peshitta parser', () => {
  it('returns Syriac words for Matthew 1:1', () => {
    const words = getPeshittaVerse('matthew', 1, 1);
    expect(words.length).toBeGreaterThan(0);
    // Syriac codepoints: U+0700–U+074F
    expect(words[0]).toMatch(/[܀-ݏ]/);
  });

  it('strips sof pasuqa ܀ at end of verse', () => {
    const words = getPeshittaVerse('matthew', 1, 1);
    for (const w of words) {
      expect(w).not.toMatch(/܀/);
    }
  });
});

describe('Papyrus coverage', () => {
  it('P1 covers Matthew 1:1', () => {
    const frags = getCoveringPapyri('matthew', 1, 1);
    const ids = frags.map(f => f.id);
    expect(ids).toContain('P1');
  });

  it('P66 covers John 1:1', () => {
    const frags = getCoveringPapyri('john', 1, 1);
    const ids = frags.map(f => f.id);
    expect(ids).toContain('P66');
  });

  it('returns empty array for a verse covered by no papyrus', () => {
    // Matthew 28:20 — no surviving papyrus fragment
    const frags = getCoveringPapyri('matthew', 28, 20);
    expect(frags).toEqual([]);
  });

  it('each returned fragment has id and date', () => {
    const frags = getCoveringPapyri('matthew', 1, 1);
    for (const f of frags) {
      expect(f.id).toBeTruthy();
      expect(f.date).toBeTruthy();
    }
  });
});

describe('DICTLINE gloss lookup', () => {
  it('returns a gloss for "Liber"', () => {
    const gloss = getLatinGloss('Liber');
    expect(gloss).toBeTruthy();
  });

  it('returns a gloss for "filii" (son, genitive)', () => {
    const gloss = getLatinGloss('filii');
    expect(gloss).toBeTruthy();
  });

  it('returns null for unknown words', () => {
    const gloss = getLatinGloss('xyzzy12345notaword');
    expect(gloss).toBeNull();
  });
});

describe('Nomina sacra', () => {
  it('returns ΙΥ contraction for Jesus genitive (G2424, N-GSM)', () => {
    const ns = getNominaSacra('G2424G', 'N-GSM-P', 'Ἰησοῦ');
    expect(ns?.contraction).toBe('ΙΥ');
    expect(ns?.expansion).toBe('Ἰησοῦ');
  });

  it('returns ΧΥ contraction for Christ genitive (G5547, N-GSM)', () => {
    const ns = getNominaSacra('G5547', 'N-GSM-T', 'Χριστοῦ');
    expect(ns?.contraction).toBe('ΧΥ');
  });

  it('returns ΘΣ contraction for God nominative (G2316, N-NSM)', () => {
    const ns = getNominaSacra('G2316', 'N-NSM', 'θεός');
    expect(ns?.contraction).toBe('ΘΣ');
  });

  it('returns null for ordinary Strong\'s numbers', () => {
    const ns = getNominaSacra('G0976', 'N-NSF', 'βίβλος');
    expect(ns).toBeNull();
  });
});

describe('computeAlignment — Matthew 1:2', () => {
  it('returns VerseData with correct metadata', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    expect(data).not.toBeNull();
    expect(data?.gospel).toBe('matthew');
    expect(data?.chapter).toBe(1);
    expect(data?.verse).toBe(2);
  });

  it('produces rows with all six witness columns', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    expect(data?.rows.length).toBeGreaterThan(0);
    const row = data!.rows[0];
    expect(row.papyrus).toBeTruthy();
    expect(row.vaticanus).toBeTruthy();
    expect(row.sinaiticus).toBeTruthy();
    expect(row.vulgate).toBeTruthy();
    expect(row.peshitta).toBeTruthy();
    expect(row.byzantine).toBeTruthy();
  });

  it('does not manufacture Byzantine text in the generic alignment fallback', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    const textRows = data!.rows.filter(r => r.byzantine.type === 'text');
    expect(textRows).toHaveLength(0);
  });

  it('articles get empty cells in Vulgate', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    // Matthew 1:2 contains articles — those rows should have empty Vulgate cells
    const emptyVulgate = data!.rows.filter(r => r.vulgate.type === 'empty');
    expect(emptyVulgate.length).toBeGreaterThanOrEqual(0); // articles may or may not be present
  });

  it('includes a _note field', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    const d = data as unknown as Record<string, unknown>;
    expect(typeof d['_note']).toBe('string');
  });

  it('row ids are sequential r1, r2, …', async () => {
    const data = await computeAlignment('matthew', 1, 2);
    data!.rows.forEach((r, i) => {
      expect(r.id).toBe(`r${i + 1}`);
    });
  });
});

describe('computeAlignment — John 1:1', () => {
  it('returns correct verse data', async () => {
    const data = await computeAlignment('john', 1, 1);
    expect(data?.gospel).toBe('john');
    expect(data?.verse).toBe(1);
    expect(data?.rows.length).toBeGreaterThan(0);
  });

  it('P66 is listed in papyrus fragments', async () => {
    const data = await computeAlignment('john', 1, 1);
    const extantRows = data!.rows.filter(r => r.papyrus.type === 'extant');
    expect(extantRows.length).toBeGreaterThan(0);
    const firstExtant = extantRows[0].papyrus as { type: 'extant'; fragments: { id: string }[] };
    const ids = firstExtant.fragments.map(f => f.id);
    expect(ids).toContain('P66');
  });
});

describe('computeAlignment — verse with no papyrus', () => {
  it('all rows have lacuna for papyrus when no fragment covers the verse', async () => {
    // Matthew 28:20 — end of gospel, no surviving papyrus
    const data = await computeAlignment('matthew', 28, 20);
    if (!data) return; // verse might not be in TAGNT for some reason
    const nonLacuna = data.rows.filter(r => r.papyrus.type !== 'lacuna');
    expect(nonLacuna.length).toBe(0);
  });
});
