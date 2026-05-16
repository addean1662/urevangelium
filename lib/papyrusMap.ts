// lib/papyrusMap.ts — server-only data loader for the papyrus map page
import fs from 'fs';
import path from 'path';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';

const GOSPEL_ORDER = GOSPELS; // ['matthew','mark','luke','john']

export interface PapyrusVerseRef { gospel: Gospel; chapter: number; verse: number }

export interface PapyrusInfo {
  siglum: string;
  date: string;
  verseCount: number;
  hasCNTR: boolean;
  gospels: Gospel[];
  verseCountByGospel: Partial<Record<Gospel, number>>;
  /** Which chapters are covered, keyed by gospel */
  chaptersCovered: Partial<Record<Gospel, Set<number>>>;
  firstVerse: PapyrusVerseRef | null;
}

function hasCNTRText(siglum: string): boolean {
  const stem = siglum.includes('+') ? siglum.split('+')[0] : siglum;
  const fp = path.join(process.cwd(), 'data/sources/earliest-papyrus', stem + '.txt');
  if (!fs.existsSync(fp)) return false;
  const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(l => /^\d{8}\s/.test(l));
  return lines.some(l => !l.includes('[stub'));
}

export function loadPapyrusMap(): {
  papyri: PapyrusInfo[];
  totalCitations: number;
  gospelTotals: Record<Gospel, number>;
  chapterCount: Record<Gospel, number>;
} {
  const src = path.join(process.cwd(), 'data/sources/earliest-papyrus/coverage-index.json');
  const raw = JSON.parse(fs.readFileSync(src, 'utf8')) as {
    papyri: Array<{ siglum: string; date: string; verses: Array<{ gospel: string; chapter: number; verse: number }> }>;
  };

  function sortKey(date: string): number {
    const m = date.match(/\d{3,4}/);
    return m ? parseInt(m[0]) : 9999;
  }

  const papyri: PapyrusInfo[] = raw.papyri
    .sort((a, b) => sortKey(a.date) - sortKey(b.date))
    .map(p => {
      const gospelSet = new Set<Gospel>();
      const countByGospel: Partial<Record<Gospel, number>> = {};
      const chaptersCovered: Partial<Record<Gospel, Set<number>>> = {};

      for (const v of p.verses) {
        const g = v.gospel as Gospel;
        gospelSet.add(g);
        countByGospel[g] = (countByGospel[g] ?? 0) + 1;
        if (!chaptersCovered[g]) chaptersCovered[g] = new Set();
        chaptersCovered[g]!.add(v.chapter);
      }

      const gospelsSorted = GOSPEL_ORDER.filter(g => gospelSet.has(g));

      // First verse in canonical order
      let firstVerse: PapyrusVerseRef | null = null;
      for (const g of gospelsSorted) {
        const vv = p.verses.filter(v => v.gospel === g).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
        if (vv.length) { firstVerse = { gospel: g, chapter: vv[0].chapter, verse: vv[0].verse }; break; }
      }

      return {
        siglum: p.siglum,
        date: p.date,
        verseCount: p.verses.length,
        hasCNTR: hasCNTRText(p.siglum),
        gospels: gospelsSorted,
        verseCountByGospel: countByGospel,
        chaptersCovered,
        firstVerse,
      };
    });

  const gospelTotals = {} as Record<Gospel, number>;
  const chapterCount = {} as Record<Gospel, number>;
  for (const g of GOSPEL_ORDER) {
    gospelTotals[g] = VERSE_COUNTS[g].reduce((s, n) => s + n, 0);
    chapterCount[g] = VERSE_COUNTS[g].length;
  }

  const totalCitations = papyri.reduce((s, p) => s + p.verseCount, 0);

  return { papyri, totalCitations, gospelTotals, chapterCount };
}
