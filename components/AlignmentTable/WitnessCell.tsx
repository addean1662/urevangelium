import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { LostDots } from './LostDots';
import { NominaSacra } from './NominaSacra';

interface Props {
  cell: WitnessCellType;
  className?: string;
}

export function WitnessCell({ cell, className = '' }: Props) {
  const base = `px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary ${className}`;

  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return <td className={base}><LostDots /></td>;
  }

  if (cell.type === 'empty') {
    return (
      <td className={`${base} text-ink-muted`} aria-label="alignment gap">
        —
      </td>
    );
  }

  return (
    <td className={base}>
      {cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.text}
    </td>
  );
}
