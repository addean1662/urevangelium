'use client';

import type { GlossCell as GlossCellType } from '@/lib/types';

interface Props {
  gloss?: GlossCellType | null;
  className?: string;
  rowSpan?: number;
  highlighted?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Crum entries are often multi-term ("gospel, good news (Christian; ...)").
// Extract the first keyword for the cell; put the full string in the tooltip.
function splitCrum(text: string): { display: string } {
  const display = text.split(/[,;(]/)[0].trim();
  return { display };
}

export function GlossCell({ gloss, className = '', rowSpan, highlighted = false, onPointerEnter, onPointerLeave, onFocus, onBlur }: Props) {
  const base = `px-2 py-1.5 text-base break-words border-b border-rule-hairline align-middle transition-colors ${highlighted ? 'bg-accent-gold/15' : ''} ${className}`;
  const interactionProps = { rowSpan, onPointerEnter, onPointerLeave, onFocus, onBlur };

  if (!gloss) {
    return <td className={`${base} text-ink-muted`} aria-label="no gloss" {...interactionProps}>—</td>;
  }

  const textColor = gloss.generated || gloss.experimental || gloss.automaticAnnotation ? 'text-accent-gold' : 'text-ink-secondary';

  const badge = gloss.automaticAnnotation ? (
    <sup className="not-italic ml-0.5 text-[11px] font-semibold text-accent-gold">*</sup>
  ) : gloss.experimental ? (
    <span className="not-italic ml-1.5 text-[10px] font-mono text-accent-gold bg-bg-elevated border border-accent-gold/50 px-1 py-0.5 rounded leading-none">experimental</span>
  ) : gloss.deviation ? (
    <span
      className="not-italic ml-1.5 text-[11px] font-mono text-accent-gold bg-bg-elevated border border-rule-hairline px-1 py-0.5 rounded leading-none"
    >
      {gloss.source}
    </span>
  ) : null;

  if (gloss.source === 'Crum') {
    const { display } = splitCrum(gloss.gloss);
    return (
      <td className={`${base} ${textColor} italic`} aria-label={`English lexical aid: ${display}`} title={gloss.tooltip} {...interactionProps}>{display}</td>
    );
  }

  const continuation = gloss.spanRole === 'continuation';
  return (
    <td
      className={`${base} ${continuation ? 'text-ink-muted not-italic text-center' : `${textColor} italic`}`}
      title={gloss.tooltip}
      aria-label={continuation ? `Continues shared English phrase: ${gloss.tooltip ?? ''}` : undefined}
      tabIndex={onFocus ? 0 : undefined}
      {...interactionProps}
    >
      {gloss.gloss}
      {badge}
    </td>
  );
}
