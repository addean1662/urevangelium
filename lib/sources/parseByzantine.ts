import fs from 'fs';
import path from 'path';
import type { Gospel } from '@/lib/types';

const FILE: Record<Gospel, string> = {
  matthew: 'MAT.csv',
  mark: 'MAR.csv',
  luke: 'LUK.csv',
  john: 'JOH.csv',
};

type VerseKey = string; // "1:1"
const fileCache = new Map<Gospel, Map<VerseKey, string[]>>();

function loadByzantine(gospel: Gospel): Map<VerseKey, string[]> {
  const cached = fileCache.get(gospel);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), `data/sources/byzantine/${FILE[gospel]}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const map = new Map<VerseKey, string[]>();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('chapter')) continue;

    // CSV format: chapter,verse,"text" (quoted because text contains commas)
    const firstComma = trimmed.indexOf(',');
    if (firstComma < 0) continue;
    const chapter = trimmed.slice(0, firstComma).trim();
    const rest = trimmed.slice(firstComma + 1);
    const secondComma = rest.indexOf(',');
    if (secondComma < 0) continue;
    const verse = rest.slice(0, secondComma).trim();
    const textRaw = rest.slice(secondComma + 1).trim().replace(/^"|"$/g, '');

    const words = tokeniseGreek(textRaw);
    if (words.length > 0) {
      map.set(`${chapter}:${verse}`, words);
    }
  }

  fileCache.set(gospel, map);
  return map;
}

function tokeniseGreek(text: string): string[] {
  return text
    .split(/\s+/)
    .map(w => w
      .replace(/^¶/, '')          // paragraph marker
      .replace(/[.,·;:!?…]+$/, '') // trailing punctuation
      .replace(/^[„"([\-]+/, '')   // leading punctuation
      .trim()
    )
    .filter(Boolean);
}

export function getByzantineVerse(gospel: Gospel, chapter: number, verse: number): string[] {
  const map = loadByzantine(gospel);
  return map.get(`${chapter}:${verse}`) ?? [];
}
