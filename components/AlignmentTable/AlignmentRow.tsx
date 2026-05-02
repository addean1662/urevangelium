import type { AlignmentRow as AlignmentRowType, GlossCell as GlossCellType, PapyrusCell, WitnessCell } from '@/lib/types';
import { PapyrusCell as PapyrusCellComponent } from './PapyrusCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell as WitnessCellComponent } from './WitnessCell';
import { GlossCell } from './GlossCell';

interface Props {
  row: AlignmentRowType;
  index: number;
  showGlosses: boolean;
}

function cellGloss(cell: PapyrusCell | WitnessCell): GlossCellType | null {
  if (cell.type === 'text' || cell.type === 'extant') return cell.gloss ?? null;
  return null;
}

export function AlignmentRow({ row, index, showGlosses }: Props) {
  const stripe = index % 2 === 0 ? 'bg-white' : 'bg-stone-50';

  return (
    <tr className={stripe}>
      <PapyrusCellComponent cell={row.papyrus} />
      {showGlosses && <GlossCell gloss={cellGloss(row.papyrus)} />}

      <WitnessCellComponent cell={row.vaticanus} className="font-greek" />
      {showGlosses && <GlossCell gloss={cellGloss(row.vaticanus)} />}

      <WitnessCellComponent cell={row.sinaiticus} className="font-greek" />
      {showGlosses && <GlossCell gloss={cellGloss(row.sinaiticus)} />}

      <WitnessCellComponent cell={row.vulgate} className="font-latin" />
      {showGlosses && <GlossCell gloss={cellGloss(row.vulgate)} />}

      <SyriacCell cell={row.peshitta} />
      {showGlosses && <GlossCell gloss={cellGloss(row.peshitta)} />}

      <WitnessCellComponent cell={row.byzantine} className="font-greek" />
      {showGlosses && <GlossCell gloss={cellGloss(row.byzantine)} />}
    </tr>
  );
}
