'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PapyrusCell as PapyrusCellType, WitnessCell as WitnessCellType } from '@/lib/types';
import { linkedWordIds, type StreamKey, type StreamModel, type StreamWord, type WordStream } from '@/lib/alignment/streams';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { transliterateCoptic } from '@/lib/transliteration/coptic';
import { WitnessCell } from './WitnessCell';
import { PapyrusCell } from './PapyrusCell';
import { PapyrusIndicator } from './IndicatorCell';
import { SyriacCell } from './SyriacCell';
import { GlossCell } from './GlossCell';
import { getBezaeLacuna } from './AlignmentTable';

const LABELS: Record<StreamKey, string> = {
  papyrus: 'Earliest Papyri', coptic: 'Sahidic', vaticanus: 'Vaticanus', sinaiticus: 'Sinaiticus',
  vulgate: 'Vulgate', bezaeGreek: 'Bezae Greek', bezaeLatin: 'Bezae Latin', peshitta: 'Peshitta', byzantine: 'Byzantine',
};
const ENGLISH: Partial<Record<StreamKey, string>> = {
  papyrus: 'TAGNT', coptic: 'Horner / lexical aid', vaticanus: 'Certified English',
  sinaiticus: 'Anderson 1918', vulgate: 'Douay-Rheims 1899', peshitta: 'Murdock 1851', byzantine: 'Certified English',
};
const DATES: Record<string, string> = {
  papyrus: 'c. 125–250 AD', coptic: 'c. 250–300 AD', vaticanus: 'c. 175–325 AD',
  sinaiticus: 'c. 175–350 AD', vulgate: 'Clementine 1592/1598', bezae: 'c. 150–400 AD',
  peshitta: 'c. 170–400 AD', byzantine: 'c. 300–500 AD',
};
const ABSENCE_LABELS = { lost: 'Physical loss', lacuna: 'Passage absent', omitted: 'Textual omission', unpopulated: 'Data not populated' };

function SourceCell({ word }: { word: StreamWord }) {
  if (word.column === 'papyrus') return <PapyrusCell cell={word.cell as PapyrusCellType} />;
  if (word.column === 'peshitta') return <SyriacCell cell={word.cell as WitnessCellType} />;
  const latin = word.column === 'vulgate' || word.column === 'bezaeLatin';
  return <WitnessCell cell={word.cell as WitnessCellType} className={latin ? 'font-latin' : word.column === 'coptic' ? 'font-coptic' : 'font-greek'} translitFn={latin ? undefined : word.column === 'coptic' ? transliterateCoptic : transliterateGreek} />;
}

function Absences({ stream }: { stream: WordStream }) {
  const states = [...new Set(stream.absences.map(a => a.state))];
  if (!states.length) return stream.words.length ? null : <p className="p-3 text-center text-sm text-ink-muted">No source words in this verse.</p>;
  return (
    <details className="px-3 py-2 text-xs text-ink-muted">
      <summary className="cursor-pointer">{states.map(state => ABSENCE_LABELS[state]).join(' · ')}</summary>
      <p className="mt-1">These source states are retained separately from correspondence. An absent or lost word cannot be highlighted.</p>
      <ul className="mt-1 space-y-1">
        {states.map(state => <li key={state}>{ABSENCE_LABELS[state]}: {stream.absences.filter(a => a.state === state).length} recorded positions.</li>)}
      </ul>
      <p className="mt-1">See Comparison rows for their recorded positions.</p>
    </details>
  );
}

type ColumnProps = {
  stream: WordStream;
  highlighted: Set<string>;
  established: Set<string>;
  highlightedPhrases: Set<string>;
  pinned: string | null;
  enter: (id: string | null) => void;
  focus: (id: string | null) => void;
  pin: (id: string) => void;
};

