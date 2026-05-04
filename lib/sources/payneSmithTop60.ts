import fs from 'fs';
import path from 'path';
import type { GlossCell } from '@/lib/types';

// Map from Syriac word string → { gloss_first_sense, gloss_full }
let _map: Map<string, { brief: string; full: string }> | null = null;

function load(): Map<string, { brief: string; full: string }> {
  if (_map) return _map;

  const p = path.join(process.cwd(), 'data/sources/glosses/payne-smith/payne-smith-top60.tsv');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const result = new Map<string, { brief: string; full: string }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('\t');
    const word = cols[0]?.trim();
    const brief = cols[1]?.trim();
    const full = cols[2]?.trim();
    if (word && brief) {
      result.set(word, { brief, full: full ?? brief });
    }
  }

  _map = result;
  return result;
}

export function getPayneSmithGloss(syriacWord: string): GlossCell | null {
  const entry = load().get(syriacWord);
  if (!entry) return null;
  return {
    gloss: entry.brief,
    source: 'PayneSmith',
    tooltip: entry.full,
  };
}
