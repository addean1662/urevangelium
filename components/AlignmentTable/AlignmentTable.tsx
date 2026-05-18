'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { VerseData } from '@/lib/types';
import { AlignmentRow } from './AlignmentRow';

interface Props {
  data: VerseData;
  nextFragment?: string | null;
  nextFragmentHref?: string | null;
}

type ColumnDef = {
  key: string;
  label: string;
  date: string;
  script: string;
  glossSource: string | null;
};

const BASE_COLUMNS: ColumnDef[] = [
  { key: 'papyrus',   label: 'Earliest Papyri',              date: 'c. 125–250 CE',  script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'vaticanus', label: 'Vaticanus',                     date: 'c. 325 CE',       script: 'Greek',  glossSource: 'TAGNT'      },
  { key: 'bezae',     label: 'Bezae',                         date: 'c. 400 CE',       script: 'Greek',  glossSource: null         },
  { key: 'vulgate',   label: 'Vulgate',                       date: 'c. 400 CE',       script: 'Latin',  glossSource: 'Whitaker'   },
  { key: 'peshitta',  label: 'Peshitta',                      date: 'c. 400–450 CE',  script: 'Syriac', glossSource: 'PayneSmith' },
  { key: 'byzantine', label: 'Byzantine',                     date: 'c. 5th–9th c.',  script: 'Greek',  glossSource: 'TAGNT'      },
];

const SINAITICUS_COL: ColumnDef = {
  key: 'sinaiticus', label: 'Sinaiticus', date: 'c. 350 CE', script: 'Greek', glossSource: 'TAGNT',
};

// Major Bezae lacunae (physical damage) — single-verse scribal omissions are not noted.
const BEZAE_LACUNAE: Array<{
  gospel: string; sc: number; sv: number; ec: number; ev: number;
  note: string; href: string;
}> = [
  { gospel: 'matthew', sc: 1,  sv: 1,  ec: 1,  ev: 19, note: 'Begins at 1:20',   href: '/matthew/1/20'  },
  { gospel: 'matthew', sc: 6,  sv: 21, ec: 9,  ev: 1,  note: 'Resumes at 9:2',   href: '/matthew/9/2'   },
  { gospel: 'matthew', sc: 27, sv: 3,  ec: 27, ev: 11, note: 'Resumes at 27:12', href: '/matthew/27/12' },
  { gospel: 'luke',    sc: 3,  sv: 24, ec: 3,  ev: 31, note: 'Resumes at 3:32',  href: '/luke/3/32'     },
  { gospel: 'john',    sc: 1,  sv: 17, ec: 3,  ev: 25, note: 'Resumes at 3:26',  href: '/john/3/26'     },
];

function getBezaeLacuna(gospel: string, ch: number, v: number): { note: string; href: string } | null {
  const cur = ch * 1000 + v;
  for (const r of BEZAE_LACUNAE) {
    if (gospel !== r.gospel) continue;
    if (cur >= r.sc * 1000 + r.sv && cur <= r.ec * 1000 + r.ev)
      return { note: r.note, href: r.href };
  }
  return null;
}

type TraditionDef = {
  label: string;
  getSpan: (showSinaiticus: boolean) => number;
  hasToggle?: true;
};

const TRADITIONS: TraditionDef[] = [
  { label: '65 Earliest Papyrus Witnesses', getSpan: () => 3 },
  { label: 'Alexandrian',  getSpan: (s) => (s ? 6 : 3), hasToggle: true },
  { label: 'Western',      getSpan: () => 3 },
  { label: 'Latin',        getSpan: () => 3 },
  { label: 'Syriac',       getSpan: () => 3 },
  { label: 'Byzantine',    getSpan: () => 3 },
];

