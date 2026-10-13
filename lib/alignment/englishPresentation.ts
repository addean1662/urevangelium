import type { StreamKey, StreamModel, WordStream } from './streams';
import type { TranslationUnit, VerseExpectations } from '../verification/verifyVerse';
import type { PlacementPacket, PlacementProposal } from '../verification/placementProposal';

export type EnglishOccurrence = { id: string; text: string; sourceId?: string };
export type EnglishView = {
  unit: TranslationUnit;
  occurrences: EnglishOccurrence[];
  groups: Record<string, string[]>;
  unassigned: string[];
  issues: string[];
  review?: { rationale: string; evidence: string[] };
};
export type EnglishViews = Partial<Record<StreamKey, EnglishView>>;
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' ? v as Record<string, unknown> : {};
const words = (text: string) => text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu) ?? [];

/** Occurrence indices agree with the existing allocators, but slices retain ALL
 * punctuation and whitespace. Joining the bank always recovers the exact edition. */
export function englishOccurrences(text: string): EnglishOccurrence[] {
  const matches = [...text.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)];
  if (!matches.length) return text ? [{ id: 'e0', text }] : [];
  return matches.map((match, i) => ({ id: `e${i}`, text: text.slice(i === 0 ? 0 : match.index, matches[i + 1]?.index ?? text.length) }));
}

function recordedIndices(word: WordStream['words'][number]): unknown[] {
  const indices = record(record(record(word.cell).provenance).englishAlignment).englishIndices;
  return Array.isArray(indices) ? indices : [];
}

export function englishPlacementPacket(reference: string, stream: WordStream, unit: TranslationUnit, sourceAuthority: string): PlacementPacket {
  return {
    reference, column: stream.key, sourceAuthority, englishAuthority: unit.translatorEdition,
    translationReferences: unit.displayReferences,
    source: stream.words.map(word => ({ id: word.id, text: word.text, provenance: record(word.cell).provenance ?? null })),
    english: englishOccurrences(unit.english),
    current: stream.words.map(word => ({ sourceId: word.id, englishIds: recordedIndices(word).map(i => `e${String(i)}`) })),
  };
}

/** A display projection, never a corpus mutation. Proposals passed here have
 * already been hash- and conservation-checked by the server. */
export function buildEnglishView(reference: string, stream: WordStream, unit: TranslationUnit, proposal?: PlacementProposal, reviewErrors: string[] = []): EnglishView {
  const occurrences = englishOccurrences(unit.english);
  const view: EnglishView = { unit, occurrences, groups: {}, unassigned: [], issues: [...reviewErrors] };
  const singleVerse = unit.displayReferences.length === 1 && unit.displayReferences[0] === reference;
  const candidates = new Map<string, string[]>();
  if (unit.boundaryReview?.holdGrouping) view.issues.push(unit.boundaryReview.note);
  else if (!singleVerse) view.issues.push('This complete translation unit spans multiple display verses; word grouping awaits a whole-unit review.');
  else for (const word of stream.words) {
    const indices = proposal
      ? (proposal.assignments.find(a => a.sourceId === word.id)?.englishIds ?? []).map(id => occurrences.findIndex(o => o.id === id))
      : recordedIndices(word);
    const valid = indices.every((i, j) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < occurrences.length && (!j || i === Number(indices[j - 1]) + 1));
    const text = valid ? indices.map(i => occurrences[Number(i)].text).join('') : '';
    const wordingMatches = proposal || JSON.stringify(words(word.gloss?.gloss ?? '')) === JSON.stringify(words(text));
    if (!valid || !wordingMatches) {
      view.issues.push(`${word.rowId}: recorded English allocation needs review.`);
      continue;
    }
    candidates.set(word.id, indices.map(i => occurrences[Number(i)].id));
  }
  const claims = new Map<string, number>();
  for (const ids of candidates.values()) for (const id of ids) claims.set(id, (claims.get(id) ?? 0) + 1);
  for (const [sourceId, ids] of candidates) {
    if (ids.some(id => claims.get(id) !== 1)) {
      view.issues.push(`${sourceId}: overlapping English assignments require review.`);
      continue;
    }
    view.groups[sourceId] = ids;
    for (const id of ids) occurrences[Number(id.slice(1))].sourceId = sourceId;
  }
  view.unassigned = occurrences.filter(o => !o.sourceId).map(o => o.id);
  if (proposal && singleVerse && !view.issues.length && !view.unassigned.length) view.review = { rationale: proposal.rationale, evidence: proposal.evidence };
  return view;
}

export function buildEnglishViews(model: StreamModel, expectations?: VerseExpectations): EnglishViews {
  return Object.fromEntries(Object.entries(expectations?.english ?? {}).filter(([, unit]) => unit?.english).map(([column, unit]) => [column, buildEnglishView(model.reference, model.columns[column as StreamKey], unit!)]));
}

export function groupedEnglish(view: EnglishView, sourceId: string): string {
  return (view.groups[sourceId] ?? []).map(id => view.occurrences[Number(id.slice(1))].text).join('');
}
