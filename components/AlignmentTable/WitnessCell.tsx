import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { LostDots } from './LostDots';
import { NominaSacra } from './NominaSacra';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  cell: WitnessCellType;
  className?: string;
  showTranslit?: boolean;
}

export function WitnessCell({ cell, className = '', showTranslit = false }: Props) {
  const base = `px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary ${className}`;

  if (cell.type === 'lost') {
    return (
      <td className={base}>
        <span className="flex items-center justify-end gap-1.5">
          <span className="text-xs italic text-semantic-lacuna">lost</span>
          <span className="inline-block w-2 h-2 rounded-full bg-semantic-lacuna flex-shrink-0" />
        </span>
      </td>
    );
  }
  if (cell.type === 'lacuna') {
    return <td className={base}><LostDots /></td>;
  }

  if (cell.type === 'empty') {
    return (
      <td className={`${base} text-ink-muted`} aria-label="alignment gap">
        —
      </td>
    );
  }

  const textContent = cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.text;

  if (showTranslit) {
    const sourceText = cell.nominaSacra?.expansion ?? cell.text;
    const translit = transliterateGreek(sourceText);
    const tip = translit ? <em>{translit}</em> : null;
    return (
      <td className={base}>
        <HoverTooltip content={tip}>{textContent}</HoverTooltip>
      </td>
    );
  }

  return <td className={base}>{textContent}</td>;
}