function StreamColumn({ stream, highlighted, established, highlightedPhrases, pinned, enter, focus, pin }: ColumnProps) {
  const bilingual = stream.key === 'bezaeGreek' || stream.key === 'bezaeLatin';
  return (
    <div data-stream={stream.key} className="min-w-0">
      <table role="presentation" className="word-stream-table w-full border-collapse">
        <colgroup>{bilingual ? <col /> : <><col style={{ width: '47%' }} /><col style={{ width: '6%' }} /><col style={{ width: '47%' }} /></>}</colgroup>
        <tbody>
          {stream.words.map(word => (
            <tr key={word.id} tabIndex={0} role="button" aria-label={`${LABELS[word.column]}: ${word.text}${word.gloss ? `; ${word.gloss.gloss}` : ''}`} aria-pressed={pinned === word.id}
              data-word-id={word.id} data-highlighted={highlighted.has(word.id) ? 'true' : undefined}
              data-provisional={highlighted.has(word.id) && !established.has(word.id) ? 'true' : undefined}
              onMouseEnter={() => enter(word.id)} onMouseLeave={() => enter(null)}
              onFocus={() => focus(word.id)} onBlur={() => focus(null)}
              onClick={event => { if (!(event.target as HTMLElement).closest('a')) pin(word.id); }}
              onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); pin(word.id); } }}
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-gold">
              <SourceCell word={word} />
              {!bilingual && <>
                {word.column === 'papyrus' ? <PapyrusIndicator cell={word.cell as PapyrusCellType} /> : <td aria-hidden="true" />}
                <GlossCell gloss={word.gloss} highlighted={Boolean(word.gloss?.spanId && highlightedPhrases.has(`${word.column}:${word.gloss.spanId}`))} />
              </>}
            </tr>
          ))}
        </tbody>
      </table>
      <Absences stream={stream} />
      {stream.orderNote && <p className="px-3 py-2 text-xs text-semantic-damaged">{stream.orderNote}</p>}
      {stream.expansions.length > 0 && <details open className="px-3 py-2 text-xs text-ink-muted">
        <summary className="cursor-pointer">Published English without a separate source word</summary>
        <table role="presentation" className="word-stream-table w-full"><tbody>{stream.expansions.map(item => <tr key={item.rowId}><GlossCell gloss={item.gloss} /></tr>)}</tbody></table>
      </details>}
    </div>
  );
}

type Props = { model: StreamModel; nextFragment?: string | null; nextFragmentHref?: string | null };

