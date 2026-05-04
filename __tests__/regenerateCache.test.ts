/**
 * One-shot cache regeneration — run with: npx vitest run __tests__/regenerateCache.test.ts
 * Regenerates disk cache for computed verses using the current alignment pipeline.
 * Not part of the normal CI test suite; run manually after pipeline changes.
 */
import { describe, it, expect } from 'vitest';
import { computeAlignment } from '@/lib/alignment/computeAlignment';
import fs from 'fs';
import path from 'path';

const VERSES = [
  { gospel: 'mark'    as const, chapter: 3,  verse: 1  },
  { gospel: 'matthew' as const, chapter: 2,  verse: 1  },
  { gospel: 'matthew' as const, chapter: 3,  verse: 1  },
  { gospel: 'john'    as const, chapter: 1,  verse: 2  },
  { gospel: 'john'    as const, chapter: 1,  verse: 3  },
  { gospel: 'john'    as const, chapter: 1,  verse: 4  },
  { gospel: 'john'    as const, chapter: 1,  verse: 5  },
  { gospel: 'john'    as const, chapter: 1,  verse: 6  },
  { gospel: 'john'    as const, chapter: 1,  verse: 7  },
  { gospel: 'john'    as const, chapter: 1,  verse: 8  },
  { gospel: 'john'    as const, chapter: 10, verse: 1  },
  { gospel: 'john'    as const, chapter: 10, verse: 13 },
] as const;

describe('regenerate computed verse cache', () => {
  for (const { gospel, chapter, verse } of VERSES) {
    it(`${gospel} ${chapter}:${verse}`, async () => {
      const data = await computeAlignment(gospel, chapter, verse);
      expect(data).not.toBeNull();

      const dir = path.join(process.cwd(), 'data', 'cache', gospel, String(chapter));
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `${verse}.json`);
      fs.writeFileSync(out, JSON.stringify(data, null, 2));

      // Verify Peshitta rows have gloss data (not 100% required — some may be empty)
      const peshittaTextRows = data!.rows.filter(r => r.peshitta.type === 'text');
      const withGloss = peshittaTextRows.filter(r => r.peshitta.type === 'text' && (r.peshitta as { gloss?: unknown }).gloss);
      console.log(`  ${gospel} ${chapter}:${verse}: ${withGloss.length}/${peshittaTextRows.length} Peshitta rows have gloss`);
    }, 30000);
  }
});
