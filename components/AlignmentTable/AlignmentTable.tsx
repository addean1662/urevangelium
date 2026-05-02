import type { VerseData } from '@/lib/types';
import { AlignmentRow } from './AlignmentRow';

interface Props {
  data: VerseData;
}

const COLUMNS = [
  { key: 'papyrus',    label: 'Earliest Papyrus', date: 'c. 125–250 CE', script: 'Greek' },
  { key: 'vaticanus',  label: 'Vaticanus',         date: 'c. 325 CE',     script: 'Greek' },
  { key: 'sinaiticus', label: 'Sinaiticus',         date: 'c. 350 CE',     script: 'Greek' },
  { key: 'vulgate',    label: 'Vulgate',            date: 'c. 400 CE',     script: 'Latin' },
  { key: 'peshitta',   label: 'Peshitta',           date: 'c. 400–450 CE', script: 'Syriac' },
  { key: 'byzantine',  label: 'Byzantine',          date: 'Medieval',      script: 'Greek' },
] as const;

export function AlignmentTable({ data }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left table-fixed min-w-[1440px]">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} style={{ width: `${100 / COLUMNS.length}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-stone-800 text-white">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide border-r border-stone-600 last:border-r-0"
              >
                <div className="font-semibold">{col.label}</div>
                <div className="font-normal text-stone-400 text-[10px] mt-0.5">
                  {col.date} · {col.script}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <AlignmentRow key={row.id} row={row} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
