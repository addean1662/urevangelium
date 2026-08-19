import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { PapyrusIndicator, WitnessIndicator } from './IndicatorCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell as WitnessCellComponent } from './WitnessCell';
import { GlossCell } from './GlossCell';
import { BezaeCells } from './BezaeCells';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { transliterateCoptic } from '@/lib/transliteration/coptic';

interface Props {
  row: AlignmentRowType;
  showSinaiticus: boolean;
}

function cellGloss(cell: PapyrusCell | WitnessCell): GlossCellType | null {
  if (cell.type === 'text' || cell.type === 'extant') return cell.gloss ?? null;
  return null;
}

export function AlignmentRow({ row, showSinaiticus }: Props) {
  return (
    <tr>
      <PapyrusCellComponent cell={row.papyrus} />
      <PapyrusIndicator cell={row.papyrus} />
      <GlossCell gloss={cellGloss(row.papyrus)} />

      {row.coptic ? (
        <>
          <WitnessCellComponent cell={row.coptic} className="font-coptic" translitFn={transliterateCoptic} />
          <WitnessIndicator cell={row.coptic} />
          <GlossCell gloss={cellGloss(row.coptic)} />
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
          <GlossCell gloss={cellGloss(row.sinaiticus)} />
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
      <GlossCell gloss={cellGloss(row.vulgate)} />

      <BezaeCells cell={row.bezae} />

      <SyriacCell cell={row.peshitta} />
      <WitnessIndicator cell={row.peshitta} />
      <GlossCell gloss={cellGloss(row.peshitta)} />

      <WitnessCellComponent cell={row.byzantine} className="font-greek" translitFn={transliterateGreek} />
      <WitnessIndicator cell={row.byzantine} />
      <GlossCell gloss={cellGloss(row.byzantine)} />
    </tr>
  );
}
