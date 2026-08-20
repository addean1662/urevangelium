import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

describe('Coptic entity display boundaries', () => {
  it('does not identify the Judas/Judah name token as Judas Iscariot', () => {
    for (const verse of [2, 3]) {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1', `${verse}.json`), 'utf8'));
      const offending = data.rows.filter((row: any) => row.coptic?.gloss?.gloss === 'Judas Iscariot');
      expect(offending, `Matthew 1:${verse}`).toHaveLength(0);
    }
  });

  it('keeps Judas and Iscariot in their respective Coptic word cells', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/26/14.json'), 'utf8'));
    const glosses = data.rows.map((row: any) => row.coptic?.gloss?.gloss).filter(Boolean);
    expect(glosses).toContain('Judas');
    expect(glosses.some((gloss: string) => /^Isk?ariot\b/i.test(gloss))).toBe(true);
    expect(glosses).not.toContain('Judas Iscariot');
  });
});
