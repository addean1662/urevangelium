import Link from 'next/link';
import type { VerseData } from '@/lib/types';
import { AlignmentRow } from './AlignmentRow';

interface Props {
  data: VerseData;
  nextFragment?: string | null;
  nextFragmentHref?: string | null;
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

export function AlignmentTable({ data, nextFragment, nextFragmentHref }: Props) {
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
                className="py-2 text-sm font-semibold uppercase tracking-wide h-px"
              >
                {/* Full-height flex column: label at top, date+glossSource row pinned to bottom */}
                <div className="flex flex-col h-full">
                  {/* Label row — spans full column width so long labels never wrap */}
                  <div className="text-right pr-2">
                    {col.key === 'papyrus' ? (
                      <Link
                        href="/papyrus-map"
                        className="hover:text-amber-200 transition-colors underline underline-offset-2 decoration-amber-200/40"
                      >
                        {col.label}
                      </Link>
                    ) : col.label}
                  </div>

                  {/* Spacer pushes the bottom row to the foot of the cell */}
                  <div className="flex-1" />

                  {/* Bottom row: date·script on left, glossSource on right — always at same Y */}
                  <div className="flex">
                    <div className="w-[45%] text-right pr-2 flex flex-col justify-end gap-0.5">
                      <div className="font-normal text-ink-on-band-muted text-xs">
                        {col.date} · {col.script}
                      </div>
                      {col.key === 'papyrus' && nextFragment && (
                        <div className="font-normal normal-case tracking-normal text-[10px] text-amber-200/80">
                          {nextFragmentHref ? (
                            <Link
                              href={nextFragmentHref}
                              className="underline underline-offset-2 decoration-amber-200/40 hover:text-amber-200 transition-colors"
                            >
                              {nextFragment}
                            </Link>
                          ) : nextFragment}
                        </div>
                      )}
                    </div>
                    <div className="w-[10%]" />
                    <div className="w-[45%] pl-2 flex flex-col justify-end gap-0.5">
                      <div className="font-normal text-ink-on-band-muted text-xs">{col.glossSource}</div>
                      {col.key === 'papyrus' && (
                        <Link
                          href="/papyrus-map"
                          className="font-normal normal-case tracking-normal text-[10px] text-amber-200/80 hover:text-amber-200 transition-colors underline underline-offset-2 decoration-amber-200/40"
                        >
                          ← 65 Papyri map
                        </Link>
                      )}
                    </div>
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
