'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GOSPELS } from '@/lib/types';
import type { Gospel } from '@/lib/types';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import { buildPassagePath, nextVerse, prevVerse, nextChapter, prevChapter, prevBook, nextBook } from '@/lib/passageNav';

interface Props {
  gospel: Gospel;
  chapter: number;
  verse: number;
}

function prevBookLastVerse(gospel: Gospel): string | null {
  const i = GOSPELS.indexOf(gospel);
  if (i <= 0) return null;
  const pg = GOSPELS[i - 1];
  const pc = VERSE_COUNTS[pg];
  const lastCh = pc.length;
  return buildPassagePath(pg, lastCh, pc[lastCh - 1]);
}

function prevBookLastChapter(gospel: Gospel): string | null {
  const i = GOSPELS.indexOf(gospel);
  if (i <= 0) return null;
  const pg = GOSPELS[i - 1];
  return buildPassagePath(pg, VERSE_COUNTS[pg].length, 1);
}

function nextBookFirstVerse(gospel: Gospel): string | null {
  const i = GOSPELS.indexOf(gospel);
  if (i < 0 || i >= GOSPELS.length - 1) return null;
  return buildPassagePath(GOSPELS[i + 1], 1, 1);
}

export function PassageNav({ gospel, chapter, verse }: Props) {
  const router = useRouter();
  const counts = VERSE_COUNTS[gospel];
  const versesInChapter = counts[chapter - 1] ?? 0;

  const prevBookPath    = prevBook(gospel);
  const prevChapterPath = prevChapter(gospel, chapter) ?? prevBookLastChapter(gospel);
  const prevVersePath   = prevVerse(gospel, chapter, verse, counts) ?? prevBookLastVerse(gospel);
  const nextVersePath   = nextVerse(gospel, chapter, verse, counts) ?? nextBookFirstVerse(gospel);
  const nextChapterPath = nextChapter(gospel, chapter, counts) ?? nextBookFirstVerse(gospel);
  const nextBookPath    = nextBook(gospel);

  function handleChapterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildPassagePath(gospel, Number(e.target.value), 1));
  }

  function handleVerseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildPassagePath(gospel, chapter, Number(e.target.value)));
  }

  const activeBtn = 'px-2 py-1 rounded border border-band text-band hover:bg-band hover:text-ink-on-band';
  const disabledBtn = 'px-2 py-1 rounded border border-rule-hairline text-ink-muted cursor-not-allowed';

  return (
    <nav
      className="flex items-center gap-4 px-4 py-2 bg-bg-elevated border-b border-rule-hairline text-base"
      aria-label="Passage navigation"
    >
      {prevBookPath ? (
        <Link href={prevBookPath} className={activeBtn} aria-label="Previous book">← Prev Book</Link>
      ) : (
        <span className={disabledBtn}>← Prev Book</span>
      )}

      {prevChapterPath ? (
        <Link href={prevChapterPath} className={activeBtn} aria-label="Previous chapter">← Prev Chapter</Link>
      ) : (
        <span className={disabledBtn}>← Prev Chapter</span>
      )}

      {prevVersePath ? (
        <Link href={prevVersePath} className={activeBtn} aria-label="Previous verse">← Prev Verse</Link>
      ) : (
        <span className={disabledBtn}>← Prev Verse</span>
      )}

      <span className="text-ink-secondary">Chapter</span>
      <select
        value={chapter}
        onChange={handleChapterChange}
        className="border border-rule-hairline rounded px-2 py-1 bg-bg-page text-ink-primary"
        aria-label="Select chapter"
      >
        {counts.map((_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
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
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>

      {nextVersePath ? (
        <Link href={nextVersePath} className={activeBtn} aria-label="Next verse">Next Verse →</Link>
      ) : (
        <span className={disabledBtn}>Next Verse →</span>
      )}

      {nextChapterPath ? (
        <Link href={nextChapterPath} className={activeBtn} aria-label="Next chapter">Next Chapter →</Link>
      ) : (
        <span className={disabledBtn}>Next Chapter →</span>
      )}

      {nextBookPath ? (
        <Link href={nextBookPath} className={activeBtn} aria-label="Next book">Next Book →</Link>
      ) : (
        <span className={disabledBtn}>Next Book →</span>
      )}
    </nav>
  );
}
