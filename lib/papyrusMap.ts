// lib/papyrusMap.ts — server-only data loader for the papyrus map page
import fs from 'fs';
import path from 'path';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';

const GOSPEL_ORDER = GOSPELS; // ['matthew','mark','luke','john']

// Discovery / acquisition / recognition dates, keyed by siglum.
// year = null means no secure excavation/acquisition date is documented.
// Sources: Grenfell & Hunt (1898–1914), INTF register, published collection catalogues.
const DISCOVERY_DATA: Record<string, { year: number | null; note: string }> = {
  'P1':      { year: 1896, note: 'Excavated winter 1896–97, Oxyrhynchus; Grenfell & Hunt, second day of dig' },
  'P2':      { year: null, note: 'No secure excavation record; Biblioteca Medicea Laurenziana, Florence' },
  'P3':      { year: null, note: 'No secure excavation record; Österreichische Nationalbibliothek, Vienna' },
  'P4':      { year: 1889, note: 'Found at Coptos, Egypt, 1889; now Bibliothèque nationale de France' },
  'P5':      { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P6':      { year: null, note: 'No secure excavation record; Strasbourg University Library, acquired c. 1899' },
  'P7':      { year: null, note: 'No secure excavation record; provenance unknown' },
  'P19':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P21':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P22':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P25':     { year: null, note: 'No secure excavation record; Staatliche Museen zu Berlin' },
  'P28':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P35':     { year: null, note: 'No secure excavation record; Biblioteca Medicea Laurenziana, Florence' },
  'P36':     { year: null, note: 'No secure excavation record; Biblioteca Medicea Laurenziana, Florence' },
  'P37':     { year: null, note: 'No secure excavation record; University of Michigan, acquired c. 1920s' },
  'P39':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P42':     { year: null, note: 'No secure excavation record; Österreichische Nationalbibliothek, Vienna' },
  'P44':     { year: null, note: 'No secure excavation record; Metropolitan Museum of Art, New York' },
  'P45':     { year: 1930, note: 'Found c. 1928–30, probably Upper Egypt; Chester Beatty Library, announced 1931' },
  'P52':     { year: 1920, note: 'Acquired 1920, John Rylands Library, Manchester; provenance unknown' },
  'P53':     { year: null, note: 'No secure excavation record; University of Michigan' },
  'P55':     { year: null, note: 'No secure excavation record; Biblioteca Medicea Laurenziana, Florence' },
  'P59':     { year: 1936, note: 'Nessana, Palestine; Colt Archaeological Expedition 1936–37' },
  'P60':     { year: 1936, note: 'Nessana, Palestine; Colt Archaeological Expedition 1936–37' },
  'P63':     { year: null, note: 'No secure excavation record; Berlin collection' },
  'P64+P67': { year: 1901, note: 'P64 purchased Luxor 1901 (Magdalen College, Oxford); P67 acquired separately, Barcelona' },
  'P66':     { year: 1952, note: 'Dishna, Upper Egypt, c. 1952; Bodmer Papyri (Bibliotheca Bodmeriana, Geneva)' },
  'P69':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P70':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P71':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P73':     { year: 1952, note: 'Dishna, Upper Egypt, c. 1952; Bodmer Papyri (Bibliotheca Bodmeriana, Geneva)' },
  'P75':     { year: 1952, note: 'Dishna, Upper Egypt, c. 1952; Bodmer Papyri; now Vatican Apostolic Library' },
  'P76':     { year: null, note: 'No secure excavation record; Österreichische Nationalbibliothek, Vienna' },
  'P77':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P80':     { year: null, note: 'No secure excavation record; Fundació Sant Lluc Evangelista, Barcelona' },
  'P82':     { year: null, note: 'No secure excavation record; Strasbourg University Library' },
  'P83':     { year: 1952, note: 'Khirbet Mird, Palestine; excavated 1952–53' },
  'P84':     { year: 1952, note: 'Khirbet Mird, Palestine; excavated 1952–53' },
  'P86':     { year: null, note: 'No secure excavation record; Österreichische Nationalbibliothek, Vienna' },
  'P88':     { year: null, note: 'No secure excavation record; Biblioteca Ambrosiana, Milan' },
  'P90':     { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P93':     { year: null, note: 'No secure excavation record; provenance unknown' },
  'P95':     { year: null, note: 'No secure excavation record; Biblioteca Medicea Laurenziana, Florence' },
  'P96':     { year: null, note: 'No secure excavation record; provenance unknown' },
  'P97':     { year: null, note: 'No secure excavation record; provenance unknown' },
  'P101':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P102':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P103':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P104':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P105':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P106':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P107':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P108':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P109':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P110':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P111':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P119':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P120':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P121':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P122':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P128':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P134':    { year: null, note: 'No secure excavation record; provenance uncertain' },
  'P137':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P138':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
  'P141':    { year: 1896, note: 'Excavated 1896–1907, Oxyrhynchus (Grenfell & Hunt)' },
};

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
  discoveryYear: number | null;
  discoveryNote: string;
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

  // Primary: earliest year in the date range (manuscript age)
  function dateKey(date: string): number {
    const m = date.match(/\d{3,4}/);
    return m ? parseInt(m[0]) : 9999;
  }
  // Secondary: siglum number (Gregory-Aland registration ≈ discovery order)
  function siglaKey(siglum: string): number {
    const m = siglum.match(/\d+/);
    return m ? parseInt(m[0]) : 9999;
  }

  const papyri: PapyrusInfo[] = raw.papyri
    .sort((a, b) => dateKey(a.date) - dateKey(b.date) || siglaKey(a.siglum) - siglaKey(b.siglum))
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

      const disc = DISCOVERY_DATA[p.siglum] ?? { year: null, note: 'No secure excavation record' };
      return {
        siglum: p.siglum,
        date: p.date,
        verseCount: p.verses.length,
        hasCNTR: hasCNTRText(p.siglum),
        gospels: gospelsSorted,
        verseCountByGospel: countByGospel,
        chaptersCovered,
        firstVerse,
        discoveryYear: disc.year,
        discoveryNote: disc.note,
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
