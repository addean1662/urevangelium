import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tagntEditionName } from '../lib/sources/tagntEditionName.mjs';

const rows = fs.readFileSync('data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', 'utf8').split(/\r?\n/u).map(l => l.split('\t'));
const asa = rows.find(c => c[0] === 'Mat.1.7#15=NKO')!;

describe('edition-specific proper-name evidence', () => {
  it('uses the published Byz name instead of inheriting the base-reading name under their shared Strong number', () => {
    const before = JSON.stringify(asa);
    expect(tagntEditionName(asa, 'Byz')).toMatchObject({ text: 'Ἀσά', gloss: 'Asa', reference: 'Mat.1.7#15=NKO' });
    expect(tagntEditionName(asa, 'NA28')).toBeNull();
    expect(JSON.stringify(asa)).toBe(before);
    const resolved = rows.filter(c => tagntEditionName(c, 'Byz'));
    expect(resolved.map(c => c[0])).toEqual(['Mat.1.7#15=NKO', 'Mat.1.8#01=NKO']);
  });
  it('rejects ambiguous or unsupported substitutions and preserves ordinary contextual glosses', () => {
    for (const [index, text] of [[7, 'TR: Ἀσά ;'], [7, 'Byz: Ἀσά ; Byz: Ἀσά ;'], [4, 'Ἀσά, Ἀσάφ=Asa'], [4, 'Ἀσάφ=Asaph'], [3, 'G0760=N-NSM'], [2, 'Asa;']] as const) {
      const changed = [...asa]; changed[index] = text;
      expect(tagntEditionName(changed, 'Byz')).toBeNull();
    }
  });
  it('keeps Vaticanus Asaph, P1 partial evidence, and Byzantine Asa distinct in both affected verses', () => {
    for (const [verse, rowId] of [[7, 'r15'], [8, 'r1']] as const) {
      const data = JSON.parse(fs.readFileSync(`data/matthew/1/${verse}.json`, 'utf8'));
      const row = data.rows.find((r: { id: string }) => r.id === rowId);
      expect(row.byzantine.gloss).toMatchObject({ gloss: 'Asa', source: 'TAGNT' });
      expect(row.byzantine.gloss.generated).toBeUndefined();
      expect(row.vaticanus.text).toBe('ασαφ');
      expect(row.vaticanus.gloss.gloss).toMatch(/^Asaph/);
      if (verse === 7) {
        expect(row.papyrus.text).toBe('ασα·');
        expect(row.papyrus.provenance.archivalGloss.gloss).toBe('Asaph;');
      }
    }
  });
});
