import 'server-only';
import fs from 'fs';
import path from 'path';
import type { Gospel, VerseData } from '@/lib/types';
import { VerseDataSchema } from '@/lib/validate';
import { getCachedVerse, cacheVerse } from '@/lib/cache';
import { computeAlignment } from '@/lib/alignment/computeAlignment';
import vulgateEnglishManifest from '@/data/sources/vulgate-english/admitted-units.json';
import peshittaEnglishManifest from '@/data/sources/peshitta/murdock-admitted-units.json';
export { buildPassagePath, nextVerse, prevVerse } from '@/lib/passageNav';

type VulgateEnglishUnit = NonNullable<VerseData['vulgateEnglishUnit']>;
const vulgateEnglishUnits = vulgateEnglishManifest.units as Record<string, VulgateEnglishUnit>;
type PeshittaEnglishUnit = NonNullable<VerseData['peshittaEnglishUnit']>;
const peshittaEnglishUnits = peshittaEnglishManifest.units as Record<string, PeshittaEnglishUnit>;
const REQUIRED_ALIGNMENT_CELLS = [
  'papyrus',
  'vaticanus',
  'sinaiticus',
  'vulgate',
  'peshitta',
  'byzantine',
] as const;

/**
 * The Sahidica source-certification import added source-complete Coptic-only
 * alignment rows before their contextual placement was adjudicated. Preserve
 * those source tokens, but materialize their absent comparison cells in memory
 * so one transitional row cannot invalidate and blank an entire verse.
 *
 * This is deliberately limited to rows containing Sahidic text. It does not
 * rewrite the corpus or classify an absence as a manuscript omission/loss.
 */
export function materializeCopticAlignmentGaps(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { rows?: unknown }).rows)) return raw;

  const document = raw as { rows: Array<Record<string, unknown>> };
  return {
    ...document,
    rows: document.rows.map((row) => {
      const coptic = row.coptic as { type?: unknown } | undefined;
      if (coptic?.type !== 'text') return row;

      const completed = { ...row };
      for (const column of REQUIRED_ALIGNMENT_CELLS) {
        if (completed[column] == null) completed[column] = { type: 'empty' };
      }
      return completed;
    }),
  };
}

function withVulgateEnglish(data: VerseData | null): VerseData | null {
  if (!data) return null;
  const unit = vulgateEnglishUnits[`${data.gospel} ${data.chapter}:${data.verse}`];
  return unit ? { ...data, vulgateEnglishUnit: unit } : data;
}

function withCertifiedEnglish(data: VerseData | null): VerseData | null {
  const withVulgate = withVulgateEnglish(data);
  if (!withVulgate) return null;
  const unit = peshittaEnglishUnits[`${withVulgate.gospel} ${withVulgate.chapter}:${withVulgate.verse}`];
  return unit ? { ...withVulgate, peshittaEnglishUnit: unit } : withVulgate;
}

function handCodedPath(gospel: Gospel, chapter: number, verse: number): string {
  return path.join(process.cwd(), 'data', gospel, String(chapter), `${verse}.json`);
}

function readJson(filePath: string): VerseData | null {
  try {
    const raw = materializeCopticAlignmentGaps(JSON.parse(fs.readFileSync(filePath, 'utf8')));
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
    return withCertifiedEnglish(readJson(handCoded));
  }

  // 2. Check Redis / disk cache
  const cached = await getCachedVerse(gospel, chapter, verse);
  if (cached) return withCertifiedEnglish(cached);

  // 3. Compute alignment on demand
  try {
    const data = await computeAlignment(gospel, chapter, verse);
    if (data) {
      await cacheVerse(gospel, chapter, verse, data);
    }
    return withCertifiedEnglish(data);
  } catch (err) {
    console.error(`computeAlignment failed for ${gospel} ${chapter}:${verse}`, err);
    return null;
  }
}
