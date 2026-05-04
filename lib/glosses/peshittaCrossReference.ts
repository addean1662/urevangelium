import fs from 'fs';
import path from 'path';
import type { GlossCell } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type VerseMap = Map<string, string>; // `${gospel}:${chapter}:${verse}` → English text

let _etheridge: VerseMap | null = null;
let _murdock: VerseMap | null = null;

function verseKey(gospel: string, chapter: number, verse: number): string {
  return `${gospel}:${chapter}:${verse}`;
}

// ── Text utilities ────────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/\s{2,}/g, ' ')
    // Strip OCR footnote symbol characters that precede verse text
    .replace(/^[°ê*è><^†‡§¶?!~]+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitParagraphs(lines: string[]): string[] {
  const result: string[] = [];
  const buf: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (buf.length > 0) {
        result.push(buf.join(' '));
        buf.length = 0;
      }
    } else {
      buf.push(line.trim());
    }
  }
  if (buf.length > 0) result.push(buf.join(' '));
  return result;
}

// ── Etheridge parser ──────────────────────────────────────────────────────────
// Format: each chapter starts with "N:1 text"; subsequent verses are
// blank-line-separated paragraphs counted up from 1. Footnotes are
// paragraphs that contain a book-name + chapter:verse reference.

const ETHERIDGE_BOOK_PATTERNS: Array<{ gospel: string; re: RegExp }> = [
  { gospel: 'matthew', re: /The Preaching of Mathai/ },
  { gospel: 'mark',    re: /The Preaching of Markos/ },
  { gospel: 'luke',    re: /The Preaching of Lukos/ },
  { gospel: 'john',    re: /The Preaching of Juchanon/ },
];

function isEtheridgeFootnote(para: string): boolean {
  // "^ Matthew 2:1 - Magushee" or "> Mark 3:5 -"
  return /(?:Matthew|Mark|Luke|John|Mathai|Markos|Lukos|Juchanon)\s+\d+:\d+\s*[-—]/i.test(para);
}

function parseEtheridge(text: string): VerseMap {
  const map: VerseMap = new Map();
  const lines = text.split('\n');

  // Find where each gospel begins in the file
  const bookStarts: Array<{ gospel: string; lineIdx: number }> = [];
  for (const { gospel, re } of ETHERIDGE_BOOK_PATTERNS) {
    const idx = lines.findIndex(l => re.test(l));
    if (idx >= 0) bookStarts.push({ gospel, lineIdx: idx });
  }
  bookStarts.sort((a, b) => a.lineIdx - b.lineIdx);

  for (let bi = 0; bi < bookStarts.length; bi++) {
    const { gospel, lineIdx: bookStart } = bookStarts[bi];
    const bookEnd = bi < bookStarts.length - 1 ? bookStarts[bi + 1].lineIdx : lines.length;
    const bookLines = lines.slice(bookStart, bookEnd);

    // Find chapter starts: lines matching /^\d+:\d+\s/ where the verse number is 1
    const chapterStarts: Array<{ chapter: number; localIdx: number }> = [];
    for (let i = 0; i < bookLines.length; i++) {
      const m = bookLines[i].match(/^(\d+):(\d+)\s/);
      if (m && m[2] === '1') {
        chapterStarts.push({ chapter: parseInt(m[1]), localIdx: i });
      }
    }

    for (let ci = 0; ci < chapterStarts.length; ci++) {
      const { chapter, localIdx: chStart } = chapterStarts[ci];
      const chEnd = ci < chapterStarts.length - 1 ? chapterStarts[ci + 1].localIdx : bookLines.length;
      const chLines = bookLines.slice(chStart, chEnd);

      // Parse into paragraphs, filter footnotes
      const paragraphs = splitParagraphs(chLines).filter(p => !isEtheridgeFootnote(p));

      for (let vi = 0; vi < paragraphs.length; vi++) {
        const verse = vi + 1;
        // Strip leading chapter:verse prefix ("3:1 ") or bare verse number ("3 ", "? ")
        const stripped = paragraphs[vi]
          .replace(/^\d+:\d+\s+/, '')
          .replace(/^\d+\s+/, '');
        const cleaned = cleanText(stripped);
        if (cleaned.length > 5) {
          map.set(verseKey(gospel, chapter, verse), cleaned);
        }
      }
    }
  }

  return map;
}

// ── Murdock parser ────────────────────────────────────────────────────────────
// Format: each chapter has a page header "BOOK, ROMAN_NUM." then verse 1 as
// "ROMAN_NUM. text". Subsequent verses use inline (N) markers.

const MURDOCK_BOOK_PATTERNS: Array<{ gospel: string; re: RegExp }> = [
  { gospel: 'matthew', re: /Announcement of Matthew/ },
  { gospel: 'mark',    re: /Announcement of Mark/ },
  { gospel: 'luke',    re: /Announcement of Luke/ },
  { gospel: 'john',    re: /Proclamation of John/ },
];

const ROMAN: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100,
};

function romanToInt(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const curr = ROMAN[s[i]] ?? 0;
    const next = ROMAN[s[i + 1]] ?? 0;
    n += curr < next ? -curr : curr;
  }
  return n;
}

