import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import { NominaSacra } from './NominaSacra';

interface Props {
  cell: PapyrusCellType;
}

export function PapyrusCell({ cell }: Props) {
  const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary font-greek';

  // Lost/lacuna: empty — the dot indicator lives in IndicatorCell (Cell B)
  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return <td className={base} />;
  }

  return (
    <td className={base}>
      {cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.text}
    </td>
  );
}
