import type { AlignmentRow as AlignmentRowType } from '@/lib/types';
import { PapyrusCell } from './PapyrusCell';
import { SyriacCell } from './SyriacCell';
import { WitnessCell } from './WitnessCell';

interface Props {
  row: AlignmentRowType;
  index: number;
}

export function AlignmentRow({ row, index }: Props) {
  const stripe = index % 2 === 0 ? 'bg-white' : 'bg-stone-50';

  return (
    <tr className={stripe}>
      <PapyrusCell cell={row.papyrus} />
      <WitnessCell cell={row.vaticanus} className="font-greek" />
      <WitnessCell cell={row.sinaiticus} className="font-greek" />
      <WitnessCell cell={row.vulgate} className="font-latin" />
      <SyriacCell cell={row.peshitta} />
      <WitnessCell cell={row.byzantine} className="font-greek" />
    </tr>
  );
}
