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
import { getLatinGloss, getLatinGlossFull } from '@/lib/sources/dictline';

// Greek article grammar codes start with T-
function isArticle(grammar: string): boolean {
  return grammar.startsWith('T-');
}

// Build a GlossCell from TAGNT data, with tooltip carrying Strong's + form + gloss
function tagntGloss(word: { gloss: string; strong: string; greek: string }): GlossCell | undefined {
  if (!word.gloss) return undefined;
  const tooltip = `${word.strong}  ${word.greek}\n${word.gloss}`;
  return { gloss: word.gloss, source: 'TAGNT', tooltip };
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
    if (pWord) {
      peshittaByRow.set(rowIdx, pWord);
    }
  });

  const rows: AlignmentRow[] = tagntWords.map((tw, i) => {
    const nomina = getNominaSacra(tw.strong, tw.grammar, tw.greek);
    const displayGreek = nomina ? nomina.contraction : tw.greek;
    const gloss = tagntGloss(tw);

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

    const vatCell: WitnessCell = tw.inAncient
      ? { type: 'text', text: vatGreek, ...(nomina ? { nominaSacra: nomina } : {}), ...(gloss ? { gloss } : {}) }
      : { type: 'empty' };

    const sinCell: WitnessCell = tw.inAncient
      ? { type: 'text', text: sinGreek, ...(nomina ? { nominaSacra: { contraction: nomina.contraction, expansion: nomina.expansion } } : {}), ...(gloss ? { gloss } : {}) }
      : { type: 'empty' };

    // Byzantine readings enter only through the pinned RP2018 pipeline.
    // On-demand TAGNT computation fails closed instead of supplying a proxy.
    const byzCell: WitnessCell = { type: 'empty' };

    // Vulgate cell
    let vulgateCell: WitnessCell;
    if (isArticle(tw.grammar)) {
      vulgateCell = { type: 'empty' };
    } else {
      const vWord = vulgateByRow.get(i);
      if (vWord) {
        const vGloss = getLatinGloss(vWord);
        const vFull  = getLatinGlossFull(vWord);
        vulgateCell = {
          type: 'text',
          text: vWord,
          ...(vGloss ? {
            gloss: {
              gloss: vGloss,
              source: 'Whitaker',
              ...(vFull ? { tooltip: vFull } : {}),
            },
          } : {}),
        };
      } else {
        vulgateCell = { type: 'empty' };
      }
    }

    // Peshitta cell — gloss tiers: PayneSmith top-60 → Etheridge → Murdock
    let peshittaCell: WitnessCell;
    if (isArticle(tw.grammar)) {
      peshittaCell = { type: 'empty' };
    } else {
      const pWord = peshittaByRow.get(i);
      if (pWord) {
        peshittaCell = {
          type: 'text',
          text: pWord,
        };
      } else {
        peshittaCell = { type: 'empty' };
      }
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