export function WordStreams({ model, nextFragment, nextFragmentHref }: Props) {
  const [sinaiticus, setSinaiticus] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [provisional, setProvisional] = useState(false);
  const active = pinned ?? hovered ?? focused;
  const established = linkedWordIds(model, active);
  const highlighted = linkedWordIds(model, active, provisional);
  const allWords = Object.values(model.columns).flatMap(c => c.words);
  const highlightedPhrases = new Set(allWords.filter(w => highlighted.has(w.id) && w.gloss?.spanId).map(w => `${w.column}:${w.gloss!.spanId}`));
  const activeWord = allWords.find(w => w.id === active);
  const activeLinks = model.links.filter(l => l.members.includes(active ?? '') && (provisional || l.status !== 'provisional'));
  const visibleKeys: StreamKey[] = ['papyrus', 'coptic', sinaiticus ? 'sinaiticus' : 'vaticanus', 'vulgate', 'bezaeGreek', 'bezaeLatin', 'peshitta', 'byzantine'];
  const visibleIds = new Set(visibleKeys.flatMap(k => model.columns[k].words.map(w => w.id)));
  const visibleCount = [...highlighted].filter(id => visibleIds.has(id)).length;
  const pin = (id: string) => { setPinned(current => current === id ? null : id); setHovered(null); setFocused(null); };
  const clear = () => { setPinned(null); setHovered(null); setFocused(null); };
  const columnProps = { highlighted, established, highlightedPhrases, pinned, enter: setHovered, focus: setFocused, pin };
  const [gospel, passage] = model.reference.split(' ');
  const [chapter, verse] = passage.split(':').map(Number);
  const bezaeLacuna = getBezaeLacuna(gospel, chapter, verse);
  const bands: Array<{ key: string; tradition: string; streams: StreamKey[] }> = [
    { key: 'papyrus', tradition: 'Greek Papyri', streams: ['papyrus'] },
    { key: 'coptic', tradition: 'Coptic', streams: ['coptic'] },
    { key: sinaiticus ? 'sinaiticus' : 'vaticanus', tradition: 'Alexandrian', streams: [sinaiticus ? 'sinaiticus' : 'vaticanus'] },
    { key: 'vulgate', tradition: 'Latin', streams: ['vulgate'] },
    { key: 'bezae', tradition: 'Western', streams: ['bezaeGreek', 'bezaeLatin'] },
    { key: 'peshitta', tradition: 'Syriac', streams: ['peshitta'] },
    { key: 'byzantine', tradition: 'Byzantine', streams: ['byzantine'] },
  ];
  return (
    <div onKeyDown={event => { if (event.key === 'Escape') clear(); }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-secondary">
        <p>Hover or focus a word to see its counterparts. Click to keep the highlight; Escape clears it.</p>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={provisional} onChange={event => setProvisional(event.target.checked)} /> Include provisional row links</label>
      </div>
      <div className="mb-3 min-h-16 rounded bg-bg-elevated px-3 py-2 text-sm" aria-live="polite" aria-atomic="true">
        {activeWord ? <>
          <span className="font-semibold">{LABELS[activeWord.column]} · {activeWord.text}</span>
          <span className="ml-2 text-ink-secondary">{activeWord.sourceSpecific ? 'Source-specific word: no discrete counterpart.' : activeLinks.length ? `${visibleCount} highlighted source words. ${activeLinks.some(l => l.status === 'provisional') ? 'Dashed highlights include unverified row placements.' : 'Recorded correspondence or unambiguous Greek form match.'}` : 'No cross-source link established yet; this does not establish that the word is unique.'}</span>
          {pinned && <button type="button" onClick={clear} className="ml-3 underline underline-offset-2">Clear highlight</button>}
          {activeLinks.length > 0 && <details className="mt-1 text-xs text-ink-secondary"><summary className="cursor-pointer">Correspondence evidence</summary><ul className="mt-1 space-y-1">{activeLinks.map(l => <li key={l.id}>{l.basis}</li>)}</ul></details>}
        </> : <p className="text-ink-secondary">Source columns read independently. Gold highlights show recorded correspondences or Greek form matches. Unresolved words remain unlinked; absence is never filled with a guessed match.</p>}
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[1440px] items-start">
          {bands.map((band, index) => <section key={band.key} aria-label={band.key === 'bezae' ? 'Bezae' : LABELS[band.streams[0]]} className={`min-w-min basis-[220px] grow shrink-0 ${index % 2 ? 'bg-bg-elevated/80' : ''}`}>
            <div className="flex h-9 items-center justify-center gap-2 bg-band px-1 text-center text-[10px] font-semibold uppercase tracking-widest text-ink-on-band-muted">
              {band.tradition}
              {band.tradition === 'Alexandrian' && <button type="button" onClick={() => { setSinaiticus(!sinaiticus); clear(); }} className="rounded border border-ink-on-band-muted/40 px-1 py-0.5 normal-case tracking-normal" aria-label={sinaiticus ? 'Show Vaticanus' : 'Show Sinaiticus'}>{sinaiticus ? 'See Vaticanus' : 'See Sinaiticus'}</button>}
            </div>
            <div className="flex h-24 flex-col items-center justify-center gap-1 bg-witness-band px-2 text-center text-ink-on-band">
              <Link href={`/certification-systems#${band.key === 'papyrus' ? 'earliest-papyri' : band.key === 'coptic' ? 'sahidic' : band.key}`} className="text-sm font-semibold uppercase tracking-wide underline decoration-transparent underline-offset-2 hover:decoration-accent-gold">{band.key === 'bezae' ? 'Bezae' : LABELS[band.streams[0]]}</Link>
              <span className="text-xs text-ink-on-band-muted">{band.key === 'bezae' ? 'Greek · Latin' : ENGLISH[band.streams[0]]}</span>
              <span className="text-[10px] text-ink-on-band-muted">{DATES[band.key]}</span>
              {band.key === 'coptic' && <span className="text-[10px] text-accent-gold-soft">alignment under review</span>}
              {band.key === 'papyrus' && <Link href="/earliest-papyri#damage-and-scan-key" className="text-[10px] text-accent-gold-soft underline">damage &amp; scan key</Link>}
            </div>
            <div className={band.key === 'bezae' ? 'grid grid-cols-[minmax(min-content,1fr)_minmax(min-content,1fr)] items-start pt-2' : 'pt-2'}>
              {band.streams.map(key => <StreamColumn key={key} stream={model.columns[key]} {...columnProps} />)}
            </div>
          </section>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-2" href="/papyrus-map">See 65 Earliest Papyri</Link>
        {nextFragment && (nextFragmentHref ? <Link className="underline underline-offset-2" href={nextFragmentHref}>{nextFragment}</Link> : <span>{nextFragment}</span>)}
        {bezaeLacuna && <Link className="underline underline-offset-2" href={bezaeLacuna.href}>Bezae: {bezaeLacuna.note}</Link>}
      </div>
    </div>
  );
}
