import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { NominaSacra } from './NominaSacra';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  cell: PapyrusCellType;
}

export function PapyrusCell({ cell }: Props) {
  const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary font-greek';

  if (cell.type === 'lost') {
    return (
      <td className={base}>
        <span className="text-xs italic text-semantic-lacuna">lost</span>
      </td>
    );
  }
  if (cell.type === 'empty') {
    return <td className={`${base} text-ink-muted`}>—</td>;
  }
  // Lacuna: empty — dot indicator lives in IndicatorCell (Cell B)
  if (cell.type === 'lacuna') {
    return <td className={base} />;
  }

  const textContent = cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra} /> : cell.text;
  const sourceText = cell.nominaSacra?.expansion ?? cell.text;
  const translit = transliterateGreek(sourceText);
  const tip = translit ? <em>{translit}</em> : null;

  const sourceLabel = cell.fragments.map(f => f.id).join(' · ');

  return (
    <td className={base}>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex max-w-full flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
          {cell.condition?.manuscriptStatus === 'scribal-error-question' ? (
            <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-lacuna" aria-label="Source-recorded first-hand false start deleted by correction">
              scribal error?
            </span>
          ) : null}
          {cell.condition?.damaged ? (
            cell.condition.sourceImageUrl ? (
              <a
                href={cell.condition.sourceImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-damaged underline decoration-current/40 underline-offset-2 hover:decoration-current"
                aria-label="Damaged but readable; open a free image of this passage"
              >
                damaged
              </a>
            ) : (
              <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-damaged" aria-label="Papyrus characters damaged but traceable">
                damaged
              </span>
            )
          ) : null}
          <HoverTooltip content={tip}>{textContent}</HoverTooltip>
        </div>
        <span className="text-[10px] leading-none font-sans text-ink-muted tracking-wide">
          {sourceLabel}
        </span>
      </div>
    </td>
  );
}
