import type {
  Gospel,
  AlignmentRow,
  VerseData,
  WitnessCell,
  PapyrusCell,
  GlossCell,
} from '@/lib/types';
import { getTagntVerse } from '@/lib/sources/tagnt';
import { getNominaSacra } from '@/lib/sources/nominaSacra';
import { getVulgateVerse } from '@/lib/sources/parseVulgate';
import { getPeshittaVerse } from '@/lib/sources/parsePeshitta';
import { getCoveringPapyri } from '@/lib/sources/parsePapyrus';
import { getLatinGloss } from '@/lib/sources/dictline';

// Greek article grammar codes start with T-
function isArticle(grammar: string): boolean {
  return grammar.startsWith('T-');
}

// Build a GlossCell from TAGNT data
function tagntGloss(gloss: string): GlossCell | undefined {
  return gloss ? { gloss, source: 'TAGNT' } : undefined;
}

export async function computeAlignment(
  gospel: Gospel,
  chapter: number,
  verse: number,
): Promise<VerseData | null> {
  const tagntWords = getTagntVerse(gospel, chapter, verse);
  if (tagntWords.length === 0) return null;

  const vulgateWords = getVulgateVerse(gospel, chapter, verse);
  const peshittaWords = getPeshittaVerse(gospel, chapter, verse);
  const coveringPapyri = getCoveringPapyri(gospel, chapter, verse);

  // Build positional alignment for Vulgate/Peshitta:
  // articles get empty; remaining content words align positionally.
  // Indices into vulgateWords / peshittaWords for content-word slots.
  const contentWordIndices: number[] = [];
  for (let i = 0; i < tagntWords.length; i++) {
    if (!isArticle(tagntWords[i].grammar)) {
      contentWordIndices.push(i);
    }
  }

  // Detect word-count mismatch after article stripping
  const vulgateMismatch = vulgateWords.length > 0 && vulgateWords.length !== contentWordIndices.length;
  const peshittaMismatch = peshittaWords.length > 0 && peshittaWords.length !== contentWordIndices.length;

  // Maps: tagntWordIndex → Vulgate word string and Peshitta word string
  const vulgateByRow = new Map<number, string>();
  const peshittaByRow = new Map<number, string>();

  contentWordIndices.forEach((rowIdx, slotIdx) => {
    const vWord = vulgateWords[slotIdx];
    if (vWord) vulgateByRow.set(rowIdx, vWord);

    const pWord = peshittaWords[slotIdx];
    if (pWord) peshittaByRow.set(rowIdx, pWord);
  });

  const rows: AlignmentRow[] = tagntWords.map((tw, i) => {
    const nomina = getNominaSacra(tw.strong, tw.grammar, tw.greek);
    const displayGreek = nomina ? nomina.contraction : tw.greek;
    const gloss = tagntGloss(tw.gloss);

    // Papyrus cell
    let papyrus: PapyrusCell;
    if (coveringPapyri.length > 0) {
      papyrus = {
        type: 'extant',
        fragments: coveringPapyri,
        text: displayGreek,
        ...(nomina ? { nominaSacra: nomina } : {}),
        ...(gloss ? { gloss } : {}),
      };
    } else {
      papyrus = { type: 'lacuna' };
    }

    // Vaticanus: NA28 spelling; Sinaiticus: WH spelling if available
    const vatGreek = nomina ? nomina.contraction : tw.greek;
    const sinGreek = nomina
      ? nomina.contraction
      : tw.spellingWH ?? tw.greek;
    const byzGreek = nomina
      ? nomina.contraction
      : tw.spellingByz ?? tw.greek;

    const vatCell: WitnessCell = tw.inAncient
      ? { type: 'text', text: vatGreek, ...(nomina ? { nominaSacra: nomina } : {}), ...(gloss ? { gloss } : {}) }
      : { type: 'empty' };

    const sinCell: WitnessCell = tw.inAncient
      ? { type: 'text', text: sinGreek, ...(nomina ? { nominaSacra: { contraction: nomina.contraction, expansion: nomina.expansion } } : {}), ...(gloss ? { gloss } : {}) }
      : { type: 'empty' };

    const byzCell: WitnessCell = tw.inTraditional
      ? { type: 'text', text: byzGreek, ...(nomina ? { nominaSacra: nomina } : {}), ...(gloss ? { gloss } : {}) }
      : { type: 'empty' };

    // Vulgate cell
    let vulgateCell: WitnessCell;
    if (isArticle(tw.grammar)) {
      vulgateCell = { type: 'empty' };
    } else {
      const vWord = vulgateByRow.get(i);
      if (vWord) {
        const vGloss = getLatinGloss(vWord);
        vulgateCell = {
          type: 'text',
          text: vWord,
          ...(vGloss ? { gloss: { gloss: vGloss, source: 'Whitaker' } } : {}),
        };
      } else {
        vulgateCell = { type: 'empty' };
      }
    }

    // Peshitta cell
    let peshittaCell: WitnessCell;
    if (isArticle(tw.grammar)) {
      peshittaCell = { type: 'empty' };
    } else {
      const pWord = peshittaByRow.get(i);
      peshittaCell = pWord ? { type: 'text', text: pWord } : { type: 'empty' };
    }

    const row: AlignmentRow & Record<string, unknown> = {
      id: `r${i + 1}`,
      papyrus,
      vaticanus: vatCell,
      sinaiticus: sinCell,
      vulgate: vulgateCell,
      peshitta: peshittaCell,
      byzantine: byzCell,
    };

    // Flag positional uncertainty
    if ((vulgateMismatch || peshittaMismatch) && !isArticle(tw.grammar)) {
      row._uncertain = true;
    }

    return row as AlignmentRow;
  });

  const noteFragments: string[] = [
    'Computed alignment. TAGNT polytonic Greek for all six witnesses.',
  ];
  if (vulgateMismatch) noteFragments.push(`Vulgate word count (${vulgateWords.length}) ≠ Greek content words (${contentWordIndices.length}); positional alignment approximate.`);
  if (peshittaMismatch) noteFragments.push(`Peshitta word count (${peshittaWords.length}) ≠ Greek content words (${contentWordIndices.length}); positional alignment approximate.`);

  const data: VerseData & Record<string, unknown> = {
    gospel,
    chapter,
    verse,
    _note: noteFragments.join(' '),
    rows,
  };

  return data as VerseData;
}
