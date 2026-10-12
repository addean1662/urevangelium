import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStreamModel, comparisonGreek, comparisonLatin, exactOccurrencePairs, linkedWordIds, type StreamEvidence, type StreamModel } from '@/lib/alignment/streams';
import type { VerseData } from '@/lib/types';
import { pilotLinks } from '@/scripts/streams/pilot-links.mjs';

function fixture(gospel: string, chapter = 1, verse = 1) {
  const data = JSON.parse(fs.readFileSync(`data/${gospel}/${chapter}/${verse}.json`, 'utf8')) as VerseData;
  const index = JSON.parse(fs.readFileSync(`data/alignment-streams/${gospel}.json`, 'utf8'));
  return { data, evidence: index.verses[`${chapter}:${verse}`] as StreamEvidence };
}
function model(gospel: string, chapter = 1, verse = 1) { const { data, evidence } = fixture(gospel, chapter, verse); return buildStreamModel(data, evidence); }

describe('occurrence correspondence, independent of display position', () => {
  it('corrects Matthew 3:1 in both directions across Coptic, Latin and Syriac', () => {
    const m = model('matthew',3,1);
    for (const id of ['coptic:r4','vulgate:r2','bezaeLatin:r2','peshitta:r4']) {
      const ids = linkedWordIds(m,id,true);
      expect(ids).toContain('vaticanus:r4');
      expect(ids).toContain('bezaeGreek:r4');
      expect(ids).not.toContain('vaticanus:r2');
    }
    for (const id of ['coptic:r9','bezaeLatin:r14','peshitta:r10','peshitta:r11']) {
      const ids = linkedWordIds(m,id,true);
      expect(ids).toContain('bezaeGreek:r10');
      expect(ids).toContain('vaticanus:r10');
      expect(ids).not.toContain('vaticanus:r14');
      expect(ids).not.toContain('vaticanus:r11');
    }
    expect(linkedWordIds(m,'coptic:r12',true)).toContain('vaticanus:r9');
    expect(linkedWordIds(m,'coptic:r12',true)).not.toContain('vaticanus:r12');
    expect(linkedWordIds(m,'bezaeLatin:r3',true)).toContain('vaticanus:r7');
    expect(linkedWordIds(m,'bezaeLatin:r3',true)).not.toContain('bezaeGreek:r3');
  });
  it('links displaced Bezae Latin by its Vulgate occurrence without pairing it to an unrelated Greek neighbor', () => {
    const { data } = fixture('mark');
    const sample = { ...data, rows: [
      { id:'a',papyrus:{type:'lost'},vaticanus:{type:'text',text:'φωνη'},vulgate:{type:'text',text:'vox'},bezae:{type:'text',greek:'φωνη',latin:'diebus'} },
      { id:'b',papyrus:{type:'lost'},vaticanus:{type:'text',text:'ημεραις'},vulgate:{type:'text',text:'diebus'},bezae:{type:'text',greek:'ημεραις',latin:'vox'} },
    ] } as VerseData;
    const m = buildStreamModel(sample);
    const ids = linkedWordIds(m,'bezaeLatin:a',true);
    expect(ids).toContain('bezaeGreek:b');
    expect(ids).toContain('vaticanus:b');
    expect(ids).not.toContain('bezaeGreek:a');
    expect(ids).not.toContain('bezaeLatin:b');
    expect(linkedWordIds(m,'bezaeGreek:b',true)).toContain('bezaeLatin:a');
    expect(m.links.find(l=>l.status === 'provisional' && l.members.includes('bezaeLatin:a'))).toBeDefined();
    expect(comparisonLatin('prædicans')).toBe(comparisonLatin('praedicans'));
    expect(comparisonLatin('venit')).toBe(comparisonLatin('uenit'));
  });
  it('links the displaced Mark God word while the extra Byzantine article highlights alone', () => {
    const m = model('mark');
    const ids = linkedWordIds(m, 'vaticanus:r7');
    expect(ids).toContain('byzantine:byzantine-mark-1-1-1');
    expect(ids).toContain('sinaiticus:byzantine-mark-1-1-1');
    expect(ids).toContain('coptic:r7');
    expect(ids).not.toContain('byzantine:r7');
    expect([...ids].some(id => id.startsWith('papyrus:'))).toBe(false);
    expect([...linkedWordIds(m, 'byzantine:r7', true)]).toEqual(['byzantine:r7']);
    expect(m.columns.byzantine.words.find(w => w.id === 'byzantine:r7')?.sourceSpecific).toBe(true);
  });
  it('highlights only sources with a discrete counterpart for an article', () => {
    const ids = linkedWordIds(model('mark'), 'vaticanus:r2');
    expect(ids).toEqual(new Set(['vaticanus:r2','sinaiticus:r2','bezaeGreek:r2','byzantine:r2']));
  });
  it('keeps repeated words separate and respects the Syriac semantic-head rule', () => {
    const m = model('john');
    expect(linkedWordIds(m,'vaticanus:r6')).toContain('coptic:r3');
    expect(linkedWordIds(m,'vaticanus:r6')).not.toContain('coptic:r9');
    expect(linkedWordIds(m,'vaticanus:r1')).not.toContain('peshitta:r2');
    expect(linkedWordIds(m,'vaticanus:r2')).toContain('peshitta:r2');
  });
  it('links a Latin compound and displaced Bezae Latin without linking quidem to many', () => {
    const m = model('luke');
    expect(linkedWordIds(m,'vaticanus:r2')).toContain('bezaeLatin:r5');
    expect(linkedWordIds(m,'vaticanus:r2')).not.toContain('bezaeLatin:r2');
    const compound = linkedWordIds(m,'vaticanus:r3');
    expect(compound).toContain('vulgate:r3'); expect(compound).toContain('vulgate:r4');
    expect(compound).toContain('bezaeLatin:r7');
    expect(m.columns.bezaeLatin.words.map(w => w.text).slice(0,5)).toEqual(['quoniam','quidem','multi','temptauerunt','conscribere']);
  });
  it('preserves a Coptic published phrase and fixes its displaced counterpart', () => {
    const m = model('matthew',12,19);
    expect(linkedWordIds(m,'coptic:r12')).toContain('vaticanus:r10');
    expect(linkedWordIds(m,'coptic:r12',true)).not.toContain('vaticanus:r12');
    expect(m.columns.coptic.words.find(w=>w.rowId === 'r12')?.gloss?.gloss).toBe('in the streets');
  });
  it('does not turn a missing correspondence into a source-specific claim', () => {
    const m = model('luke');
    const word = m.columns.coptic.words.find(w=>w.rowId === 'r9')!;
    expect(word.sourceSpecific).toBeFalsy();
    expect([...linkedWordIds(m,word.id)]).toEqual([word.id]);
    expect(linkedWordIds(m,word.id,true).size).toBeGreaterThan(1);
  });
  it('does not transitively merge unrelated semantic groups', () => {
    const m = { links: [
      { id:'one',members:['a','b'],status:'documented',basis:'one' },
      { id:'two',members:['b','c'],status:'documented',basis:'two' },
    ] } as StreamModel;
    expect([...linkedWordIds(m,'a')]).toEqual(['a','b']);
  });
  it('leaves ambiguous repetitions unresolved while matching unique displaced forms', () => {
    expect(exactOccurrencePairs(['a','a'],['a'])).toEqual([]);
    expect(exactOccurrencePairs(['a','b'],['b','a'])).toEqual(expect.arrayContaining([[0,1],[1,0]]));
    expect(exactOccurrencePairs(['a','b','a'],['a','b','a'])).toEqual([[0,0],[1,1],[2,2]]);
    expect(comparisonGreek('ΘΥ')).toBe(comparisonGreek('θεοῦ'));
  });
  it('rejects a changed pilot snapshot instead of reusing decisions for new source words', () => {
    const { data } = fixture('mark');
    (data.rows[0].vaticanus as { text: string }).text = 'changed';
    expect(()=>pilotLinks('mark 1:1',data)).toThrow('snapshot changed');
  });
});