function parseMurdock(text: string): VerseMap {
  const map: VerseMap = new Map();
  const lines = text.split('\n');

  // Find where each gospel begins
  const bookStarts: Array<{ gospel: string; lineIdx: number }> = [];
  for (const { gospel, re } of MURDOCK_BOOK_PATTERNS) {
    const idx = lines.findIndex(l => re.test(l));
    if (idx >= 0) bookStarts.push({ gospel, lineIdx: idx });
  }
  bookStarts.sort((a, b) => a.lineIdx - b.lineIdx);

  for (let bi = 0; bi < bookStarts.length; bi++) {
    const { gospel, lineIdx: bookStart } = bookStarts[bi];
    const bookEnd = bi < bookStarts.length - 1 ? bookStarts[bi + 1].lineIdx : lines.length;
    const bookLines = lines.slice(bookStart, bookEnd);

    // Find verse-1 line for each chapter:
    // Pattern: line matching /^([IVX]+)\.\s+\S/ where the Roman numeral makes sense
    // These are the actual verse-1 content lines (not the standalone page headers)
    const chapterVerse1s: Array<{ chapter: number; localIdx: number }> = [];
    for (let i = 0; i < bookLines.length; i++) {
      const m = bookLines[i].match(/^([IVX]+)\.\s+(\S)/);
      if (m) {
        const ch = romanToInt(m[1]);
        if (ch > 0 && ch <= 30) {
          chapterVerse1s.push({ chapter: ch, localIdx: i });
        }
      }
    }

    // De-duplicate: keep only the first occurrence of each chapter number
    // (second column duplicates have the chapter content already started)
    const seenChapters = new Set<number>();
    const uniqueVerse1s = chapterVerse1s.filter(({ chapter }) => {
      if (seenChapters.has(chapter)) return false;
      seenChapters.add(chapter);
      return true;
    });

    for (let ci = 0; ci < uniqueVerse1s.length; ci++) {
      const { chapter, localIdx: chStart } = uniqueVerse1s[ci];
      const chEnd = ci < uniqueVerse1s.length - 1 ? uniqueVerse1s[ci + 1].localIdx : bookLines.length;
      const chText = bookLines.slice(chStart, chEnd).join(' ');

      // Collect inline (N) markers as verse boundaries
      const segments = new Map<number, string>();
      let prevVerse = 1;
      let prevEnd = 0;

      const re = /\((\d+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(chText)) !== null) {
        const vNum = parseInt(m[1]);
        // Guard: must be greater than previous to avoid footnote cross-references
        if (vNum <= prevVerse || vNum > prevVerse + 10) continue;
        segments.set(prevVerse, cleanText(chText.slice(prevEnd, m.index)));
        prevVerse = vNum;
        prevEnd = m.index + m[0].length;
      }
      segments.set(prevVerse, cleanText(chText.slice(prevEnd)));

      // Strip the leading Roman numeral from verse 1
      const v1 = segments.get(1);
      if (v1) {
        segments.set(1, v1.replace(/^[IVX]+\.\s+/, ''));
      }

      for (const [verse, segText] of segments) {
        if (segText.length > 5) {
          const k = verseKey(gospel, chapter, verse);
          if (!map.has(k)) map.set(k, segText);
        }
      }
    }
  }

  return map;
}

// ── Lazy loaders ──────────────────────────────────────────────────────────────

function loadEtheridge(): VerseMap {
  if (_etheridge) return _etheridge;
  const p = path.join(process.cwd(), 'data/sources/peshitta/etheridge.txt');
  _etheridge = parseEtheridge(fs.readFileSync(p, 'utf8'));
  return _etheridge;
}

function loadMurdock(): VerseMap {
  if (_murdock) return _murdock;
  const p = path.join(process.cwd(), 'data/sources/peshitta/murdock.txt');
  _murdock = parseMurdock(fs.readFileSync(p, 'utf8'));
  return _murdock;
}

// ── Word extraction ───────────────────────────────────────────────────────────
// Returns the proportionally aligned English word from the verse text.
// wordIdx: 0-based position of the Syriac word in the verse
// syriacCount: total Syriac words in the verse

function extractWord(verseText: string, wordIdx: number, syriacCount: number): string {
  const words = verseText
    .split(/\s+/)
    .map(w => w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''))
    .filter(w => w.length > 0);
  if (words.length === 0) return '';
  const idx = Math.min(
    Math.floor(wordIdx * words.length / Math.max(syriacCount, 1)),
    words.length - 1,
  );
  return words[idx];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getPeshittaGloss(
  gospel: string,
  chapter: number,
  verse: number,
  wordIdx: number,
  syriacCount: number,
): GlossCell | null {
  const key = verseKey(gospel, chapter, verse);

  const ethMap = loadEtheridge();
  const ethText = ethMap.get(key);
  if (ethText) {
    const gloss = extractWord(ethText, wordIdx, syriacCount);
    if (gloss) {
      return {
        gloss,
        source: 'Etheridge',
        tooltip: `[Etheridge] ${ethText}`,
      };
    }
  }

  const mrdMap = loadMurdock();
  const mrdText = mrdMap.get(key);
  if (mrdText) {
    const gloss = extractWord(mrdText, wordIdx, syriacCount);
    if (gloss) {
      return {
        gloss,
        source: 'Murdock',
        tooltip: `[Murdock] ${mrdText}`,
      };
    }
  }

  return null;
}
