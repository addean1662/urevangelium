import fs from 'node:fs';
import path from 'node:path';
import { parseMesLine } from './cntrMes.js';

let cached;
export function loadPapyrusSourceIndex() {
  if (cached) return cached;
  const dir = path.join(process.cwd(), 'data/sources/earliest-papyrus');
  const coverage = JSON.parse(fs.readFileSync(path.join(dir, 'coverage-index.json'), 'utf8'));
  const dates = new Map(coverage.papyri.map(p => [p.siglum, p.date]));
  const words = new Map();
  const books = { 40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john' };
  for (const p of coverage.papyri) {
    const name = `${p.siglum.split('+')[0]}.txt`;
    for (const line of fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/)) {
      if (!/^\d{8} /.test(line) || line.includes('[stub')) continue;
      const parsed = parseMesLine(line), r = parsed.reference;
      if (books[r.book]) words.set(`${books[r.book]} ${r.chapter}:${r.verse} ${p.siglum}`, parsed.baseWords.filter(w => w.presence !== 'absent'));
    }
  }
  cached = { dates, words };
  return cached;
}
