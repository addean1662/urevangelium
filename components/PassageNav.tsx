'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import { buildPassagePath, nextVerse, prevVerse } from '@/lib/data';
import type { Gospel } from '@/lib/types';

interface Props {
  gospel: Gospel;
  chapter: number;
  verse: number;
}

export function PassageNav({ gospel, chapter, verse }: Props) {
  const router = useRouter();
  const counts = VERSE_COUNTS[gospel];
  const versesInChapter = counts[chapter - 1] ?? 0;

  const prevPath = prevVerse(gospel, chapter, verse, counts);
  const nextPath = nextVerse(gospel, chapter, verse, counts);

  function handleChapterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildPassagePath(gospel, Number(e.target.value), 1));
  }

  function handleVerseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildPassagePath(gospel, chapter, Number(e.target.value)));
  }

  return (
    <nav
      className="flex items-center gap-4 px-4 py-2 bg-stone-100 border-b border-stone-200 text-sm"
      aria-label="Passage navigation"
    >
      {prevPath ? (
        <Link
          href={prevPath}
          className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
          aria-label="Previous verse"
        >
          ← Prev
        </Link>
      ) : (
        <span className="px-2 py-1 text-stone-300 border border-transparent">← Prev</span>
      )}

      <span className="text-stone-500">Chapter</span>
      <select
        value={chapter}
        onChange={handleChapterChange}
        className="border border-stone-300 rounded px-2 py-1 bg-white text-stone-700"
        aria-label="Select chapter"
      >
        {counts.map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>

      <span className="text-stone-500">Verse</span>
      <select
        value={verse}
        onChange={handleVerseChange}
        className="border border-stone-300 rounded px-2 py-1 bg-white text-stone-700"
        aria-label="Select verse"
      >
        {Array.from({ length: versesInChapter }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>

      {nextPath ? (
        <Link
          href={nextPath}
          className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
          aria-label="Next verse"
        >
          Next →
        </Link>
      ) : (
        <span className="px-2 py-1 text-stone-300 border border-transparent">Next →</span>
      )}
    </nav>
  );
}
