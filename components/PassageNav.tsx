'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import { buildPassagePath, nextVerse, prevVerse } from '@/lib/passageNav';
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
      className="flex items-center gap-4 px-4 py-2 bg-bg-elevated border-b border-rule-hairline text-base"
      aria-label="Passage navigation"
    >
      {prevPath ? (
        <Link
          href={prevPath}
          className="px-2 py-1 rounded border border-band text-band hover:bg-band hover:text-ink-on-band"
          aria-label="Previous verse"
        >
          ← Prev
        </Link>
      ) : (
        <span className="px-2 py-1 text-ink-muted border border-transparent">← Prev</span>
      )}

      <span className="text-ink-secondary">Chapter</span>
      <select
        value={chapter}
        onChange={handleChapterChange}
        className="border border-rule-hairline rounded px-2 py-1 bg-bg-page text-ink-primary"
        aria-label="Select chapter"
      >
        {counts.map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>

      <span className="text-ink-secondary">Verse</span>
      <select
        value={verse}
        onChange={handleVerseChange}
        className="border border-rule-hairline rounded px-2 py-1 bg-bg-page text-ink-primary"
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
          className="px-2 py-1 rounded border border-band text-band hover:bg-band hover:text-ink-on-band"
          aria-label="Next verse"
        >
          Next →
        </Link>
      ) : (
        <span className="px-2 py-1 text-ink-muted border border-transparent">Next →</span>
      )}
    </nav>
  );
}
