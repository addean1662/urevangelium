import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { PapyrusIndicator, WitnessIndicator } from './IndicatorCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell as WitnessCellComponent } from './WitnessCell';
import { GlossCell } from './GlossCell';
import { BezaeCells } from './BezaeCells';

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
      {/* Papyri */}
      <PapyrusCellComponent cell={row.papyrus} />
      <PapyrusIndicator cell={row.papyrus} />
      <GlossCell gloss={cellGloss(row.papyrus)} />

      {/* Vaticanus / Sinaiticus — mutually exclusive */}
      {showSinaiticus ? (
        <>
          <WitnessCellComponent cell={row.sinaiticus} className="font-greek" showTranslit />
          <WitnessIndicator cell={row.sinaiticus} />
          <GlossCell gloss={cellGloss(row.sinaiticus)} />
        </>
      ) : (
        <>
          <WitnessCellComponent cell={row.vaticanus} className="font-greek" showTranslit />
          <WitnessIndicator cell={row.vaticanus} />
          <GlossCell gloss={cellGloss(row.vaticanus)} />
        </>
      )}

      {/* Bezae — Greek | Latin, no English gloss */}
      <BezaeCells cell={row.bezae} />

      {/* Vulgate */}
      <WitnessCellComponent cell={row.vulgate} className="font-latin" />
      <WitnessIndicator cell={row.vulgate} />
      <GlossCell gloss={cellGloss(row.vulgate)} />

      {/* Peshitta */}
      <SyriacCell cell={row.peshitta} />
      <WitnessIndicator cell={row.peshitta} />
      <GlossCell gloss={cellGloss(row.peshitta)} />

      {/* Byzantine */}
      <WitnessCellComponent cell={row.byzantine} className="font-greek" showTranslit />
      <WitnessIndicator cell={row.byzantine} />
      <GlossCell gloss={cellGloss(row.byzantine)} />
    </tr>
  );
}
