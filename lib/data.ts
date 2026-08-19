import 'server-only';
import fs from 'fs';
import path from 'path';
import type { Gospel, VerseData } from '@/lib/types';
import { VerseDataSchema } from '@/lib/validate';
import { getCachedVerse, cacheVerse } from '@/lib/cache';
import { computeAlignment } from '@/lib/alignment/computeAlignment';
import vulgateEnglishManifest from '@/data/sources/vulgate-english/admitted-units.json';
export { buildPassagePath, nextVerse, prevVerse } from '@/lib/passageNav';

type VulgateEnglishUnit = NonNullable<VerseData['vulgateEnglishUnit']>;
const vulgateEnglishUnits = vulgateEnglishManifest.units as Record<string, VulgateEnglishUnit>;

function withVulgateEnglish(data: VerseData | null): VerseData | null {
  if (!data) return null;
  const unit = vulgateEnglishUnits[`${data.gospel} ${data.chapter}:${data.verse}`];
  return unit ? { ...data, vulgateEnglishUnit: unit } : data;
}

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
    return withVulgateEnglish(readJson(handCoded));
  }

  // 2. Check Redis / disk cache
  const cached = await getCachedVerse(gospel, chapter, verse);
  if (cached) return withVulgateEnglish(cached);

  // 3. Compute alignment on demand
  try {
    const data = await computeAlignment(gospel, chapter, verse);
    if (data) {
      await cacheVerse(gospel, chapter, verse, data);
    }
    return withVulgateEnglish(data);
  } catch (err) {
    console.error(`computeAlignment failed for ${gospel} ${chapter}:${verse}`, err);
    return null;
  }
}
