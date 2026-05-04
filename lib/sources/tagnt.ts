import fs from 'fs';
import path from 'path';
import type { Gospel } from '@/lib/types';

export interface TagntWord {
  wordNum: number;
  greek: string;      // main accented form (NA28 spelling)
  gloss: string;      // English gloss
  strong: string;     // e.g. "G0976" or "G2424G"
  grammar: string;    // e.g. "N-NSF"
  editions: string[]; // e.g. ["NA28", "NA27", "Byz"]
  inAncient: boolean; // type has N or n
  inTraditional: boolean; // type has K or k
  // witness-specific spellings when they differ from main Greek
  spellingWH?: string;    // Westcott-Hort (Sinaiticus proxy)
  spellingByz?: string;   // Byzantine/TR
}

const BOOK_CODE: Record<Gospel, string> = {
  matthew: 'Mat',
  mark: 'Mrk',
  luke: 'Luk',
  john: 'Jhn',
};

// Known edition codes to recognise in the editions field
const EDITION_CODES = new Set(['NA28', 'NA27', 'Tyn', 'SBL', 'WH', 'Treg', 'TR', 'Byz']);

let verseCache: Map<string, TagntWord[]> | null = null;

function parseSpellingVariants(col: string): { wh?: string; byz?: string } {
  if (!col.trim()) return {};
  const result: { wh?: string; byz?: string } = {};
  // Format: "Tyn+WH: Δαυεὶδ ; +TR: Δαβὶδ ;"
  const parts = col.split(';').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx < 0) continue;
    const edStr = part.slice(0, colonIdx).replace(/^\+/, '').trim();
    const form = part.slice(colonIdx + 1).trim();
    if (!form) continue;
    for (const ed of edStr.split('+')) {
      const code = ed.trim();
      if (code === 'WH') result.wh = form;
      if (code === 'TR' || code === 'Byz') result.byz ??= form;
    }
  }
  return result;
}

function loadTagnt(): Map<string, TagntWord[]> {
  if (verseCache) return verseCache;

  const filePath = path.join(
    process.cwd(),
    'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt'
  );
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const map = new Map<string, TagntWord[]>();

  for (const line of lines) {
    const cols = line.split('\t');
    const ref = cols[0]?.trim() ?? '';
    if (!ref || ref.startsWith('#') || ref.startsWith('Word') || ref.startsWith('=')) continue;

    const hashIdx = ref.indexOf('#');
    if (hashIdx < 0) continue;
    const verseKey = ref.slice(0, hashIdx); // "Mat.1.1"
    const afterHash = ref.slice(hashIdx + 1); // "01=NKO"
    const eqIdx = afterHash.indexOf('=');
    const wordNumStr = eqIdx >= 0 ? afterHash.slice(0, eqIdx) : afterHash;
    const typeStr = eqIdx >= 0 ? afterHash.slice(eqIdx + 1) : 'NKO';
    const wordNum = parseInt(wordNumStr, 10);
    if (isNaN(wordNum)) continue;

    // Greek: "Βίβλος (Biblos)" → "Βίβλος"
    const greekRaw = cols[1]?.trim() ?? '';
    const parenIdx = greekRaw.indexOf(' (');
    const greek = parenIdx >= 0 ? greekRaw.slice(0, parenIdx) : greekRaw;
    if (!greek) continue;

    // English: "[The] book" → strip brackets
    const gloss = (cols[2]?.trim() ?? '').replace(/\[|\]/g, '').replace(/\s+/g, ' ').trim();

    // dStrong+Grammar: "G0976=N-NSF"
    const strongGram = cols[3]?.trim() ?? '';
    const sgEq = strongGram.indexOf('=');
    const strong = sgEq >= 0 ? strongGram.slice(0, sgEq) : strongGram;
    const grammar = sgEq >= 0 ? strongGram.slice(sgEq + 1) : '';

    // Editions: "NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz" (may also have "moved" tokens)
    const editionsStr = cols[5]?.trim() ?? '';
    const editions = editionsStr.split('+').map(e => e.trim()).filter(e => EDITION_CODES.has(e));

    // Spelling variants: col 7 — "Tyn+WH: Δαυεὶδ ; +TR: Δαβὶδ ;"
    const spellings = parseSpellingVariants(cols[7]?.trim() ?? '');

    const inAncient = /[Nn]/.test(typeStr);
    const inTraditional = /[Kk]/.test(typeStr);

    const word: TagntWord = {
      wordNum,
      greek,
      gloss,
      strong,
      grammar,
      editions,
      inAncient,
      inTraditional,
      ...(spellings.wh ? { spellingWH: spellings.wh } : {}),
      ...(spellings.byz ? { spellingByz: spellings.byz } : {}),
    };

    if (!map.has(verseKey)) map.set(verseKey, []);
    map.get(verseKey)!.push(word);
  }

  verseCache = map;
  return map;
}

export function getTagntVerse(gospel: Gospel, chapter: number, verse: number): TagntWord[] {
  const map = loadTagnt();
  const key = `${BOOK_CODE[gospel]}.${chapter}.${verse}`;
  return map.get(key) ?? [];
}
