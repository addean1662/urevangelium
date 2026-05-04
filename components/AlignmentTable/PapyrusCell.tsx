import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { NominaSacra } from './NominaSacra';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  cell: PapyrusCellType;
}

export function PapyrusCell({ cell }: Props) {
  const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary font-greek';

  // Lost/lacuna: empty — the dot indicator lives in IndicatorCell (Cell B)
  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return <td className={base} />;
  }

  const textContent = cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.text;
  const sourceText = cell.nominaSacra?.expansion ?? cell.text;
  const translit = transliterateGreek(sourceText);
  const tip = translit ? <em>{translit}</em> : null;

  return (
    <td className={base}>
      <HoverTooltip content={tip}>{textContent}</HoverTooltip>
    </td>
  );
}
