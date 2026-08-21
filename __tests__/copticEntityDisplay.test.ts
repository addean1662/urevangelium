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

  it('identifies both Joram name groups in Matthew 1:8', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/8.json'), 'utf8'));
    const joram = data.rows
      .filter((row: any) => [8, 9].includes(row.coptic?.provenance?.sourceToken))
      .map((row: any) => ({ text: row.coptic.text, gloss: row.coptic.gloss?.gloss }));

    expect(joram).toEqual([
      { text: 'ⲛⲓⲱⲣⲁⲙ', gloss: 'Joram;' },
      { text: 'ⲓⲱⲣⲁⲙ', gloss: 'Joram' },
    ]);
  });

  it('identifies the missing Ahaz group in Matthew 1:9', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/9.json'), 'utf8'));
    const ahaz = data.rows.find((row: any) => row.coptic?.provenance?.sourceToken === 8)?.coptic;

    expect(ahaz).toMatchObject({ text: 'ⲛⲁⲭⲁⲍ', gloss: { gloss: 'Ahaz', source: 'Scriptorium' } });
  });

  it.each([
    [11, 8],
    [12, 4],
  ])('identifies Babylon in Matthew 1:%i', (verse, sourceToken) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, `data/matthew/1/${verse}.json`), 'utf8'));
    const babylon = data.rows.find((row: any) => row.coptic?.provenance?.sourceToken === sourceToken)?.coptic;

    expect(babylon).toMatchObject({ text: 'ⲛⲧⲃⲁⲃⲩⲗⲱⲛ', gloss: { gloss: 'Babylon', source: 'Scriptorium' } });
  });

  it('identifies both Abiud groups and Azor in Matthew 1:13', () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/13.json'), 'utf8'));
    const names = [4, 5, 12].map((sourceToken) => {
      const cell = data.rows.find((row: any) => row.coptic?.provenance?.sourceToken === sourceToken)?.coptic;
      return { text: cell?.text, gloss: cell?.gloss?.gloss };
    });

    expect(names).toEqual([
      { text: 'ⲛⲁⲃⲓⲟⲩⲇ', gloss: 'Abiud;' },
      { text: 'ⲁⲃⲓⲟⲩⲇ', gloss: 'Abiud' },
      { text: 'ⲛⲁⲍⲱⲣⲁ', gloss: 'Azor;' },
    ]);
  });

  it.each([
    [14, [[1, 'Azor'], [4, 'Zadok;'], [5, 'Zadok'], [8, 'Achim;'], [9, 'Achim'], [12, 'Eliud;']]],
    [15, [[1, 'Eliud'], [4, 'Eleazar;'], [5, 'Eleazar'], [8, 'Matthan;'], [9, 'Matthan']]],
  ] as const)('restores every omitted genealogy name in Matthew 1:%i', (verse, expected) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, `data/matthew/1/${verse}.json`), 'utf8'));
    const actual = expected.map(([sourceToken]) => {
      const cell = data.rows.find((row: any) => row.coptic?.provenance?.sourceToken === sourceToken)?.coptic;
      return [sourceToken, cell?.gloss?.gloss];
    });

    expect(actual).toEqual(expected);
  });
});
