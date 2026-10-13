import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { PapyrusIndicator, WitnessIndicator } from './IndicatorCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell as WitnessCellComponent } from './WitnessCell';
import { GlossCell } from './GlossCell';
import { BezaeCells } from './BezaeCells';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { transliterateCoptic } from '@/lib/transliteration/coptic';
import { groupedEnglish, type EnglishViews } from '@/lib/alignment/englishPresentation';
import type { SourceExpectation } from '@/lib/verification/verifyVerse';
import type { PapyrusWitnessLabel } from '@/lib/alignment/papyrusPresentation';

interface Props {
  row: AlignmentRowType;
  englishViews?: EnglishViews;
  papyrusConflicts?: SourceExpectation['conflicts'];
  papyrusWitness?: string;
  papyrusLabels?: PapyrusWitnessLabel[];
  showSinaiticus: boolean;
  activeCopticSpanId: string | null;
  copticSpanLength: number;
  onCopticSpanEnter: (spanId: string) => void;
  onCopticSpanLeave: () => void;
}

function cellGloss(cell: PapyrusCell | WitnessCell): GlossCellType | null {
  if (cell.type === 'text' || cell.type === 'extant' || cell.type === 'translation') return cell.gloss ?? null;
  return null;
}

export function AlignmentRow({ row, englishViews, papyrusConflicts, papyrusWitness, papyrusLabels, showSinaiticus, activeCopticSpanId, copticSpanLength, onCopticSpanEnter, onCopticSpanLeave }: Props) {
  const reviewedGloss = (column: 'sinaiticus' | 'vulgate' | 'peshitta'): GlossCellType | null => {
    const view = englishViews?.[column], cell = row[column];
    if (!view?.review || cell.type !== 'text') return cellGloss(cell);
    return { gloss: groupedEnglish(view, `${column}:${row.id}`).trim(), source: column === 'peshitta' ? 'Murdock' : column === 'vulgate' ? 'DouayRheims' : 'Anderson', tooltip: view.review.rationale };
  };
  const copticGloss = row.coptic ? cellGloss(row.coptic) : null;
  const copticSpanId = copticGloss?.spanId;
  const copticSpanActive = Boolean(copticSpanId && activeCopticSpanId === copticSpanId);
  const copticContinuation = copticGloss?.spanRole === 'continuation';
  const enterCopticSpan = copticSpanId ? () => onCopticSpanEnter(copticSpanId) : undefined;
  return (
    <tr>
      <PapyrusCellComponent cell={row.papyrus} conflicts={papyrusConflicts} columnWitness={papyrusWitness} witnessLabels={papyrusLabels} />
      <PapyrusIndicator cell={row.papyrus} />
      <GlossCell gloss={cellGloss(row.papyrus)} />

      {row.coptic ? (
        <>
          <WitnessCellComponent cell={row.coptic} className="font-coptic" translitFn={transliterateCoptic} highlighted={copticSpanActive} onPointerEnter={enterCopticSpan} onPointerLeave={copticSpanId ? onCopticSpanLeave : undefined} onFocus={enterCopticSpan} onBlur={copticSpanId ? onCopticSpanLeave : undefined} />
          <WitnessIndicator cell={row.coptic} />
          {!copticContinuation && <GlossCell gloss={copticGloss} rowSpan={copticSpanId ? copticSpanLength : undefined} highlighted={copticSpanActive} onPointerEnter={enterCopticSpan} onPointerLeave={copticSpanId ? onCopticSpanLeave : undefined} onFocus={enterCopticSpan} onBlur={copticSpanId ? onCopticSpanLeave : undefined} />}
        </>
      ) : (
        <>
          <td className="px-2 py-1.5 text-lg border-b border-rule-hairline align-middle" />
          <td className="py-1.5 text-center border-b border-rule-hairline align-middle" />
          <td className="px-2 py-1.5 text-lg border-b border-rule-hairline align-middle" />
        </>
      )}

      {showSinaiticus ? (
        <>
          <WitnessCellComponent cell={row.sinaiticus} className="font-greek" translitFn={transliterateGreek} />
          <WitnessIndicator cell={row.sinaiticus} />
          <GlossCell gloss={reviewedGloss('sinaiticus')} />
        </>
      ) : (
        <>
          <WitnessCellComponent cell={row.vaticanus} className="font-greek" translitFn={transliterateGreek} />
          <WitnessIndicator cell={row.vaticanus} />
          <GlossCell gloss={cellGloss(row.vaticanus)} />
        </>
      )}

      <WitnessCellComponent cell={row.vulgate} className="font-latin" />
      <WitnessIndicator cell={row.vulgate} />
      <GlossCell gloss={reviewedGloss('vulgate')} />

      <BezaeCells cell={row.bezae} />

      <SyriacCell cell={row.peshitta} />
      <WitnessIndicator cell={row.peshitta} />
      <GlossCell gloss={reviewedGloss('peshitta')} />

      <WitnessCellComponent cell={row.byzantine} className="font-greek" translitFn={transliterateGreek} />
      <WitnessIndicator cell={row.byzantine} />
      <GlossCell gloss={cellGloss(row.byzantine)} />
    </tr>
  );
}
