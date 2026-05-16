import fs from 'fs';
import path from 'path';
import type { Gospel, PapyrusFragment, PapyrusSiglum } from '@/lib/types';

export const PAPYRI: Array<{ id: PapyrusSiglum; file: string; date: string }> = [
  { id: 'P1',      file: 'P1.txt',   date: 'c. 250 CE' },
  { id: 'P4',      file: 'P4.txt',   date: 'c. 150–200 CE' },
  { id: 'P5',      file: 'P5.txt',   date: 'c. 250–300 CE' },
  { id: 'P22',     file: 'P22.txt',  date: 'c. 250–300 CE' },
  { id: 'P28',     file: 'P28.txt',  date: 'c. 250–300 CE' },
  { id: 'P37',     file: 'P37.txt',  date: 'c. 250–300 CE' },
  { id: 'P39',     file: 'P39.txt',  date: 'c. 200–250 CE' },
  { id: 'P45',     file: 'P45.txt',  date: 'c. 200–250 CE' },
  { id: 'P52',     file: 'P52.txt',  date: 'c. 125–175 CE' },
  { id: 'P53',     file: 'P53.txt',  date: 'c. 250 CE' },
  { id: 'P64+P67', file: 'P64.txt',  date: 'c. 200 CE' },
  { id: 'P66',     file: 'P66.txt',  date: 'c. 175–225 CE' },
  { id: 'P70',     file: 'P70.txt',  date: 'c. 175–225 CE' },
  { id: 'P75',     file: 'P75.txt',  date: 'c. 175–225 CE' },
  { id: 'P77',     file: 'P77.txt',  date: 'c. 150–250 CE' },
  { id: 'P88',     file: 'P88.txt',  date: 'c. 4th c. CE' },
  { id: 'P90',     file: 'P90.txt',  date: 'c. 150–200 CE' },
  { id: 'P95',     file: 'P95.txt',  date: 'c. 250–300 CE' },
  { id: 'P104',    file: 'P104.txt', date: 'c. 125–150 CE' },
];

const GOSPEL_CODE: Record<Gospel, string> = {
  matthew: '40',
  mark: '41',
  luke: '42',
  john: '43',
};

// verse code as used in CNTR files: "BBCCCVVV"
function verseCode(gospel: Gospel, chapter: number, verse: number): string {
  const bb = GOSPEL_CODE[gospel];
  const ccc = String(chapter).padStart(3, '0');
  const vvv = String(verse).padStart(3, '0');
  return `${bb}${ccc}${vvv}`;
}

// Set of BBCCCVVV codes present in each papyrus file
const coverageCache = new Map<string, Set<string>>();

function loadCoverage(papyrusFile: string): Set<string> {
  const cached = coverageCache.get(papyrusFile);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), `data/sources/earliest-papyrus/${papyrusFile}`);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const covered = new Set<string>();

  for (const line of lines) {
    // Lines start with 8-digit verse code: "40001001 ..."
    const m = line.match(/^(\d{8})\s/);
    if (m) covered.add(m[1]);
  }

  coverageCache.set(papyrusFile, covered);
  return covered;
}

// Returns all papyrus fragments that cover the given verse, or empty array if none.
export function getCoveringPapyri(
  gospel: Gospel,
  chapter: number,
  verse: number,
): PapyrusFragment[] {
  const code = verseCode(gospel, chapter, verse);
  const result: PapyrusFragment[] = [];

  for (const p of PAPYRI) {
    const covered = loadCoverage(p.file);
    if (covered.has(code)) {
      result.push({ id: p.id, date: p.date });
    }
  }

  return result;
}
