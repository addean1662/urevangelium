'use client';

import { useMemo, useState } from 'react';
import type { VerseData } from '@/lib/types';
import { buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import { AlignmentTable } from './AlignmentTable';
import { WordStreams } from './WordStreams';
import { verifyVerse, type VerseExpectations } from '@/lib/verification/verifyVerse';
import { VerseVerification } from './VerseVerification';
import { buildEnglishViews, type EnglishViews } from '@/lib/alignment/englishPresentation';

type Props = {
  data: VerseData;
  evidence?: StreamEvidence;
  expectations?: VerseExpectations;
  englishViews?: EnglishViews;
  nextFragment?: string | null;
  nextFragmentHref?: string | null;
};

export function AlignmentExplorer({ data, evidence, expectations, englishViews: preparedEnglish, nextFragment, nextFragmentHref }: Props) {
  const [view, setView] = useState<'streams' | 'rows'>('streams');
  const model = useMemo(() => buildStreamModel(data, evidence), [data, evidence]);
  const englishViews = useMemo(() => preparedEnglish ?? buildEnglishViews(model, expectations), [preparedEnglish, model, expectations]);
  const report = useMemo(() => verifyVerse(data, model, expectations, englishViews), [data, model, expectations, englishViews]);
  return (
    <section aria-label="Source text comparison">
      <VerseVerification report={report} />
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
      {view === 'streams' ? <WordStreams model={model} englishViews={englishViews} papyrusConflicts={expectations?.sources.papyrus?.conflicts} nextFragment={nextFragment} nextFragmentHref={nextFragmentHref} /> : <AlignmentTable data={data} englishViews={englishViews} papyrusConflicts={expectations?.sources.papyrus?.conflicts} nextFragment={nextFragment} nextFragmentHref={nextFragmentHref} />}
    </section>
  );
}
