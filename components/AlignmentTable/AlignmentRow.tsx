import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { PapyrusIndicator, EmptyIndicator } from './IndicatorCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell as WitnessCellComponent } from './WitnessCell';
import { GlossCell } from './GlossCell';

interface Props {
  row: AlignmentRowType;
}

function cellGloss(cell: PapyrusCell | WitnessCell): GlossCellType | null {
  if (cell.type === 'text' || cell.type === 'extant') return cell.gloss ?? null;
  return null;
}

export function AlignmentRow({ row }: Props) {
  return (
    <tr>
      {/* Each witness: [TEXT right-aligned] [indicator dot / empty] [GLOSS left-aligned] */}

      <PapyrusCellComponent cell={row.papyrus} />
      <PapyrusIndicator cell={row.papyrus} />
      <GlossCell gloss={cellGloss(row.papyrus)} />

      <WitnessCellComponent cell={row.vaticanus} className="font-greek" />
      <EmptyIndicator />
      <GlossCell gloss={cellGloss(row.vaticanus)} />

      <WitnessCellComponent cell={row.sinaiticus} className="font-greek" />
      <EmptyIndicator />
      <GlossCell gloss={cellGloss(row.sinaiticus)} />

      <WitnessCellComponent cell={row.vulgate} className="font-latin" />
      <EmptyIndicator />
      <GlossCell gloss={cellGloss(row.vulgate)} />

      <SyriacCell cell={row.peshitta} />
      <EmptyIndicator />
      <GlossCell gloss={cellGloss(row.peshitta)} />

      <WitnessCellComponent cell={row.byzantine} className="font-greek" />
      <EmptyIndicator />
      <GlossCell gloss={cellGloss(row.byzantine)} />
    </tr>
  );
}
