import type { NominaSacraExpansion } from '@/lib/types';

interface Props {
  ns: NominaSacraExpansion;
  children?: React.ReactNode;
}

export function NominaSacra({ ns, children }: Props) {
  return (
    <abbr
      title={ns.expansion}
      className="cursor-help decoration-dotted underline underline-offset-2 no-italic"
      aria-label={`Nomina sacra ${ns.contraction} — expanded: ${ns.expansion}`}
    >
      {children ?? ns.contraction}
    </abbr>
  );
}
