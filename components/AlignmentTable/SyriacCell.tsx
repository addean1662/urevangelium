import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { transliterateSyriac } from '@/lib/transliteration/syriac';
import { LostDots } from './LostDots';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  cell: WitnessCellType;
}

/**
 * Syriac column cell. dir="rtl" is scoped to this element only.
 * Page direction remains LTR; word flow inside reverses.
 * text-right is explicit — RTL content naturally anchors to the right edge,
 * matching the right-aligned gravitational center shared by all witness text cells.
 */
export function SyriacCell({ cell }: Props) {
  const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary';

  if (cell.type === 'lost' || cell.type === 'lacuna') {
    return (
      <td className={base} dir="rtl">
        <LostDots />
      </td>
    );
  }

  if (cell.type === 'empty') {
    return (
      <td className={`${base} text-ink-muted`} aria-label="alignment gap">
        —
      </td>
    );
  }

  const translit = transliterateSyriac(cell.text);
  const tip = translit ? <em>{translit}</em> : null;

  return (
    <td className={base} dir="rtl" lang="syr">
      <HoverTooltip content={tip}>
        <span className="font-syriac">{cell.text}</span>
      </HoverTooltip>
    </td>
  );
}
