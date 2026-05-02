import { notFound } from 'next/navigation';
import type { PageProps } from 'next/types';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';
import { loadVerse } from '@/lib/data';
import { AlignmentTable } from '@/components/AlignmentTable/AlignmentTable';
import { GospelSelector } from '@/components/GospelSelector';
import { PassageNav } from '@/components/PassageNav';

const GOSPEL_DISPLAY: Record<Gospel, string> = {
  matthew: 'Matthew',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
};

export async function generateStaticParams() {
  return GOSPELS.flatMap((gospel) =>
    [{ gospel, chapter: '1', verse: '1' }]
  );
}

export default async function PassagePage({
  params,
}: PageProps<'/[gospel]/[chapter]/[verse]'>) {
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
      <header className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Urevangelium</h1>
        <span className="text-stone-400 text-sm">
          Six-witness Gospel alignment
        </span>
      </header>

      <GospelSelector current={g} chapter={chapter} verse={verse} />

      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 bg-white">
        <h2 className="text-base font-semibold text-stone-800">{passageLabel}</h2>
      </div>

      <PassageNav gospel={g} chapter={chapter} verse={verse} />

      <main className="flex-1 p-4">
        {data ? (
          <AlignmentTable data={data} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <p className="text-lg font-medium">{passageLabel}</p>
            <p className="text-sm mt-2">
              Alignment data not yet populated. See{' '}
              <code className="bg-stone-100 px-1 rounded text-stone-600">
                data/{g}/{chapter}/{verse}.json
              </code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
