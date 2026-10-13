import type { StreamKey, StreamModel } from '../alignment/streams';
import { buildEnglishView, buildEnglishViews, englishPlacementPacket, type EnglishViews } from '../alignment/englishPresentation';
import type { VerseExpectations } from './verifyVerse';
import { validatePlacementProposal } from './placementProposal';

/** Server-side boundary: review files may assign IDs, never replace text. A stale
 * or invalid review is reported and the original allocation remains inspectable. */
export function prepareEnglishViews(model: StreamModel, expectations: VerseExpectations | undefined, reviews: Record<string, Partial<Record<StreamKey, unknown>>>): EnglishViews {
  const views = buildEnglishViews(model, expectations);
  for (const [key, input] of Object.entries(reviews[model.reference] ?? {})) {
    const column = key as StreamKey, unit = expectations?.english[column];
    if (!unit) continue;
    const packet = englishPlacementPacket(model.reference, model.columns[column], unit, expectations?.sources[column]?.authority ?? 'unavailable');
    const result = validatePlacementProposal(packet, input, 'follow-source');
    views[column] = buildEnglishView(model.reference, model.columns[column], unit, result.proposal, result.errors.map(e => `Grouping review rejected: ${e}`));
  }
  return views;
}
