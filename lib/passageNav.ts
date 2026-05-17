import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';
import { VERSE_COUNTS } from '@/lib/verseCounts';

export function buildPassagePath(gospel: Gospel, chapter: number, verse: number): string {
  return `/${gospel}/${chapter}/${verse}`;
}

export function prevBook(gospel: Gospel): string | null {
  const i = GOSPELS.indexOf(gospel);
  if (i <= 0) return null;
  return buildPassagePath(GOSPELS[i - 1], 1, 1);
}

export function nextBook(gospel: Gospel): string | null {
  const i = GOSPELS.indexOf(gospel);
  if (i < 0 || i >= GOSPELS.length - 1) return null;
  return buildPassagePath(GOSPELS[i + 1], 1, 1);
}

export function prevChapter(
  gospel: Gospel,
  chapter: number,
  chapterVerseCounts: number[],
): string | null {
  if (chapter > 1) return buildPassagePath(gospel, chapter - 1, 1);
  // At chapter 1 — jump to last chapter of previous book
  const i = GOSPELS.indexOf(gospel);
  if (i <= 0) return null;
  const prevGospel = GOSPELS[i - 1];
  const prevCounts = VERSE_COUNTS[prevGospel];
  return buildPassagePath(prevGospel, prevCounts.length, 1);
}

export function nextChapter(
  gospel: Gospel,
  chapter: number,
  chapterVerseCounts: number[],
): string | null {
  if (chapter < chapterVerseCounts.length) return buildPassagePath(gospel, chapter + 1, 1);
  // At last chapter — jump to chapter 1 of next book
  const i = GOSPELS.indexOf(gospel);
  if (i < 0 || i >= GOSPELS.length - 1) return null;
  return buildPassagePath(GOSPELS[i + 1], 1, 1);
}

export function prevVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
  chapterVerseCounts: number[],
): string | null {
  if (verse > 1) return buildPassagePath(gospel, chapter, verse - 1);
  if (chapter > 1) {
    const prevChapterVerses = chapterVerseCounts[chapter - 2];
    if (!prevChapterVerses) return null;
    return buildPassagePath(gospel, chapter - 1, prevChapterVerses);
  }
  // At verse 1 chapter 1 — jump to last verse of last chapter of previous book
  const i = GOSPELS.indexOf(gospel);
  if (i <= 0) return null;
  const prevGospel = GOSPELS[i - 1];
  const prevCounts = VERSE_COUNTS[prevGospel];
  const lastChapter = prevCounts.length;
  const lastVerse = prevCounts[lastChapter - 1];
  return buildPassagePath(prevGospel, lastChapter, lastVerse);
}

export function nextVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
  chapterVerseCounts: number[],
): string | null {
  const versesInChapter = chapterVerseCounts[chapter - 1];
  if (!versesInChapter) return null;
  if (verse < versesInChapter) return buildPassagePath(gospel, chapter, verse + 1);
  if (chapter < chapterVerseCounts.length) return buildPassagePath(gospel, chapter + 1, 1);
  // At last verse of last chapter — jump to next book
  const i = GOSPELS.indexOf(gospel);
  if (i < 0 || i >= GOSPELS.length - 1) return null;
  return buildPassagePath(GOSPELS[i + 1], 1, 1);
}
