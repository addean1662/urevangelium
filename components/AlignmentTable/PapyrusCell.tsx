import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import { LostDots } from './LostDots';
import { NominaSacra } from './NominaSacra';

interface Props {
  cell: PapyrusCellType;
}

export function PapyrusCell({ cell }: Props) {
  const base = 'px-3 py-1.5 text-sm border-b border-stone-200 align-top';

  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return (
      <td className={base}>
        <LostDots />
      </td>
    );
  }

  const fragmentLabel = cell.fragments.map((f) => f.id).join(' · ');

  return (
    <td className={base}>
      <span className="flex items-baseline gap-1.5 flex-wrap">
        {cell.nominaSacra ? (
          <NominaSacra ns={cell.nominaSacra} />
        ) : (
          <span>{cell.text}</span>
        )}
        <span
          className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1 py-0.5 rounded leading-none"
          title={cell.fragments.map((f) => `${f.id} ${f.date}`).join('; ')}
        >
          {fragmentLabel}
        </span>
      </span>
    </td>
  );
}
