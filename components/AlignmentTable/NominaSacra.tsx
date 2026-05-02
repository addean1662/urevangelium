import type { NominaSacraExpansion } from '@/lib/types';

interface Props {
  ns: NominaSacraExpansion;
}

export function NominaSacra({ ns }: Props) {
  return (
    <abbr
      title={ns.expansion}
      className="cursor-help decoration-dotted underline underline-offset-2 no-italic"
      aria-label={`Nomina sacra ${ns.contraction} — expanded: ${ns.expansion}`}
    >
      {ns.contraction}
    </abbr>
  );
}
