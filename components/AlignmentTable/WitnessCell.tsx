import type { WitnessCell as WitnessCellType } from '@/lib/types';
import { LostDots } from './LostDots';
import { NominaSacra } from './NominaSacra';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  cell: WitnessCellType;
  className?: string;
  translitFn?: (text: string) => string;
  highlighted?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function WitnessCell({ cell, className = '', translitFn, highlighted = false, onPointerEnter, onPointerLeave, onFocus, onBlur }: Props) {
  const base = `px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary transition-colors ${highlighted ? 'bg-accent-gold/15' : ''} ${className}`;
  const interactionProps = { onPointerEnter, onPointerLeave, onFocus, onBlur };

  if (cell.type === 'lost') {
    return (
      <td className={base} {...interactionProps}>
        <span className="flex items-center justify-end gap-1.5">
          <span className="text-xs italic text-semantic-lacuna">lost</span>
          <span className="inline-block w-2 h-2 rounded-full bg-semantic-lacuna flex-shrink-0" />
        </span>
      </td>
    );
  }
  if (cell.type === 'lacuna') {
    return <td className={base} {...interactionProps}><LostDots /></td>;
  }

  if (cell.type === 'empty') {
    return (
      <td className={`${base} text-ink-muted`} aria-label="alignment gap" {...interactionProps}>
        —
      </td>
    );
  }

  if (cell.type === 'translation') {
    return <td className={base} aria-label="published translation expansion row" {...interactionProps} />;
  }


  if (cell.type === 'omitted') {
    return (
      <td className={`${base} text-ink-muted`} aria-label="omitted by this witness" {...interactionProps}>
        <span className="text-xs italic">omitted</span>
      </td>
    );
  }

  const textContent = cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.sourceUnits ? (
    <span className="inline-flex flex-wrap justify-end gap-x-1.5">
      {cell.sourceUnits.map((unit, index) => <span key={`${index}-${unit.text}`}>{unit.text}</span>)}
    </span>
  ) : cell.text;
  const manuscriptFlag = cell.manuscriptStatus === 'scribal-error-question' ? 'scribal error?' : cell.manuscriptStatus;
  const displayedText = manuscriptFlag ? (
    <span className="inline-flex items-baseline justify-end gap-1.5 text-semantic-lacuna">
      <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none">{manuscriptFlag}</span>
      <span>{textContent}</span>
    </span>
  ) : textContent;

  if (translitFn) {
    const sourceText = cell.nominaSacra?.expansion ?? cell.text;
    const translit = translitFn(sourceText);
    const tip = translit ? <em>{translit}</em> : null;
    return (
      <td className={base} tabIndex={onFocus ? 0 : undefined} {...interactionProps}>
        <HoverTooltip content={tip}>{displayedText}</HoverTooltip>
      </td>
    );
  }

  return <td className={base} tabIndex={onFocus ? 0 : undefined} {...interactionProps}>{displayedText}</td>;
}
