import type { PapyrusCell as PapyrusCellType } from '@/lib/types';
import { transliterateGreek } from '@/lib/transliteration/greek';
import { NominaSacra } from './NominaSacra';
import { HoverTooltip } from '@/components/HoverTooltip';
import { papyrusCharacters, papyrusConflictNotes, type PapyrusWitnessLabel } from '@/lib/alignment/papyrusPresentation';
import type { SourceExpectation } from '@/lib/verification/verifyVerse';

interface Props {
  cell: PapyrusCellType;
  conflicts?: SourceExpectation['conflicts'];
  columnWitness?: string;
  witnessLabels?: readonly PapyrusWitnessLabel[];
}

export function PapyrusCell({ cell, conflicts, columnWitness, witnessLabels }: Props) {
  const base = 'px-2 py-1.5 text-lg border-b border-rule-hairline align-middle text-right text-ink-primary font-greek';

  if (cell.type === 'lost') {
    return (
      <td className={base}>
        <HoverTooltip content={cell.editorialNotes?.join(' ')}><span className="text-xs italic text-semantic-lacuna">lost</span></HoverTooltip>
      </td>
    );
  }
  if (cell.type === 'empty') {
    return <td className={`${base} text-ink-muted`}>—</td>;
  }
  // Lacuna: empty — dot indicator lives in IndicatorCell (Cell B)
  if (cell.type === 'lacuna') {
    return <td className={base} />;
  }

  const characters = papyrusCharacters(cell);
  const decorated = characters ? <span data-papyrus-text>{characters.map((character, index) => character.state === 'unmarked' && !character.sourceGlyph ? character.text : <span key={index}
    data-papyrus-character={character.state}
    className={character.state === 'damaged' ? 'border-b border-dotted border-semantic-damaged bg-accent-gold/15' : character.state === 'missing' ? 'font-semibold text-semantic-damaged' : undefined}
    title={character.state === 'missing' ? 'Missing character in CNTR; the proposed letter is withheld.' : character.state === 'damaged' ? 'CNTR records damaged character traces; this reading is not independently image-certified.' : character.sourceGlyph ? `CNTR glyph ${character.sourceGlyph} is expanded to ${character.text} by the declared display convention.` : undefined}>{character.text}</span>)}</span> : cell.text;
  const textContent = cell.nominaSacra ? <NominaSacra ns={cell.nominaSacra}>{cell.nominaSacra.contraction === cell.text ? decorated : undefined}</NominaSacra> : decorated;
  const conflictNotes = papyrusConflictNotes(cell, conflicts);
  const sourceText = cell.nominaSacra?.expansion ?? cell.text;
  const translit = transliterateGreek(sourceText);
  const tip = cell.editorialNotes?.length ? cell.editorialNotes.join(' ') : translit ? <em>{translit}</em> : null;

  const sourceLabel = cell.fragments.map(f => f.id).join(' · ');

  return (
    <td className={base}>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex w-full flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
          {Boolean(witnessLabels?.length) && <span className="mr-auto flex flex-wrap gap-x-1 text-left font-sans text-xs font-semibold">
            {witnessLabels!.map(label => <span key={label.id} data-papyrus-word-witness className={label.color} title={`Source attribution from this word: ${sourceLabel}`}>{label.id}</span>)}
          </span>}
          {cell.condition?.partial && <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-damaged">partial</span>}
          {cell.condition?.manuscriptStatus === 'scribal-error-question' ? (
            <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-lacuna" aria-label="Source-recorded first-hand false start deleted by correction">
              scribal error?
            </span>
          ) : null}
          {cell.condition?.damaged ? (
            cell.condition.sourceImageUrl ? (
              <a
                href={cell.condition.sourceImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-damaged underline decoration-current/40 underline-offset-2 hover:decoration-current"
                aria-label="CNTR records damaged character traces; open a free image of this passage"
              >
                damaged
              </a>
            ) : (
              <span className="whitespace-nowrap font-sans text-[10px] font-semibold leading-none text-semantic-damaged" aria-label="CNTR records damaged character traces">
                damaged
              </span>
            )
          ) : null}
          <HoverTooltip content={tip}>{textContent}</HoverTooltip>
        </div>
        {conflictNotes.length > 0 && <abbr data-papyrus-conflict title={conflictNotes.join(' ')} aria-label={`Source conflict: ${conflictNotes.join(' ')}`} className="cursor-help font-sans text-[10px] font-semibold text-semantic-damaged decoration-dotted">source conflict</abbr>}
        {witnessLabels === undefined && !(cell.fragments.length === 1 && cell.fragments[0].id === columnWitness) && <span data-papyrus-word-witness className="text-[10px] leading-none font-sans text-ink-muted tracking-wide">
          {sourceLabel}
        </span>}
      </div>
    </td>
  );
}
