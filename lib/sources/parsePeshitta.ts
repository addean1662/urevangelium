import fs from 'fs';
import path from 'path';
import type { Gospel } from '@/lib/types';

const GOSPEL_HEADERS: Record<Gospel, string> = {
  matthew: '### Matthew',
  mark: '### Mark',
  luke: '### Luke',
  john: '### John',
};

type VerseKey = string; // "1:1"

let fileLines: string[] | null = null;
const sectionCache = new Map<Gospel, Map<VerseKey, string[]>>();

function getLines(): string[] {
  if (fileLines) return fileLines;
  const filePath = path.join(process.cwd(), 'data/sources/peshitta/Peshitta.txt');
  fileLines = fs.readFileSync(filePath, 'utf8').split('\n');
  return fileLines;
}

function loadGospel(gospel: Gospel): Map<VerseKey, string[]> {
  const cached = sectionCache.get(gospel);
  if (cached) return cached;

  const lines = getLines();
  const header = GOSPEL_HEADERS[gospel];
  const map = new Map<VerseKey, string[]>();

  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === header) {
      inSection = true;
      continue;
    }
    if (inSection && trimmed.startsWith('### ')) break;

    if (!inSection) continue;

    // Format: [chapter:verse] Syriac text ܀
    const match = trimmed.match(/^\[(\d+):(\d+)\]\s+(.+)$/);
    if (!match) continue;

    const [, ch, v, text] = match;
    const words = tokeniseSyriac(text);
    if (words.length > 0) {
      map.set(`${ch}:${v}`, words);
    }
  }

  sectionCache.set(gospel, map);
  return map;
}

function tokeniseSyriac(text: string): string[] {
  return text
    .split(/\s+/)
    .map(w => w
      // Strip Syriac punctuation: ܀ (sof pasuqa), ܁ (supralinear full stop), ܃ (comma)
      .replace(/[܀-܍܏]+$/, '')
      .replace(/^[܀-܍܏]+/, '')
      .trim()
    )
    .filter(Boolean);
}

export function getPeshittaVerse(gospel: Gospel, chapter: number, verse: number): string[] {
  const map = loadGospel(gospel);
  return map.get(`${chapter}:${verse}`) ?? [];
}
