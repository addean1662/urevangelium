import fs from 'fs';
import path from 'path';
import type { Gospel } from '@/lib/types';

const GOSPEL_ORDER: Gospel[] = ['matthew', 'mark', 'luke', 'john'];

const GOSPEL_DISPLAY: Record<Gospel, string> = {
  matthew: 'Matthew',
  mark:    'Mark',
  luke:    'Luke',
  john:    'John',
};

export type NextFragment =
  | { kind: 'next-verse' }
  | { kind: 'same-gospel'; chapter: number; verse: number }
  | { kind: 'other-gospel'; gospel: Gospel; chapter: number; verse: number }
  | { kind: 'none' };

export function formatNextFragment(
  current: { gospel: Gospel; chapter: number; verse: number },
  next: NextFragment,
): string | null {
  if (next.kind === 'none') return null;
  if (next.kind === 'next-verse') return 'Next verse available';
  if (next.kind === 'same-gospel') return `Next: ${next.chapter}:${next.verse}`;
  return `Next: ${GOSPEL_DISPLAY[next.gospel]} ${next.chapter}:${next.verse}`;
}

// Cached flat sorted list of all covered verses: [gospelIndex, chapter, verse]
let _covered: Array<[number, number, number]> | null = null;

function loadCovered(): Array<[number, number, number]> {
  if (_covered) return _covered;

  const src = path.join(process.cwd(), 'data/sources/earliest-papyrus/coverage-index.json');
  const { byVerse } = JSON.parse(fs.readFileSync(src, 'utf8'));

  const list: Array<[number, number, number]> = [];
  for (let gi = 0; gi < GOSPEL_ORDER.length; gi++) {
    const g = GOSPEL_ORDER[gi];
    const chapters = byVerse[g];
    if (!chapters) continue;
    for (const chStr of Object.keys(chapters).sort((a, b) => Number(a) - Number(b))) {
      const ch = Number(chStr);
      for (const vStr of Object.keys(chapters[chStr]).sort((a, b) => Number(a) - Number(b))) {
        list.push([gi, ch, Number(vStr)]);
      }
    }
  }

  _covered = list;
  return list;
}

export function getNextPapyrusVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
): NextFragment {
  const covered = loadCovered();
  const gi = GOSPEL_ORDER.indexOf(gospel);

  // Find first covered verse strictly after current position
  for (const [cgi, cch, cv] of covered) {
    if (cgi < gi) continue;
    if (cgi === gi && cch < chapter) continue;
    if (cgi === gi && cch === chapter && cv <= verse) continue;

    // This is the next one
    if (cgi === gi && cch === chapter && cv === verse + 1) {
      return { kind: 'next-verse' };
    }
    if (cgi === gi) {
      return { kind: 'same-gospel', chapter: cch, verse: cv };
    }
    return { kind: 'other-gospel', gospel: GOSPEL_ORDER[cgi], chapter: cch, verse: cv };
  }

  return { kind: 'none' };
}