export function AlignmentTable({ data, nextFragment, nextFragmentHref }: Props) {
  const [showSinaiticus, setShowSinaiticus] = useState(false);

  const bezaeLacuna = getBezaeLacuna(data.gospel, data.chapter, data.verse);

  const columns: ColumnDef[] = showSinaiticus
    ? [BASE_COLUMNS[0], BASE_COLUMNS[1], SINAITICUS_COL, ...BASE_COLUMNS.slice(2)]
    : [...BASE_COLUMNS];

  const witnessCount = columns.length;
  const pairWidth = 100 / witnessCount;
  const textW  = `${(pairWidth * 0.45).toFixed(4)}%`;
  const dotW   = `${(pairWidth * 0.10).toFixed(4)}%`;
  const glossW = `${(pairWidth * 0.45).toFixed(4)}%`;

  function pairBg(i: number) {
    return i % 2 === 1 ? 'rgba(250,246,232,0.8)' : 'transparent';
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left table-fixed"
        style={{ minWidth: showSinaiticus ? '1680px' : '1440px' }}
      >
        <colgroup>
          {columns.map((col, i) => [
            <col key={`${col.key}-t`} style={{ width: textW,  backgroundColor: pairBg(i) }} />,
            <col key={`${col.key}-d`} style={{ width: dotW,   backgroundColor: pairBg(i) }} />,
            <col key={`${col.key}-g`} style={{ width: glossW, backgroundColor: pairBg(i) }} />,
          ])}
        </colgroup>

        <thead>
          {/* Row 1 — Tradition labels with Sinaiticus toggle */}
          <tr className="bg-band text-ink-on-band-muted">
            {TRADITIONS.map((t) => (
              <th
                key={t.label}
                colSpan={t.getSpan(showSinaiticus)}
                className="py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-center border-b border-witness-band/50"
              >
                {t.label}
                {t.hasToggle && (
                  <button
                    onClick={() => setShowSinaiticus(!showSinaiticus)}
                    className="ml-2 px-1.5 py-0.5 rounded border border-ink-on-band-muted/30 text-ink-on-band-muted hover:border-ink-on-band hover:text-ink-on-band transition-colors normal-case tracking-normal font-normal text-[10px]"
                    aria-label={showSinaiticus ? 'Hide Sinaiticus' : 'Show Sinaiticus'}
                  >
                    {showSinaiticus ? '− Sinaiticus' : '+ Sinaiticus'}
                  </button>
                )}
              </th>
            ))}
          </tr>

          {/* Row 2 — Witness names, dates, scripts, sources */}
          <tr className="bg-witness-band text-ink-on-band">
            {columns.map((col) => {
              const rightLabel = col.key === 'bezae' ? 'Latin' : col.glossSource;
              return (
                <th
                  key={col.key}
                  colSpan={3}
                  className="py-2 text-sm font-semibold uppercase tracking-wide align-bottom"
                >
                  {/* Name line */}
                  <div className="flex">
                    <div className="w-[45%] text-right pr-2">{col.label}</div>
                    <div className="w-[10%]" />
                    <div className="w-[45%] pl-2" />
                  </div>
                  {/* Date · Script | Gloss — pinned to same baseline across all columns */}
                  <div className="flex mt-0.5 font-normal normal-case tracking-normal text-xs text-ink-on-band-muted">
                    <div className="w-[45%] text-right pr-2">{`${col.date} · ${col.script}`}</div>
                    <div className="w-[10%]" />
                    <div className="w-[45%] pl-2">{rightLabel ?? ''}</div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {data.rows.map((row) => (
            <AlignmentRow key={row.id} row={row} showSinaiticus={showSinaiticus} />
          ))}
        </tbody>

        {(nextFragment || bezaeLacuna) && (() => {
          const bezaeIdx = columns.findIndex(c => c.key === 'bezae');
          // gap between papyrus dot+gloss and bezae text col = vaticanus [+ sinaiticus]
          const midCols = bezaeIdx * 3 - 3;
          const bezaeTrailCols = columns.length * 3 - bezaeIdx * 3 - 3;
          const btnClass = 'inline-block px-4 py-1.5 text-sm font-semibold border-2 border-ink-primary text-ink-primary rounded hover:bg-ink-primary hover:text-ink-on-band transition-colors';
          return (
            <tfoot>
              <tr>
                {/* Papyrus dot column */}
                <td />
                <td colSpan={2} className="pt-2 pb-1">
                  {nextFragment && (
                    nextFragmentHref
                      ? <Link href={nextFragmentHref} className={btnClass}>{nextFragment}</Link>
                      : <span className={btnClass}>{nextFragment}</span>
                  )}
                </td>
                {/* Vaticanus [+ Sinaiticus] gap */}
                <td colSpan={midCols} />
                {/* Bezae dot column */}
                <td />
                <td colSpan={2} className="pt-2 pb-1">
                  {bezaeLacuna && (
                    <Link href={bezaeLacuna.href} className={btnClass}>{bezaeLacuna.note}</Link>
                  )}
                </td>
                <td colSpan={bezaeTrailCols} />
              </tr>
            </tfoot>
          );
        })()}

      </table>
    </div>
  );
}
