import fs from 'fs';
import path from 'path';
import type { Gospel, VerseData } from '@/lib/types';
import { VerseDataSchema } from '@/lib/validate';
import { getCachedVerse, cacheVerse } from '@/lib/cache';
import { computeAlignment } from '@/lib/alignment/computeAlignment';

function handCodedPath(gospel: Gospel, chapter: number, verse: number): string {
  return path.join(process.cwd(), 'data', gospel, String(chapter), `${verse}.json`);
}

function readJson(filePath: string): VerseData | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const result = VerseDataSchema.safeParse(raw);
    if (!result.success) {
      console.error(`Invalid verse data at ${filePath}`, result.error.format());
      return null;
    }
    return result.data as VerseData;
  } catch {
    return null;
  }
}

export async function loadVerse(
  gospel: Gospel,
  chapter: number,
  verse: number
): Promise<VerseData | null> {
  // 1. Check hand-coded proof verses (never recomputed or overwritten)
  const handCoded = handCodedPath(gospel, chapter, verse);
  if (fs.existsSync(handCoded)) {
    return readJson(handCoded);
  }

  // 2. Check Redis / disk cache
  const cached = await getCachedVerse(gospel, chapter, verse);
  if (cached) return cached;

  // 3. Compute alignment on demand
  try {
    const data = await computeAlignment(gospel, chapter, verse);
    if (data) {
      await cacheVerse(gospel, chapter, verse, data);
    }
    return data;
  } catch (err) {
    console.error(`computeAlignment failed for ${gospel} ${chapter}:${verse}`, err);
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
