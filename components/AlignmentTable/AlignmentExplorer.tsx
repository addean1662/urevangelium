'use client';

import { useMemo, useState } from 'react';
import type { VerseData } from '@/lib/types';
import { buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import { AlignmentTable } from './AlignmentTable';
import { WordStreams } from './WordStreams';

type Props = {
  data: VerseData;
  evidence?: StreamEvidence;
  nextFragment?: string | null;
  nextFragmentHref?: string | null;
};

export function AlignmentExplorer({ data, evidence, nextFragment, nextFragmentHref }: Props) {
  const [view, setView] = useState<'streams' | 'rows'>('streams');
  const model = useMemo(() => buildStreamModel(data, evidence), [data, evidence]);
  return (
    <section aria-label="Source text comparison">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded border border-rule-strong p-0.5" aria-label="Reading view" role="group">
          {(['streams', 'rows'] as const).map(mode => (
            <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={`rounded px-3 py-1 text-sm ${view === mode ? 'bg-band text-ink-on-band' : 'hover:bg-bg-elevated'}`}>
              {mode === 'streams' ? 'Word streams' : 'Comparison rows'}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-secondary">Alignment preview · correspondence review is incomplete.</p>
      </div>
      {view === 'streams' ? <WordStreams model={model} nextFragment={nextFragment} nextFragmentHref={nextFragmentHref} /> : <AlignmentTable data={data} nextFragment={nextFragment} nextFragmentHref={nextFragmentHref} />}
    </section>
  );
}
