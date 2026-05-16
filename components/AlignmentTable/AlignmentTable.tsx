import type { VerseData } from '@/lib/types';
import { AlignmentRow } from './AlignmentRow';

interface Props {
  data: VerseData;
  nextFragment?: string | null;
}

const COLUMNS = [
  { key: 'papyrus',    label: 'Earliest Papyrus', date: 'c. 125–250 CE', script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'vaticanus',  label: 'Vaticanus',         date: 'c. 325 CE',     script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'sinaiticus', label: 'Sinaiticus',         date: 'c. 350 CE',     script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'vulgate',    label: 'Vulgate',            date: 'c. 400 CE',     script: 'Latin',  glossSource: 'Whitaker'   },
  { key: 'peshitta',   label: 'Peshitta',           date: 'c. 400–450 CE', script: 'Syriac', glossSource: 'PayneSmith' },
  { key: 'byzantine',  label: 'Byzantine',          date: 'c. 5th–9th c.', script: 'Greek',  glossSource: 'TAGNT'      },
] as const;

// Each witness: TEXT (45%) | DOT (10%) | GLOSS (45%) of its 1/6 share
const pairWidth = 100 / 6;
const textColWidth  = `${(pairWidth * 0.45).toFixed(4)}%`; // 7.5000%
const dotColWidth   = `${(pairWidth * 0.10).toFixed(4)}%`; // 1.6667%
const glossColWidth = `${(pairWidth * 0.45).toFixed(4)}%`; // 7.5000%

// Alternating tint on even-indexed pairs (Vaticanus, Vulgate, Byzantine).
// Requires <tr> to carry no background so <col> shows through.
const PAIR_BG = [
  'transparent',
  'rgba(250,246,232,0.8)',
  'transparent',
  'rgba(250,246,232,0.8)',
  'transparent',
  'rgba(250,246,232,0.8)',
] as const;

export function AlignmentTable({ data, nextFragment }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left table-fixed min-w-[1440px]">
        <colgroup>
          {COLUMNS.flatMap((col, i) => [
            <col key={`${col.key}-t`} style={{ width: textColWidth,  backgroundColor: PAIR_BG[i] }} />,
            <col key={`${col.key}-d`} style={{ width: dotColWidth,   backgroundColor: PAIR_BG[i] }} />,
            <col key={`${col.key}-g`} style={{ width: glossColWidth, backgroundColor: PAIR_BG[i] }} />,
          ])}
        </colgroup>

        <thead>
          {/* Primary header spans all 3 cells of its witness */}
          <tr className="bg-witness-band text-ink-on-band">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                colSpan={3}
                className="py-2 text-sm font-semibold uppercase tracking-wide"
              >
                <div className="flex">
                  {/* Cell-A portion: witness name + date, right-aligned above source text */}
                  <div className="w-[45%] text-right pr-2">
                    <div className="font-semibold">{col.label}</div>
                    <div className="font-normal text-ink-on-band-muted text-xs mt-0.5">
                      {col.date} · {col.script}
                    </div>
                    {col.key === 'papyrus' && nextFragment && (
                      <div className="font-normal normal-case tracking-normal text-[10px] mt-1 text-amber-200/80">
                        {nextFragment}
                      </div>
                    )}
                  </div>
                  {/* Cell-B portion: dot area spacer */}
                  <div className="w-[10%]" />
                  {/* Cell-C portion: gloss source, left-aligned, level with the date */}
                  <div className="w-[45%] pl-2 flex flex-col justify-end">
                    <div className="font-normal text-ink-on-band-muted text-xs">{col.glossSource}</div>
                  </div>
                </div>
              </th>
            ))}
          </tr>

        </thead>

        <tbody>
          {data.rows.map((row) => (
            <AlignmentRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
