import fs from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlignmentExplorer } from '@/components/AlignmentTable/AlignmentExplorer';
import type { VerseData } from '@/lib/types';

const data = JSON.parse(fs.readFileSync('data/mark/1/1.json','utf8')) as VerseData;
const evidence = JSON.parse(fs.readFileSync('data/alignment-streams/mark.json','utf8')).verses['1:1'];
function setup(verseData = data, verseEvidence = evidence) {
  const { container } = render(<AlignmentExplorer data={verseData} evidence={verseEvidence} />);
  const word = (id: string) => container.querySelector(`[data-word-id="${id}"]`)!;
  const highlights = () => [...container.querySelectorAll('[data-highlighted="true"]')].map(el=>el.getAttribute('data-word-id'));
  return { container, word, highlights };
}
describe('word stream interaction', () => {
  it('includes existing cross-language alignment by default outside the contextual examples', () => {
    const verse = JSON.parse(fs.readFileSync('data/matthew/3/2.json','utf8')) as VerseData;
    const index = JSON.parse(fs.readFileSync('data/alignment-streams/matthew.json','utf8'));
    const { word, highlights } = setup(verse,index.verses['3:2']);
    const toggle = screen.getByRole('checkbox',{name:'Show existing alignment links (under review)'});
    expect(toggle).toBeChecked();
    for (const column of ['coptic','vulgate','peshitta','bezaeLatin']) {
      const source = verse.rows.find(r => column === 'bezaeLatin' ? r.bezae?.type === 'text' && r.bezae.latin && r.vaticanus.type === 'text' : r[column as 'coptic'|'vulgate'|'peshitta']?.type === 'text' && r.vaticanus.type === 'text')!;
      fireEvent.mouseEnter(word(`${column}:${source.id}`));
      expect(highlights().some(id=>id?.startsWith('vaticanus:')),column).toBe(true);
      expect(screen.getByText(/Dashed highlights show existing alignments still under review/)).toBeInTheDocument();
      fireEvent.mouseLeave(word(`${column}:${source.id}`));
    }
    fireEvent.click(toggle);
    fireEvent.mouseEnter(word('coptic:r1'));
    expect(highlights()).toEqual(['coptic:r1']);
  });
  it('highlights Bezae Greek when hovering its displaced Latin counterpart in Matthew 3:1', () => {
    const verse = JSON.parse(fs.readFileSync('data/matthew/3/1.json','utf8')) as VerseData;
    const index = JSON.parse(fs.readFileSync('data/alignment-streams/matthew.json','utf8'));
    const { word, highlights } = setup(verse,index.verses['3:1']);
    fireEvent.mouseEnter(word('bezaeLatin:r14'));
    expect(highlights()).toContain('bezaeGreek:r10');
    expect(highlights()).toContain('coptic:r9');
    expect(highlights()).toContain('peshitta:r10');
    expect(highlights()).not.toContain('bezaeGreek:r14');
  });
  it('highlights counterparts on hover, clears on leave, and keeps source-only words alone', () => {
    const { word, highlights } = setup();
    fireEvent.mouseEnter(word('vaticanus:r7'));
    expect(highlights()).toContain('byzantine:byzantine-mark-1-1-1');
    expect(highlights()).not.toContain('byzantine:r7');
    fireEvent.mouseLeave(word('vaticanus:r7'));
    expect(highlights()).toHaveLength(0);
    fireEvent.mouseEnter(word('byzantine:r7'));
    expect(highlights()).toEqual(['byzantine:r7']);
    expect(screen.getByText('Source-specific word: no discrete counterpart.')).toBeInTheDocument();
  });
  it('supports focus, keyboard pinning, Escape and changing the Alexandrian source', () => {
    const { word, highlights } = setup();
    fireEvent.focus(word('vaticanus:r7'));
    expect(highlights()).toContain('vulgate:r7');
    fireEvent.keyDown(word('vaticanus:r7'),{key:'Enter'});
    fireEvent.blur(word('vaticanus:r7'));
    expect(highlights()).toContain('vulgate:r7');
    fireEvent.keyDown(word('vaticanus:r7'),{key:'Escape'});
    expect(highlights()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'Show Sinaiticus'}));
    expect(word('sinaiticus:byzantine-mark-1-1-1')).not.toBeNull();
    expect(word('vaticanus:r7')).toBeNull();
  });
  it('provides the old row table for direct comparison', () => {
    const { container } = setup();
    expect(container.querySelectorAll('[data-stream]').length).toBe(8);
    fireEvent.click(screen.getByRole('button',{name:'Comparison rows'}));
    expect(container.querySelectorAll('[data-stream]').length).toBe(0);
    expect(container.querySelectorAll('thead th').length).toBe(14);
  });
});
