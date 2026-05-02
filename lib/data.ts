import type { Gospel, VerseData } from '@/lib/types';

export async function loadVerse(
  gospel: Gospel,
  chapter: number,
  verse: number
): Promise<VerseData | null> {
  try {
    const data = await import(`@/data/${gospel}/${chapter}/${verse}.json`);
    return data.default as VerseData;
  } catch {
    return null;
  }
}

export function buildPassagePath(
  gospel: Gospel,
  chapter: number,
  verse: number
): string {
  return `/${gospel}/${chapter}/${verse}`;
}

// Returns the next verse path, wrapping chapters as needed.
// Returns null if this is the last verse of the gospel.
export function nextVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
  chapterVerseCounts: number[]
): string | null {
  const versesInChapter = chapterVerseCounts[chapter - 1];
  if (!versesInChapter) return null;

  if (verse < versesInChapter) {
    return buildPassagePath(gospel, chapter, verse + 1);
  }
  if (chapter < chapterVerseCounts.length) {
    return buildPassagePath(gospel, chapter + 1, 1);
  }
  return null;
}

export function prevVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
  chapterVerseCounts: number[]
): string | null {
  if (verse > 1) {
    return buildPassagePath(gospel, chapter, verse - 1);
  }
  if (chapter > 1) {
    const prevChapterVerses = chapterVerseCounts[chapter - 2];
    if (!prevChapterVerses) return null;
    return buildPassagePath(gospel, chapter - 1, prevChapterVerses);
  }
  return null;
}
