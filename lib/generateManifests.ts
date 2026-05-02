/**
 * Generates skeleton manifest entries for all verses in all four Gospels.
 * Run with: npx ts-node lib/generateManifests.ts
 * Output: data/manifests/{gospel}.json
 *
 * Entries have populated: false until real aligned data exists.
 * Matthew 1:1, Mark 1:1, Luke 1:1, John 1:1 are marked populated: true.
 */

import { VERSE_COUNTS } from './verseCounts';
import type { Gospel, GospelManifest } from './types';
import fs from 'fs';
import path from 'path';

const PROOF_VERSES: Record<Gospel, Array<[number, number]>> = {
  matthew: [[1, 1]],
  mark: [[1, 1]],
  luke: [[1, 1]],
  john: [[1, 1]],
};

function isProof(gospel: Gospel, chapter: number, verse: number): boolean {
  return PROOF_VERSES[gospel].some(([c, v]) => c === chapter && v === verse);
}

const gospels: Gospel[] = ['matthew', 'mark', 'luke', 'john'];

for (const gospel of gospels) {
  const counts = VERSE_COUNTS[gospel];
  const manifest: GospelManifest = {
    gospel,
    verses: counts.flatMap((verseCount, i) => {
      const chapter = i + 1;
      return Array.from({ length: verseCount }, (_, j) => {
        const verse = j + 1;
        return { chapter, verse, populated: isProof(gospel, chapter, verse) };
      });
    }),
  };

  const outPath = path.join(
    process.cwd(),
    'data',
    'manifests',
    `${gospel}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${outPath}`);
}
