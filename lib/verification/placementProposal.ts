import { createHash } from 'node:crypto';

/** The caller supplies these banks in their authoritative reading order, never
 * from model output. Both sequences and every occurrence's wording are fixed. */
export type PlacementPacket = {
  reference: string;
  column: string;
  sourceAuthority: string;
  englishAuthority: string;
  translationReferences?: readonly string[];
  source: ReadonlyArray<{ id: string; text: string; provenance?: unknown }>;
  english: ReadonlyArray<{ id: string; text: string }>;
  current: ReadonlyArray<{ sourceId: string; englishIds: readonly string[] }>;
};
export type PlacementProposal = {
  packetSha256: string;
  assignments: Array<{ sourceId: string; englishIds: string[] }>;
  evidence: string[];
  rationale: string;
};
export function placementPacketHash(packet: PlacementPacket): string {
  return createHash('sha256').update(JSON.stringify(packet)).digest('hex');
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));

/** Validates conservation, order and scope only. It never certifies a semantic judgment,
 * changes a corpus file, or accepts model-generated replacement text. */
export function validatePlacementProposal(packet: PlacementPacket, input: unknown, mode: 'translation-order' | 'follow-source' = 'translation-order'): { proposal?: PlacementProposal; errors: string[] } {
  const errors: string[] = [];
  if (!object(input) || !exactKeys(input, ['packetSha256', 'assignments', 'evidence', 'rationale'])) return { errors: ['Only a packet hash, occurrence assignments, evidence and rationale are accepted.'] };
  if (input.packetSha256 !== placementPacketHash(packet)) errors.push('The proposal is stale or belongs to another source, translation, verse or column.');
  const sourceIds = new Set(packet.source.map(w => w.id)), englishIds = new Set(packet.english.map(w => w.id));
  if (sourceIds.size !== packet.source.length || englishIds.size !== packet.english.length) errors.push('Authoritative occurrence IDs are not unique.');
  if (!Array.isArray(input.evidence) || !input.evidence.length || input.evidence.some(x => typeof x !== 'string' || !x.trim())) errors.push('Cited placement evidence is required.');
  if (typeof input.rationale !== 'string' || !input.rationale.trim()) errors.push('A placement rationale is required.');
  if (!Array.isArray(input.assignments)) return { errors: [...errors, 'Assignments must be an array.'] };
  const sources = new Set<string>(), english = new Set<string>();
  const proposedEnglish: string[] = [];
  for (const [position, assignment] of input.assignments.entries()) {
    if (!object(assignment) || !exactKeys(assignment, ['sourceId', 'englishIds']) || typeof assignment.sourceId !== 'string' || !Array.isArray(assignment.englishIds)) {
      errors.push('Assignments may contain only an existing source occurrence ID and English occurrence IDs.'); continue;
    }
    if (!sourceIds.has(assignment.sourceId) || sources.has(assignment.sourceId)) errors.push('Unknown or repeated source occurrence.');
    if (assignment.sourceId !== packet.source[position]?.id) errors.push('Source occurrences must remain in their authoritative order.');
    sources.add(assignment.sourceId);
    const positions = assignment.englishIds.map(id => packet.english.findIndex(w => w.id === id));
    if (positions.some((position, i) => i > 0 && position !== positions[i - 1] + 1)) errors.push('English phrases must retain their contiguous internal occurrence order.');
    for (const id of assignment.englishIds) {
      if (typeof id !== 'string' || !englishIds.has(id) || english.has(id)) errors.push('Unknown or repeated English occurrence.');
      else { english.add(id); proposedEnglish.push(id); }
    }
  }
  if (sources.size !== sourceIds.size) errors.push('Every source occurrence must remain represented, including those with no English allocation.');
  if (english.size !== englishIds.size) errors.push('Every English occurrence must be preserved exactly once.');
  // The caller, never the proposal, chooses the display policy. Follow-source
  // may place intact English phrases beside differently ordered source words;
  // the canonical English bank and translation-order view remain untouched.
  if (mode === 'translation-order' && (proposedEnglish.length !== packet.english.length || proposedEnglish.some((id, i) => id !== packet.english[i].id))) {
    errors.push('English grouping must preserve the scholarly translation’s complete occurrence order.');
  }
  if (errors.length) return { errors };
  // Return an independent, index-only record; source and English banks remain untouched.
  return { proposal: structuredClone(input) as PlacementProposal, errors: [] };
}
