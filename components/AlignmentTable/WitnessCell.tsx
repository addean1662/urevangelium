import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { LostDots } from './LostDots';
import { NominaSacra } from './NominaSacra';

interface Props {
  cell: WitnessCellType;
  className?: string;
}

export function WitnessCell({ cell, className = '' }: Props) {
  const base = `px-3 py-1.5 text-sm border-b border-stone-200 align-top ${className}`;

  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return (
      <td className={base}>
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
    <td className={base}>
      {cell.nominaSacra ? (
        <NominaSacra ns={cell.nominaSacra} />
      ) : (
        cell.text
      )}
    </td>
  );
}
