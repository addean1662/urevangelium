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
  { id: 'P106',    file: 'P106.txt', date: 'c. 200–250 CE' },
  { id: 'P119',    file: 'P119.txt', date: 'c. 250–350 CE' },
  { id: 'P120',    file: 'P120.txt', date: 'c. 250–350 CE' },
  { id: 'P6', file: 'P6.txt', date: 'c. 4th c. CE' },
  { id: 'P19', file: 'P19.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P21', file: 'P21.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P25', file: 'P25.txt', date: 'c. 4th c. CE' },
  { id: 'P35', file: 'P35.txt', date: 'c. 4th c. CE' },
  { id: 'P69', file: 'P69.txt', date: 'c. 3rd c. CE' },
  { id: 'P71', file: 'P71.txt', date: 'c. 4th c. CE' },
  { id: 'P82', file: 'P82.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P86', file: 'P86.txt', date: 'c. 4th c. CE' },
  { id: 'P101', file: 'P101.txt', date: 'c. 3rd c. CE' },
  { id: 'P102', file: 'P102.txt', date: 'c. 3rd–4th c. CE' },
  { id: 'P107', file: 'P107.txt', date: 'c. 3rd c. CE' },
  { id: 'P108', file: 'P108.txt', date: 'c. 3rd c. CE' },
  { id: 'P109', file: 'P109.txt', date: 'c. 3rd c. CE' },
  { id: 'P110', file: 'P110.txt', date: 'c. 4th c. CE' },
  { id: 'P111', file: 'P111.txt', date: 'c. 3rd c. CE' },
  { id: 'P121', file: 'P121.txt', date: 'c. 3rd c. CE' },
  { id: 'P122', file: 'P122.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P134', file: 'P134.txt', date: 'c. 2nd–3rd c. CE' },
  { id: 'P137', file: 'P137.txt', date: 'c. 3rd c. CE' },
  { id: 'P138', file: 'P138.txt', date: 'c. 3rd–4th c. CE' },
  { id: 'P141', file: 'P141.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P73', file: 'P73.txt', date: 'c. 7th c. CE' },
  { id: 'P83', file: 'P83.txt', date: 'c. 3rd–4th c. CE' },
  { id: 'P96', file: 'P96.txt', date: 'c. 3rd–4th c. CE' },
  { id: 'P103', file: 'P103.txt', date: 'c. 2nd–3rd c. CE' },
  { id: 'P105', file: 'P105.txt', date: 'c. 4th c. CE' },
  { id: 'P44', file: 'P44.txt', date: 'c. 5th–6th c. CE' },
  { id: 'P84', file: 'P84.txt', date: 'c. 5th–6th c. CE' },
  { id: 'P3', file: 'P3.txt', date: 'c. 6th c. CE' },
  { id: 'P7', file: 'P7.txt', date: 'c. 4th c. CE' },
  { id: 'P42', file: 'P42.txt', date: 'c. 7th c. CE' },
  { id: 'P97', file: 'P97.txt', date: 'c. 5th–6th c. CE' },
  { id: 'P2', file: 'P2.txt', date: 'c. 6th c. CE' },
  { id: 'P36', file: 'P36.txt', date: 'c. 3rd–4th c. CE' },
  { id: 'P55', file: 'P55.txt', date: 'c. 6th–7th c. CE' },
  { id: 'P59', file: 'P59.txt', date: 'c. 7th c. CE' },
  { id: 'P60', file: 'P60.txt', date: 'c. 7th c. CE' },
  { id: 'P63', file: 'P63.txt', date: 'c. 4th–5th c. CE' },
  { id: 'P76', file: 'P76.txt', date: 'c. 6th c. CE' },
  { id: 'P80', file: 'P80.txt', date: 'c. 3rd c. CE' },
  { id: 'P93', file: 'P93.txt', date: 'c. 3rd c. CE' },
  { id: 'P128', file: 'P128.txt', date: 'c. 3rd–4th c. CE' },

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
