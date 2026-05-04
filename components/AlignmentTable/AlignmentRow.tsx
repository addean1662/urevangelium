import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { PapyrusIndicator, WitnessIndicator } from './IndicatorCell';
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

      <WitnessCellComponent cell={row.vaticanus} className="font-greek" showTranslit />
      <WitnessIndicator cell={row.vaticanus} />
      <GlossCell gloss={cellGloss(row.vaticanus)} />

      <WitnessCellComponent cell={row.sinaiticus} className="font-greek" showTranslit />
      <WitnessIndicator cell={row.sinaiticus} />
      <GlossCell gloss={cellGloss(row.sinaiticus)} />

      <WitnessCellComponent cell={row.vulgate} className="font-latin" />
      <WitnessIndicator cell={row.vulgate} />
      <GlossCell gloss={cellGloss(row.vulgate)} />

      <SyriacCell cell={row.peshitta} />
      <WitnessIndicator cell={row.peshitta} />
      <GlossCell gloss={cellGloss(row.peshitta)} />

      <WitnessCellComponent cell={row.byzantine} className="font-greek" showTranslit />
      <WitnessIndicator cell={row.byzantine} />
      <GlossCell gloss={cellGloss(row.byzantine)} />
    </tr>
  );
}
