import fs from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlignmentExplorer } from '@/components/AlignmentTable/AlignmentExplorer';
import { buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import { buildEnglishView, englishOccurrences, groupedEnglish, translationOrderOccurrences } from '@/lib/alignment/englishPresentation';
import { prepareEnglishViews } from '@/lib/verification/prepareEnglishViews';
import { verifyVerse, type VerseExpectations } from '@/lib/verification/verifyVerse';
import type { VerseData } from '@/lib/types';
import reviews from '@/data/english-groups/reviewed.json';

const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
function fixture() {
  const data = read('data/matthew/1/2.json') as VerseData;
  const evidence = read('data/alignment-streams/matthew.json').verses['1:2'] as StreamEvidence;
  const expectations = read('data/verse-verification/matthew.json').verses['1:2'] as VerseExpectations;
  const model = buildStreamModel(data, evidence);
  return { data, evidence, expectations, model, englishViews: prepareEnglishViews(model, expectations, reviews) };
}

describe('immutable English banks and occurrence placement', () => {
  it('places all Matthew 1:7 Latin names without conflating the two Abia occurrences or altering either bank', () => {
    const data = read('data/matthew/1/7.json') as VerseData;
    const evidence = read('data/alignment-streams/matthew.json').verses['1:7'] as StreamEvidence;
    const expectations = read('data/verse-verification/matthew.json').verses['1:7'] as VerseExpectations;
    const model = buildStreamModel(data, evidence), before = JSON.stringify({ data, model, expectations });
    const views = prepareEnglishViews(model, expectations, reviews), view = views.vulgate!;
    expect(model.columns.vulgate.words.map(w => w.text)).toEqual(['Salomon', 'autem', 'genuit', 'Roboam', 'Roboam', 'autem', 'genuit', 'Abiam', 'Abias', 'autem', 'genuit', 'Asa']);
    expect(model.columns.vulgate.words.map(w => groupedEnglish(view, w.id).trim())).toEqual(['Solomon', 'And', 'begot', 'Roboam.', 'Roboam', 'And', 'begot', 'Abia.', 'Abia', 'And', 'begot', 'Asa.']);
    expect(view.groups['vulgate:r10']).toEqual(['e7']);
    expect(view.groups['vulgate:r11']).toEqual(['e9']);
    expect(view.unassigned).toEqual([]);
    expect(view.issues).toEqual([]);
    expect(translationOrderOccurrences(view).map(o => o.text).join('')).toBe(expectations.english.vulgate!.english);
    expect(JSON.stringify({ data, model, expectations })).toBe(before);
    const { container } = render(<AlignmentExplorer data={data} evidence={evidence} expectations={expectations} englishViews={views} />);
    expect(screen.queryByLabelText('Vulgate English awaiting alignment')).not.toBeInTheDocument();
    expect(container.querySelector('[data-english-group="vulgate:r1"]')).toHaveTextContent('Solomon');
    fireEvent.click(within(screen.getByRole('group', { name: 'Vulgate English view' })).getByRole('button', { name: 'Translation order' }));
    expect(container.querySelector('[data-translation-order="vulgate"]')!.textContent).toBe(expectations.english.vulgate!.english);
    fireEvent.mouseEnter(container.querySelector('[data-english-id="vulgate:e7"]')!);
    expect(container.querySelector('[data-word-id="vulgate:r10"]')).toHaveAttribute('data-highlighted', 'true');
    expect(container.querySelector('[data-word-id="vulgate:r11"]')).not.toHaveAttribute('data-highlighted', 'true');
  });
  it('aligns all Matthew 1:5 Latin words using distinct, attested English occurrences across the edition boundary', () => {
    const data = read('data/matthew/1/5.json') as VerseData;
    const evidence = read('data/alignment-streams/matthew.json').verses['1:5'] as StreamEvidence;
    const expectations = read('data/verse-verification/matthew.json').verses['1:5'] as VerseExpectations;
    const model = buildStreamModel(data, evidence), before = JSON.stringify({ data, model, expectations });
    const views = prepareEnglishViews(model, expectations, reviews), view = views.vulgate!;
    expect(view.review).toBeDefined();
    expect(groupedEnglish(view, 'vulgate:r21')).toBe('Jesse.');
    expect(groupedEnglish(view, 'vulgate:vulgate-matthew-1-5-1').trim()).toBe('Jesse');
    expect(model.columns.vulgate.words.every(w => groupedEnglish(view, w.id).trim())).toBe(true);
    expect(groupedEnglish(view, 'vulgate:vulgate-matthew-1-5-5').trim()).toBe('the king.');
    expect(view.unit.boundaryReview?.relatedReference).toBe('matthew 1:6');
    expect(view.unassigned).toEqual([]);
    expect(view.occurrences).toHaveLength(22);
    expect(translationOrderOccurrences(view).map(o => o.text).join('')).toBe(expectations.english.vulgate!.english);
    expect(view.occurrences[17]).toMatchObject({ text: 'Jesse ', publishedReference: 'matthew 1:6', publishedIndex: 1 });
    expect(JSON.stringify({ data, model, expectations })).toBe(before);
    const report = verifyVerse(data, model, expectations, views);
    expect(report.columns.find(c => c.column === 'vulgate')!.english.status).toBe('compared');
    expect(report.columns.find(c => c.column === 'papyrus')!.evidence.detail).toContain('token 6: εκ / ··');
    const { container } = render(<AlignmentExplorer data={data} evidence={evidence} expectations={expectations} englishViews={views} />);
    expect(container.querySelector('[data-english-boundary="vulgate"]')).not.toHaveAttribute('open');
    expect(container.querySelector('[data-english-group="vulgate:r21"]')).toHaveTextContent('Jesse.');
    expect(screen.queryByLabelText('Vulgate English awaiting alignment')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comparison rows' }));
    expect(within(screen.getByRole('table', { name: 'Manuscript comparison rows' })).getByText('the king.')).toBeInTheDocument();
  });
  it('restores every Matthew 1:6 Latin gloss and keeps the original complete English in Translation order', () => {
    const data = read('data/matthew/1/6.json') as VerseData;
    const evidence = read('data/alignment-streams/matthew.json').verses['1:6'] as StreamEvidence;
    const expectations = read('data/verse-verification/matthew.json').verses['1:6'] as VerseExpectations;
    const model = buildStreamModel(data, evidence), views = prepareEnglishViews(model, expectations, reviews);
    const view = views.vulgate!;
    expect(model.columns.vulgate.words.find(w => w.text === 'Salomonem')!.gloss?.gloss).toBe('David');
    expect(view.review).toBeDefined();
    expect(model.columns.vulgate.words.map(w => groupedEnglish(view, w.id).trim())).toEqual(['David', 'And', 'the king', 'begot', 'Solomon,', 'of', 'her', 'that', 'had been', 'the wife of Urias.']);
    expect(view.unassigned).toEqual([]);
    expect(view.issues).toEqual([]);
    expect(translationOrderOccurrences(view).map(o => o.text).join('')).toBe(expectations.english.vulgate!.english);
    expect(verifyVerse(data, model, expectations, views).columns.find(c => c.column === 'vulgate')!.english.status).toBe('compared');
    const { container } = render(<AlignmentExplorer data={data} evidence={evidence} expectations={expectations} englishViews={views} />);
    expect(screen.queryByLabelText('Vulgate English awaiting alignment')).not.toBeInTheDocument();
    expect(container.querySelector('[data-english-group="vulgate:r14"]')).toHaveTextContent('Solomon,');
    fireEvent.click(within(screen.getByRole('group', { name: 'Vulgate English view' })).getByRole('button', { name: 'Translation order' }));
    expect(container.querySelector('[data-translation-order="vulgate"]')!.textContent).toBe(expectations.english.vulgate!.english);
    fireEvent.mouseEnter(container.querySelector('[data-english-id="vulgate:e11"]')!);
    expect(container.querySelector('[data-word-id="vulgate:r14"]')).toHaveAttribute('data-highlighted', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Comparison rows' }));
    expect(within(screen.getByRole('table', { name: 'Manuscript comparison rows' })).getByText('Solomon,')).toBeInTheDocument();
  });
  it('preserves every character including punctuation, quotes and whitespace', () => {
    for (const text of [' “Isaac:  Isaac\nbegat Jacob;” ', '...  ', "Don't change mother-in-law’s name.", '']) {
      expect(englishOccurrences(text).map(w => w.text).join('')).toBe(text);
    }
  });
  it('corrects both repeated names and the possessive phrase without changing the corpus', () => {
    const { data, model, expectations } = fixture();
    const before = JSON.stringify({ data, model, expectations });
    const views = prepareEnglishViews(model, expectations, reviews), view = views.peshitta!;
    expect(view.review).toBeDefined();
    expect(view.issues).toEqual([]);
    expect(view.unassigned).toEqual([]);
    expect(model.columns.peshitta.words.map(w => groupedEnglish(view, w.id).trim())).toEqual(['Abraham', 'begat', 'Isaac:', 'Isaac', 'begat', 'Jacob:', 'Jacob', 'begat', 'Judah', 'and his brothers:']);
    expect(view.occurrences.map(w => w.text).join('')).toBe(expectations.english.peshitta!.english);
    expect(JSON.stringify({ data, model, expectations })).toBe(before);
    const report = verifyVerse(data, model, expectations, views).columns.find(c => c.column === 'peshitta')!;
    expect(report.english.status).toBe('compared');
    expect(report.placement.status).toBe('review');
    expect(report.placement.detail).toContain('correction is applied');
  });
  it('rejects a stale review after a source occurrence or translation changes', () => {
    const { model, expectations } = fixture();
    model.columns.peshitta.words[0].text += 'x';
    let view = prepareEnglishViews(model, expectations, reviews).peshitta!;
    expect(view.review).toBeUndefined();
    expect(view.issues.join(' ')).toContain('stale');
    expectations.english.peshitta!.english += ' ';
    view = prepareEnglishViews(model, expectations, reviews).peshitta!;
    expect(view.review).toBeUndefined();
  });
  it('keeps duplicate, invalid and unassigned allocations visible exactly once', () => {
    const { model, expectations } = fixture();
    const stream = model.columns.peshitta;
    const cell = stream.words[1].cell as unknown as { provenance: { englishAlignment: { englishIndices: number[] } } };
    cell.provenance.englishAlignment.englishIndices = [0];
    stream.words[1].gloss = { gloss: 'Abraham', source: 'Murdock' };
    const view = buildEnglishView(model.reference, stream, expectations.english.peshitta!);
    expect(view.unassigned).toContain('e0');
    expect(view.unassigned).toContain('e1');
    expect(view.issues.join(' ')).toContain('overlapping');
    const displayed = [...Object.values(view.groups).flat(), ...view.unassigned];
    expect(new Set(displayed).size).toBe(view.occurrences.length);
    expect(displayed.length).toBe(view.occurrences.length);
  });
  it('keeps a multi-verse translation whole and withholds word grouping', () => {
    const { model, expectations } = fixture();
    const unit = { ...expectations.english.peshitta!, displayReferences: ['matthew 1:2', 'matthew 1:3'] };
    const view = buildEnglishView(model.reference, model.columns.peshitta, unit);
    expect(Object.keys(view.groups)).toHaveLength(0);
    expect(view.unassigned).toHaveLength(view.occurrences.length);
    expect(view.occurrences.map(o => o.text).join('')).toBe(unit.english);
  });
});

describe('English view switch', () => {
  it('switches views without changing source order or losing English, and highlights the correct name occurrence', () => {
    const f = fixture();
    const { container } = render(<AlignmentExplorer {...f} />);
    const sourceIds = () => [...container.querySelectorAll('[data-stream="peshitta"] [data-word-id]')].map(e => e.getAttribute('data-word-id'));
    const before = sourceIds();
    expect(container.querySelector('[data-english-group="peshitta:r5"]')!.textContent).toBe('Isaac ');
    expect(container.querySelector('[data-english-group="peshitta:r17"]')!.textContent).toBe('and his brothers:');
    const controls = within(screen.getByRole('group', { name: 'Peshitta English view' }));
    fireEvent.click(controls.getByRole('button', { name: 'Translation order' }));
    expect(container.querySelector('[data-translation-order="peshitta"]')!.textContent).toBe(f.expectations.english.peshitta!.english);
    expect(sourceIds()).toEqual(before);
    const secondIsaac = container.querySelector('[data-english-id="peshitta:e3"]')!;
    fireEvent.mouseEnter(secondIsaac);
    expect(container.querySelector('[data-word-id="peshitta:r5"]')).toHaveAttribute('data-highlighted', 'true');
    fireEvent.keyDown(secondIsaac, { key: 'Enter' });
    expect(secondIsaac).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(secondIsaac, { key: 'Escape' });
    expect(secondIsaac).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(controls.getByRole('button', { name: 'Follow source' }));
    expect(sourceIds()).toEqual(before);
    expect(container.querySelectorAll('[data-stream="peshitta"] [data-english-id]')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Comparison rows' }));
    const rows = within(screen.getByRole('table', { name: 'Manuscript comparison rows' }));
    expect(rows.getByText('and his brothers:')).toBeInTheDocument();
    expect(rows.queryByText('Isaac: Isaac')).not.toBeInTheDocument();
  });
  it('offers complete editions for Vulgate and Sinaiticus without inventing one for lexical columns', () => {
    const f = fixture();
    render(<AlignmentExplorer {...f} />);
    expect(screen.getByRole('group', { name: 'Vulgate English view' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Sahidic English view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Vaticanus English view' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show Sinaiticus' }));
    const controls = within(screen.getByRole('group', { name: 'Sinaiticus English view' }));
    fireEvent.click(controls.getByRole('button', { name: 'Translation order' }));
    expect(screen.getByLabelText('Sinaiticus published English in translation order').textContent).toBe(f.expectations.english.sinaiticus!.english);
  });
});
