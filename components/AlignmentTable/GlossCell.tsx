'use client';

import type { GlossCell as GlossCellType } from '@/lib/types';
import { HoverTooltip } from '@/components/HoverTooltip';

interface Props {
  gloss?: GlossCellType | null;
  className?: string;
}

// Crum entries are often multi-term ("gospel, good news (Christian; ...)").
// Extract the first keyword for the cell; put the full string in the tooltip.
function splitCrum(text: string): { display: string; tooltip: string | null } {
  const display = text.split(/[,;(]/)[0].trim();
  return { display, tooltip: display !== text ? text : null };
}

export function GlossCell({ gloss, className = '' }: Props) {
  const base = `px-2 py-1.5 text-base border-b border-rule-hairline align-middle ${className}`;

  if (!gloss) {
    return <td className={`${base} text-ink-muted`} aria-label="no gloss">—</td>;
  }

  const textColor = gloss.generated ? 'text-accent-gold' : 'text-ink-secondary';

  const badge = gloss.deviation ? (
    <span
      className="not-italic ml-1.5 text-[11px] font-mono text-accent-gold bg-bg-elevated border border-rule-hairline px-1 py-0.5 rounded leading-none"
    >
      {gloss.source}
    </span>
  ) : null;

  if (gloss.source === 'Crum') {
    const { display, tooltip } = splitCrum(gloss.tooltip ?? gloss.gloss);
    const tip = tooltip ? <span style={{ fontSize: 14 }}>{tooltip}</span> : null;
    return (
      <td className={`${base} ${textColor} italic`} aria-label={`lexical aid: ${gloss.gloss}`}>
        <HoverTooltip content={tip ?? <span style={{ fontSize: 14 }}>Lexical aid—not contextual translation · {gloss.gloss}</span>}>{display}</HoverTooltip>
        {badge}
      </td>
    );
  }

  return (
    <td className={`${base} ${textColor} italic`}>
      {gloss.gloss}
      {badge}
    </td>
  );
}
