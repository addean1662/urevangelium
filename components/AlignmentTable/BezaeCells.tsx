import type { BezaeCell } from '@/lib/types';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { HoverTooltip } from '@/components/HoverTooltip';
import { LostDots } from './LostDots';

const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle';

interface Props {
  cell: BezaeCell | undefined;
}

export function BezaeCells({ cell }: Props) {
  // Data not yet populated — blank cells, consistent with lost/undocumented witnesses
  if (!cell) {
    return (
      <>
        <td className={base} />
        <td className={base} />
        <td className={base} />
      </>
    );
  }

  if (cell.type === 'lost') {
    return (
      <>
        <td className={base} />
        <td className={base} />
        <td className={base} />
      </>
    );
  }

  if (cell.type === 'lacuna') {
    return (
      <>
        <td className={`${base} text-right text-ink-muted`}><LostDots /></td>
        <td className={`${base} text-center text-ink-muted/40 text-sm select-none`}>|</td>
        <td className={`${base} text-ink-muted`}><LostDots /></td>
      </>
    );
  }

  if (cell.type === 'empty') {
    return (
      <>
        <td className={`${base} text-right text-ink-muted`} aria-label="alignment gap">—</td>
        <td className={`${base} text-center text-ink-muted/40 text-sm select-none`}>|</td>
        <td className={`${base} text-ink-muted`} aria-label="alignment gap">—</td>
      </>
    );
  }

  // Text cell — Greek right-aligned, Latin left-aligned, pipe separator
  const greek = cell.greek ?? null;
  const latin = cell.latin ?? null;
  const translit = greek ? transliterateGreek(greek) : null;
  const tip = translit ? <em>{translit}</em> : null;

  return (
    <>
      <td className={`${base} font-greek text-right text-ink-primary`}>
        {greek ? (
          translit ? (
            <HoverTooltip content={tip}>{greek}</HoverTooltip>
          ) : (
            greek
          )
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className={`${base} text-center text-ink-muted/50 text-sm select-none`}>|</td>
      <td className={`${base} font-latin text-ink-primary`}>
        {latin ?? <span className="text-ink-muted">—</span>}
      </td>
    </>
  );
}
