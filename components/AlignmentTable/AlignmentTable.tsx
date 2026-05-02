'use client';

import { useState } from 'react';
import type { VerseData } from '@/lib/types';
import { AlignmentRow } from './AlignmentRow';
import { GlossToggle } from './GlossToggle';

interface Props {
  data: VerseData;
}

const COLUMNS = [
  { key: 'papyrus',    label: 'Earliest Papyrus', date: 'c. 125–250 CE', script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'vaticanus',  label: 'Vaticanus',         date: 'c. 325 CE',     script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'sinaiticus', label: 'Sinaiticus',         date: 'c. 350 CE',     script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'vulgate',    label: 'Vulgate',            date: 'c. 400 CE',     script: 'Latin',  glossSource: 'Whitaker'   },
  { key: 'peshitta',   label: 'Peshitta',           date: 'c. 400–450 CE', script: 'Syriac', glossSource: 'PayneSmith' },
  { key: 'byzantine',  label: 'Byzantine',          date: 'Medieval',      script: 'Greek',  glossSource: 'TAGNT'      },
] as const;

export function AlignmentTable({ data }: Props) {
  const [showGlosses, setShowGlosses] = useState(false);

  const totalCols = showGlosses ? 12 : 6;
  const colWidth = `${(100 / totalCols).toFixed(4)}%`;

  return (
    <div>
      <div className="px-4 py-2 flex items-center justify-end border-b border-stone-200 bg-stone-50">
        <GlossToggle showGlosses={showGlosses} onToggle={() => setShowGlosses((v) => !v)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left table-fixed min-w-[1440px]">
          <colgroup>
            {COLUMNS.flatMap((col) =>
              showGlosses
                ? [
                    <col key={`${col.key}-t`} style={{ width: colWidth }} />,
                    <col key={`${col.key}-g`} style={{ width: colWidth }} />,
                  ]
                : [<col key={col.key} style={{ width: colWidth }} />]
            )}
          </colgroup>

          <thead>
            {/* Primary header — witness name, always 1 or 2 col wide */}
            <tr className="bg-stone-800 text-white">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  colSpan={showGlosses ? 2 : 1}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wide border-r border-stone-600 last:border-r-0"
                >
                  <div className="font-semibold">{col.label}</div>
                  <div className="font-normal text-stone-400 text-[10px] mt-0.5">
                    {col.date} · {col.script}
                  </div>
                </th>
              ))}
            </tr>

            {/* Sub-header — TEXT / GLOSS labels with lexicon name */}
            {showGlosses && (
              <tr className="bg-stone-700 text-stone-300 text-[10px] uppercase tracking-wide">
                {COLUMNS.flatMap((col) => [
                  <th
                    key={`${col.key}-text-sub`}
                    className="px-3 py-1 font-normal border-r border-stone-600"
                  >
                    Text
                  </th>,
                  <th
                    key={`${col.key}-gloss-sub`}
                    className="px-3 py-1 font-normal border-r border-stone-600 last:border-r-0 italic"
                  >
                    Gloss · {col.glossSource}
                  </th>,
                ])}
              </tr>
            )}
          </thead>

          <tbody>
            {data.rows.map((row, i) => (
              <AlignmentRow key={row.id} row={row} index={i} showGlosses={showGlosses} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
