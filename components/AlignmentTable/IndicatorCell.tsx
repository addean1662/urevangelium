import type { PapyrusCell as PapyrusCellType, WitnessCell as WitnessCellType } from '@/lib/types';

const cellBase = 'py-1.5 text-center border-b border-rule-hairline align-middle';
const dotBase = 'inline-block w-2 h-2 rounded-full flex-shrink-0';

interface PapyrusIndicatorProps {
  cell: PapyrusCellType;
}

export function PapyrusIndicator({ cell }: PapyrusIndicatorProps) {
  if (cell.type === 'extant') {
    const label = cell.fragments.map((f) => `${f.id} (${f.date})`).join(', ');
    return (
      <td className={cellBase}>
        <span
          className={`${dotBase} bg-semantic-extant`}
          aria-label={`papyrus extant — ${label}`}
          title={label}
        />
      </td>
    );
  }

  const label =
    cell.type === 'lacuna'
      ? 'Absent from Papyrus canon for this passage'
      : 'Papyrus not extant for this word';

  return (
    <td className={cellBase}>
      <span
        className={`${dotBase} bg-semantic-lacuna`}
        aria-label={`papyrus not extant — ${label}`}
        title={label}
      />
    </td>
  );
}

interface WitnessIndicatorProps {
  cell: WitnessCellType;
}

export function WitnessIndicator({ cell }: WitnessIndicatorProps) {
  return <td className={cellBase} />;
}
