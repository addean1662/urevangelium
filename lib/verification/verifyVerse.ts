import type { VerseData } from '@/lib/types';
import type { StreamKey, StreamModel, StreamWord } from '@/lib/alignment/streams';
import type { EnglishView, EnglishViews } from '@/lib/alignment/englishPresentation';

export type Check = { status: 'compared' | 'difference' | 'review' | 'unavailable' | 'not-applicable'; detail: string };
export type SourceExpectation = {
  authority: string;
  words?: string[];
  rows?: Record<string, { type: string; text: string | null }>;
  conflicts?: Array<{ witness: string; sourceToken: number; cntr: string; intf: string }>;
};
export type TranslationUnit = {
  english: string; translatorEdition: string; displayReferences: string[];
  boundaryReview?: { note: string; relatedReference: string; holdGrouping: boolean; evidence: string[] };
};
export type VerseExpectations = {
  sources: Partial<Record<StreamKey, SourceExpectation>>;
  english: Partial<Record<StreamKey, TranslationUnit | null>>;
};
export type ColumnReport = { column: StreamKey; authority: string; source: Check; order: Check; english: Check; placement: Check; evidence: Check };
export type VerseReport = { reference: string; columns: ColumnReport[] };

type UnknownRecord = Record<string, unknown>;
const record = (v: unknown): UnknownRecord => v !== null && typeof v === 'object' ? v as UnknownRecord : {};
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const check = (status: Check['status'], detail: string): Check => ({ status, detail });
const nfc = (s: string) => s.normalize('NFC');
export const englishWords = (s: string): string[] => s.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu) ?? [];

// Compare spellings as stored, with Unicode composition only. In particular,
// Zare/Zara, Amminadab/Ameinadab and manuscript contractions remain distinct.
function sourceSequence(words: StreamWord[], column: StreamKey): { tokens: string[]; malformed: boolean } {
  const tokens: string[] = [];
  let malformed = false;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const division = record(record(record(word.cell).provenance).wordDivision);
    if (column === 'vaticanus' && Object.keys(division).length) {
      const count = division.parts;
      if (division.part !== 1 || typeof count !== 'number' || !Number.isInteger(count) || count < 2) {
        malformed = true; tokens.push(word.text); continue;
      }
      const group = words.slice(i, i + count);
      const joined = group.map(w => w.text).join('');
      malformed ||= group.length !== count || joined !== division.sourceToken || group.some((w, j) => {
        const d = record(record(record(w.cell).provenance).wordDivision);
        return d.sourceToken !== division.sourceToken || d.part !== j + 1 || d.parts !== count;
      });
      tokens.push(joined); i += count - 1;
    } else {
      // Several original word groups may share a comparison cell. Splitting
      // whitespace here checks the exact sequence actually rendered in it.
      tokens.push(...word.text.split(/\s+/u).filter(Boolean));
    }
  }
  return { tokens: tokens.map(nfc), malformed };
}

function englishCheck(data: VerseData, column: StreamKey, unit?: TranslationUnit | null, view?: EnglishView): Check {
  if (column.startsWith('bezae')) return check('not-applicable', 'This side displays manuscript text; the facing Latin is not an English gloss.');
  if (!unit) return check('review', 'An independent wording check for this column’s declared English authorities is pending.');
  if (view) {
    const ids = [...Object.values(view.groups).flat(), ...view.unassigned];
    const intact = view.occurrences.map(o => o.text).join('') === unit.english
      && equal(view.unit, unit) && ids.length === view.occurrences.length && new Set(ids).size === ids.length
      && view.occurrences.every(o => ids.includes(o.id));
    return check(intact ? 'compared' : 'difference', intact
      ? `Both English views preserve every character and occurrence from ${unit.translatorEdition}. ${view.unassigned.length} occurrences await source grouping. This does not certify semantic placement.`
      : 'The English display projection differs from its published translation unit.');
  }
  const ref = `${data.gospel} ${data.chapter}:${data.verse}`;
  if (unit.displayReferences.length !== 1 || unit.displayReferences[0] !== ref) return check('review', 'The published translation spans multiple display verses; a whole-unit check is required.');
  const expected = englishWords(unit.english), used = Array(expected.length).fill(0) as number[];
  const failures: string[] = [];
  for (const row of data.rows) {
    const cell = record(record(row)[column]);
    if (cell.type !== 'text' && cell.type !== 'translation') continue;
    const p = record(cell.provenance), alignment = record(p.englishAlignment);
    const raw = cell.type === 'translation' ? [p.englishIndex] : alignment.englishIndices ?? [];
    const indices = Array.isArray(raw) ? raw : [];
    const actual = englishWords(String(record(cell.gloss).gloss ?? ''));
    if (!equal(actual, indices.map(i => typeof i === 'number' ? expected[i] : undefined))) failures.push(row.id);
    for (const index of indices) {
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= expected.length) failures.push(row.id);
      else used[index]++;
    }
  }
  if (failures.length || used.some(n => n !== 1)) return check('difference', `English occurrence accounting or wording differs from ${unit.translatorEdition}${failures.length ? ` (${[...new Set(failures)].slice(0, 5).join(', ')})` : ''}.`);
  return check('compared', `Every lexical English occurrence matches ${unit.translatorEdition} once. Punctuation and semantic placement require separate review.`);
}

