import type { GlossCell as GlossCellType } from '@/lib/types';

interface Props {
  gloss?: GlossCellType | null;
  className?: string;
}

export function GlossCell({ gloss, className = '' }: Props) {
  const base = `px-2 py-1.5 text-base border-b border-rule-hairline align-middle ${className}`;

  if (!gloss) {
    return <td className={`${base} text-ink-muted`} aria-label="no gloss">—</td>;
  }

  const badge = gloss.deviation ? (
    <span
      className="not-italic ml-1.5 text-[11px] font-mono text-accent-gold bg-bg-elevated border border-rule-hairline px-1 py-0.5 rounded leading-none"
    >
      {gloss.source}
    </span>
  ) : null;

  return (
    <td className={`${base} text-ink-secondary italic`}>
      {gloss.gloss}
      {badge}
    </td>
  );
}
