import type { GlossCell, PapyrusCell } from '../types';
import type { SourceExpectation } from '../verification/verifyVerse';
import { papyrusDisplayText } from '../sources/papyrusEvidence.mjs';

type Character = { text: string; state: 'unmarked' | 'damaged' | 'missing'; sourceGlyph?: string };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};

/** A shared attribution is safe only when every displayed word names one identical witness. */
export function singlePapyrusWitness(cells: readonly (PapyrusCell | undefined)[]): string | undefined {
  let witness: string | undefined;
  for (const cell of cells) {
    if (cell?.type !== 'extant') continue;
    if (cell.fragments.length !== 1) return undefined;
    const id = cell.fragments[0].id;
    if (witness && witness !== id) return undefined;
    witness = id;
  }
  return witness;
}

export type PapyrusWitnessLabel = { id: string; color: string };
const WITNESS_COLORS = ['text-sky-800', 'text-violet-800', 'text-teal-800', 'text-fuchsia-800', 'text-indigo-800', 'text-cyan-800'];

/** Label the start of each attribution run, including a return to an earlier witness. */
export function papyrusRunLabels(cells: readonly (PapyrusCell | undefined)[]): PapyrusWitnessLabel[][] {
  if (singlePapyrusWitness(cells)) return cells.map(() => []);
  const witnesses = [...new Set(cells.flatMap(cell => cell?.type === 'extant' ? cell.fragments.map(f => f.id) : []))];
  const colors = new Map(witnesses.map((id, i) => [id, WITNESS_COLORS[i % WITNESS_COLORS.length]]));
  let previous = '';
  return cells.map(cell => {
    if (cell?.type !== 'extant') return [];
    const ids = [...new Set(cell.fragments.map(f => f.id))];
    const signature = [...ids].sort().join('|');
    if (signature === previous) return [];
    previous = signature;
    return ids.map(id => ({ id, color: colors.get(id)! }));
  });
}

function governingAttestations(cell: PapyrusCell) {
  const provenance = record('provenance' in cell ? cell.provenance : undefined);
  const attestations = provenance.sourceAttestations;
  return Array.isArray(attestations) ? attestations.map(record).filter(a => a.siglum === provenance.governingSiglum).sort((a, b) => Number(a.sourceToken) - Number(b.sourceToken)) : [];
}

/** Decorate the already admitted string. Never add a proposed missing letter or
 * use conditions belonging to a different witness, reading or display projection. */
export function papyrusCharacters(cell: PapyrusCell): Character[] | undefined {
  if (cell.type !== 'extant') return undefined;
  const attestations = governingAttestations(cell);
  if (!attestations.length) return undefined;
  const characters: Character[] = [];
  for (const [i, attestation] of attestations.entries()) {
    if (i) characters.push({ text: ' ', state: 'unmarked' });
    if (attestation.evidenceStatus === 'fully-supplied') {
      characters.push({ text: '···', state: 'missing' });
      continue;
    }
    if (typeof attestation.diplomatic !== 'string' || !Array.isArray(attestation.conditions)) return undefined;
    const conditions = attestation.conditions.map(record);
    for (const [position, glyph] of [...attestation.diplomatic].entries()) {
      const marks = conditions.filter(c => c.after === position + 1);
      const state = marks.some(c => c.kind === 'missing') ? 'missing' : marks.some(c => c.kind === 'damaged') ? 'damaged' : 'unmarked';
      const text = state === 'missing' ? '·' : papyrusDisplayText(glyph);
      characters.push({ text, state, ...(state !== 'missing' && text !== glyph ? { sourceGlyph: glyph } : {}) });
    }
  }
  return characters.map(c => c.text).join('') === cell.text ? characters : undefined;
}

export function papyrusConflictNotes(cell: PapyrusCell, conflicts: SourceExpectation['conflicts'] = []): string[] {
  const attestations = governingAttestations(cell);
  return conflicts.filter(c => attestations.some(a => a.siglum === c.witness && a.sourceToken === c.sourceToken)).map(c =>
    `${c.witness}, source word ${c.sourceToken}: CNTR displays ${c.cntr || 'no admitted letters'}; INTF marks the surviving-letter projection as ${c.intf}. Dots replace editorially supplied letters. Manuscript-image adjudication is pending.`);
}

/** Display an existing scholarly gloss of a proposed reading separately from
 * attested-word English. This never fills Greek gaps or admits a lost word. */
export function papyrusEnglish(cell: PapyrusCell | undefined): GlossCell | undefined {
  if (cell?.type !== 'extant') return undefined;
  if (cell.gloss) return cell.gloss;
  const provenance = record(cell.provenance), archive = record(provenance.archivalGloss);
  if (!cell.condition?.partial || provenance.attestationPolicy !== 'surviving-papyrus-evidence-v1'
    || provenance.evidenceStatus !== 'partial' || archive.source !== 'TAGNT'
    || typeof archive.gloss !== 'string' || !archive.gloss.trim()
    || archive.generated || archive.experimental || archive.automaticAnnotation
    || typeof provenance.archivalGlossReading !== 'string' || typeof provenance.diplomatic !== 'string') return undefined;
  const normalize = (text: string) => papyrusDisplayText(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('ς', 'σ');
  if (normalize(provenance.archivalGlossReading) !== normalize(provenance.diplomatic)) return undefined;
  const characters = papyrusCharacters(cell);
  if (!characters?.some(c => c.state === 'missing') || !characters.some(c => c.state !== 'missing' && /\p{L}/u.test(c.text))) return undefined;
  const reading = papyrusDisplayText(provenance.diplomatic);
  return {
    gloss: archive.gloss, source: 'TAGNT', proposedReading: reading,
    tooltip: `TAGNT English for the proposed reading ${reading}. Only part of the Greek survives; missing letters remain gaps. This does not certify the restoration or manuscript image.${typeof archive.tooltip === 'string' ? ` ${archive.tooltip}` : ''}`,
  };
}
