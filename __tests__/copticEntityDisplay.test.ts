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

  it('identifies both Hezron name groups in Matthew 1:3', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/3.json'), 'utf8'));
    const hezron = data.rows
      .filter((row: any) => [11, 12].includes(row.coptic?.provenance?.sourceToken))
      .map((row: any) => ({ text: row.coptic.text, gloss: row.coptic.gloss?.gloss }));

    expect(hezron).toEqual([
      { text: 'ⲛⲉⲥⲣⲱⲙ', gloss: 'Hezron;' },
      { text: 'ⲉⲥⲣⲱⲙ', gloss: 'Hezron' },
    ]);
  });

  it('identifies Rahab in Matthew 1:5', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/5.json'), 'utf8'));
    const rahab = data.rows.find((row: any) => row.coptic?.provenance?.sourceToken === 6)?.coptic;

    expect(rahab).toMatchObject({ text: 'ϩⲛϩⲣⲁⲭⲁⲃ', gloss: { gloss: 'Rahab;', source: 'Scriptorium' } });
  });

  it('preserves the complete wife-of-Uriah ending in Matthew 1:6', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/6.json'), 'utf8'));
    const ending = ['r15', 'r16', 'r18'].map((rowId) => {
      const row = data.rows.find((candidate: any) => candidate.id === rowId);
      return { text: row?.coptic?.text, gloss: row?.coptic?.gloss?.gloss };
    });

    expect(ending).toEqual([
      { text: 'ⲉⲃⲟⲗ', gloss: 'out of' },
      { text: 'ϩⲛⲑⲓⲙⲉ', gloss: 'the wife' },
      { text: 'ⲛⲟⲩⲣⲓⲁⲥ', gloss: 'of Uriah.' },
    ]);
  });
});
