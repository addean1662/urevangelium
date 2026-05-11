import { notFound } from 'next/navigation';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';
import { loadVerse } from '@/lib/data';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import { GospelSelector } from '@/components/GospelSelector';
import { PassageNav } from '@/components/PassageNav';
import { SiteHeader } from '@/components/SiteHeader';

type Params = Promise<{ gospel: string; chapter: string; verse: string }>;

const GOSPEL_DISPLAY: Record<Gospel, string> = {
  matthew: 'Matthew',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
};

export async function generateStaticParams() {
  return GOSPELS.map((gospel) => ({ gospel, chapter: '1', verse: '1' }));
}

export default async function PassagePage({ params }: { params: Params }) {
  const { gospel, chapter: chapterStr, verse: verseStr } = await params;

  if (!GOSPELS.includes(gospel as Gospel)) notFound();

  const chapter = Number(chapterStr);
  const verse = Number(verseStr);

  if (!Number.isInteger(chapter) || chapter < 1) notFound();
  if (!Number.isInteger(verse) || verse < 1) notFound();

  const g = gospel as Gospel;
  const data = await loadVerse(g, chapter, verse);

  const gospelLabel = GOSPEL_DISPLAY[g];
  const passageLabel = `${gospelLabel} ${chapter}:${verse}`;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />

      <GospelSelector current={g} chapter={chapter} verse={verse} />

      <div className="flex items-center gap-2 px-4 py-2 border-b border-rule-hairline bg-bg-elevated">
        <h2 className="text-lg font-semibold text-ink-primary">{passageLabel}</h2>
      </div>

      <PassageNav gospel={g} chapter={chapter} verse={verse} />

      <main className="flex-1 p-4">
        {data ? (
          <>
            <p className="text-center italic text-[13px] text-ink-muted mb-3 mt-1">
              Hover any Greek or Syriac word for phonetic transliteration.
            </p>
            <AlignmentTable data={data} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
            <p className="text-lg font-medium">{passageLabel}</p>
            <p className="text-sm mt-2">
              Alignment data not yet populated. See{' '}
              <code className="bg-bg-elevated px-1 rounded text-ink-secondary">
                data/{g}/{chapter}/{verse}.json
              </code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
