interface Props {
  showGlosses: boolean;
  onToggle: () => void;
}

export function GlossToggle({ showGlosses, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="text-xs px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition-colors"
      aria-pressed={showGlosses}
    >
      {showGlosses ? 'Hide glosses' : 'Show glosses'}
    </button>
  );
}
