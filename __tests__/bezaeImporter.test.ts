import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const importer = require('../scripts/generate-bezae.js');

describe('Bezae import preservation', () => {
  it('retains the seven Greek source occurrences in Mark 1:1, including both nomina sacra', () => {
    const words = importer.parseXML(path.resolve('data/sources/bezae/Bezae-Greek.xml')).get('B02K1V1');
    const verse = JSON.parse(fs.readFileSync('data/mark/1/1.json', 'utf8'));
    const assignment = importer.alignGreekToRows(words, verse.rows);

    expect(words.map((word: { text: string }) => word.text)).toEqual(['αρχη', 'του', 'ευαγγελιου', 'ιηυ', 'χρυ', 'υιου', 'θυ']);
    expect(assignment.size).toBe(7);
    expect(verse.rows.flatMap((row: { bezae?: { greek?: string } }) => row.bezae?.greek ? [row.bezae.greek] : [])).toEqual(words.map((word: { text: string }) => word.text));
    expect(verse.rows[assignment.get(3)].id).toBe('r4');
    expect(verse.rows[assignment.get(4)].id).toBe('r5');
    expect(() => importer.assertCompleteAssignments('B02K1V1', 'Greek', words, assignment)).not.toThrow();
  });

  it('rejects a Greek addition without a comparison row instead of discarding it', () => {
    const words = [{ text: 'αρχη' }, { text: 'μονον' }];
    const rows = [{ vaticanus: { type: 'text', text: 'αρχη' } }];
    const assignment = importer.alignGreekToRows(words, rows);
    expect(() => importer.assertCompleteAssignments('example', 'Greek', words, assignment)).toThrow(/μονον/);
  });

  it('places the Latin Jesus and Christ abbreviations with their counterparts, leaving the Greek article unpaired', () => {
    const words = importer.parseXML(path.resolve('data/sources/bezae/Bezae-Latin.xml')).get('B02K1V1');
    const verse = JSON.parse(fs.readFileSync('data/mark/1/1.json', 'utf8'));
    const assignment = importer.alignLatinToRows(words, verse.rows);
    expect(words.map((_: unknown, index: number) => verse.rows[assignment.get(index)].id)).toEqual(['r1', 'r3', 'r4', 'r5', 'r6', 'r7']);
    expect(() => importer.assertCompleteAssignments('B02K1V1', 'Latin', words, assignment)).not.toThrow();
  });

  it('rejects Latin overflow instead of silently dropping an unassigned occurrence', () => {
    const words = [{ text: 'initium' }, { text: 'euangeli' }];
    const rows = [{ vaticanus: { type: 'text', text: 'αρχη' }, vulgate: { type: 'text', text: 'Initium' } }];
    const assignment = importer.alignLatinToRows(words, rows);
    expect(() => importer.assertCompleteAssignments('example', 'Latin', words, assignment)).toThrow(/euangeli/);
  });

  it('writes no earlier verse when a later verse in the batch would lose source text', () => {
    const writes: string[] = [];
    const xml = '<ab n="B02K1V1"><w n="2">αρχη</w></ab><ab n="B02K1V2"><w n="2">λογος</w></ab>';
    const fakeFs = {
      readFileSync: (file: string) => file.endsWith('Bezae-Greek.xml') ? xml
        : file.endsWith('Bezae-Latin.xml') ? ''
          : JSON.stringify({ rows: [{ id: 'r1', vaticanus: { type: 'text', text: 'αρχη' }, bezae: { type: 'empty' } }] }),
      existsSync: () => true,
      writeFileSync: (file: string) => writes.push(file),
    };
    const code = fs.readFileSync('scripts/generate-bezae.js', 'utf8');
    expect(() => vm.runInNewContext(`${code}\nmain();`, {
      require: (name: string) => name === 'fs' ? fakeFs : require(name),
      module: { exports: {} },
      __dirname: path.resolve('scripts'),
      process: { argv: ['node', 'generate-bezae.js', 'mark'] },
      console: { log: () => undefined },
    })).toThrow(/refusing lossy Bezae Greek import/);
    expect(writes).toEqual([]);
  });
});
