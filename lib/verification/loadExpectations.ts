import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Gospel, VerseData } from '@/lib/types';
import type { VerseExpectations } from './verifyVerse';
import manifest from '@/data/verse-verification/manifest.json';

const indexes = new Map<Gospel, Record<string, VerseExpectations>>();
export function loadVerseExpectations(data: VerseData): VerseExpectations | undefined {
  let verses = indexes.get(data.gospel);
  if (!verses) {
    try {
      const relative = `data/verse-verification/${data.gospel}.json` as keyof typeof manifest.outputHashes;
      const raw = fs.readFileSync(path.join(process.cwd(), relative), 'utf8').replaceAll('\r\n', '\n');
      if (createHash('sha256').update(raw).digest('hex') !== manifest.outputHashes[relative]) return undefined;
      const index = JSON.parse(raw);
      if (index.schema !== 1) return undefined;
      verses = index.verses;
      if (!verses) return undefined;
      indexes.set(data.gospel, verses);
    } catch { return undefined; }
  }
  return verses[`${data.chapter}:${data.verse}`];
}
