import type { GlossCell as GlossCellType } from '@/lib/types';

interface Props {
  gloss?: GlossCellType | null;
  className?: string;
}

export function GlossCell({ gloss, className = '' }: Props) {
  const base = `px-3 py-1.5 text-xs border-b border-stone-200 border-l border-l-stone-100 align-top ${className}`;

  if (!gloss) {
    return <td className={`${base} text-stone-200`} aria-label="no gloss">—</td>;
  }

  return (
    <td className={`${base} text-stone-500 italic`}>
      {gloss.gloss}
      {gloss.deviation && (
        <span
          className="not-italic ml-1.5 text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded leading-none"
          title={`Non-default source: ${gloss.source}`}
        >
          {gloss.source}
        </span>
      )}
    </td>
  );
}
