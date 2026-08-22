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
  let pendingKey: VerseKey | null = null;
  let pendingText: string[] = [];
  const flush = () => {
    if (!pendingKey) return;
    map.set(pendingKey, tokeniseSyriac(pendingText.join(' ')));
    pendingKey = null;
    pendingText = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === header) {
      inSection = true;
      continue;
    }
    if (inSection && trimmed.startsWith('### ')) {
      flush();
      break;
    }

    if (!inSection) continue;

    // Format: [chapter:verse] Syriac text ܀
    const match = trimmed.match(/^\[(\d+):(\d+)\]\s*(.*)$/);
    if (match) {
      flush();
      const [, ch, v, text] = match;
      pendingKey = `${ch}:${v}`;
      pendingText = [text];
    } else if (pendingKey && trimmed && !trimmed.startsWith('#')) {
      pendingText.push(trimmed);
    }
  }
  flush();

  if (gospel === 'mark') {
    const verse49 = map.get('9:49') ?? [];
    const marker = verse49.indexOf('50');
    if (marker < 0 || (map.get('9:50')?.length ?? 0) !== 0) {
      throw new Error('Unexpected Peshitta Mark 9:49-50 source boundary');
    }
    map.set('9:49', verse49.slice(0, marker));
    map.set('9:50', verse49.slice(marker + 1));
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
