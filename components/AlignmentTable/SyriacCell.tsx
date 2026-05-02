import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { LostDots } from './LostDots';

interface Props {
  cell: WitnessCellType;
}

/**
 * Syriac column cell. dir="rtl" is scoped to this element only.
 * Page direction remains LTR; word flow inside reverses.
 */
export function SyriacCell({ cell }: Props) {
  const base = 'px-3 py-1.5 text-sm border-b border-stone-200 align-top';

  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return (
      <td className={base} dir="rtl">
        <LostDots />
      </td>
    );
  }

  if (cell.type === 'empty') {
    return (
      <td className={`${base} text-stone-300`} aria-label="alignment gap">
        —
      </td>
    );
  }

  return (
    <td className={base} dir="rtl" lang="syr">
      <span className="font-syriac">{cell.text}</span>
    </td>
  );
}