/** Read-only: evaluates the same stream model the page renders. Never repairs data. */
export function verifyVerse(data: VerseData, model: StreamModel, expected?: VerseExpectations, englishViews?: EnglishViews): VerseReport {
  const reference = `${data.gospel} ${data.chapter}:${data.verse}`;
  const columns = (Object.keys(model.columns) as StreamKey[]).map(column => {
    const stream = model.columns[column], source = expected?.sources[column];
    let sourceCheck = check('unavailable', 'No current source expectation is available.');
    let orderCheck = check('unavailable', 'Source order has not been compared.');
    if (source?.words) {
      const actual = sourceSequence(stream.words, column), wanted = source.words.map(nfc);
      if (!wanted.length && !actual.tokens.length) {
        sourceCheck = check('review', 'No verse words in the selected source extraction. Physical loss, omission and reading-layer coverage require separate evidence.');
        orderCheck = check('review', 'No sequence to compare.');
      } else {
        const sameWords = !actual.malformed && equal([...actual.tokens].sort(), [...wanted].sort());
        const sameOrder = !actual.malformed && equal(actual.tokens, wanted);
        sourceCheck = check(sameWords ? 'compared' : 'difference', sameWords
          ? `${wanted.length} source occurrences match the pinned transcription or edition.`
          : `Displayed spellings or occurrence counts differ from the selected source (${actual.tokens.length} displayed; ${wanted.length} expected). Review the source extraction as well as the display.`);
        orderCheck = check(sameOrder ? 'compared' : sameWords ? 'difference' : 'review', sameOrder
          ? 'Displayed sequence matches this source’s own sequence.' : sameWords
            ? 'The same source occurrences appear in a different sequence.'
            : 'Resolve spelling or coverage differences before certifying occurrence order.');
      }
    } else if (source?.rows) {
      const actual = new Map(data.rows.map(row => [row.id, row.papyrus]));
      const different = Object.entries(source.rows).some(([id, wanted]) => {
        const cell = record(actual.get(id));
        return cell.type !== wanted.type || (cell.text ?? null) !== wanted.text;
      }) || stream.words.some(word => !source.rows?.[word.rowId]);
      sourceCheck = check(different ? 'difference' : stream.words.length ? 'compared' : 'review', different
        ? 'The papyrus display differs from its pinned attestation projection.'
        : stream.words.length ? 'Admitted cells match the CNTR surviving-character projection. This does not establish completeness or agreement with manuscript images.'
          : 'No admitted papyrus words in this stream. Source-collection coverage and physical status require review.');
      orderCheck = check('review', stream.order === 'comparison'
        ? 'Papyrus sequence evidence is conflicting or unavailable.'
        : 'Composite order follows recorded witness coordinates; independent coverage and occurrence-order review is pending.');
    }
    const englishView = englishViews?.[column];
    const repeated = stream.words.filter(w => {
      const displayedEnglish = englishView ? (englishView.groups[w.id] ?? []).map(id => englishView.occurrences[Number(id.slice(1))].text).join('') : w.gloss?.gloss ?? '';
      const words = englishWords(displayedEnglish).map(x => x.toLowerCase());
      return words.some((x, i) => i > 0 && x === words[i - 1]);
    });
    const placement = column.startsWith('bezae') ? check('not-applicable', 'Greek–Latin correspondence requires bilingual review; no English gloss is displayed.') : check('review', englishView?.issues.length
      ? englishView.issues.join(' ')
      : englishView?.unit.boundaryReview ? englishView.unit.boundaryReview.note
      : englishView?.review ? 'An evidence-backed grouping correction is applied to this display. Both word banks are unchanged; independent scholarly placement review remains pending.'
      : repeated.length
      ? `Repeated English occurrences share a source cell (${repeated.map(w => w.rowId).join(', ')}). Inspect their allocation in context; repetition alone does not prove an error.`
      : 'Independent source-language placement review is pending. Wording and sequence checks do not certify meaning.');
    const conflicts = source?.conflicts ?? [];
    const evidence = check('review', conflicts.length
      ? `CNTR and INTF disagree about supplied letters: ${conflicts.map(c => `${c.witness} token ${c.sourceToken}: ${c.cntr} / ${c.intf}`).join('; ')}. Manuscript-image adjudication is pending.`
      : ['papyrus', 'vaticanus', 'sinaiticus', 'bezaeGreek', 'bezaeLatin'].includes(column)
        ? 'Manuscript-image certification is pending; transcription agreement is a separate result.'
        : 'Comparison is against the declared electronic edition; edition acquisition and scholarly review remain separate.');
    return { column, authority: source?.authority ?? 'Source expectation unavailable', source: sourceCheck, order: orderCheck,
      english: englishCheck(data, column, expected?.english[column], englishView), placement, evidence };
  });
  return { reference, columns };
}
