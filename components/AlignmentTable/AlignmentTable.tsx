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
  { key: 'papyrus',   label: 'Earliest Papyri', date: 'c. 125–250 CE',    script: 'Greek',   glossSource: 'TAGNT'      },
  { key: 'vaticanus', label: 'Vaticanus',         date: 'c. 325 CE',        script: 'Greek',   glossSource: 'TAGNT'      },
  { key: 'bezae',     label: 'Bezae',              date: 'c. 400 CE',        script: 'Gk · Lat', glossSource: null        },
  { key: 'vulgate',   label: 'Vulgate',            date: 'c. 400 CE',        script: 'Latin',   glossSource: 'Whitaker'  },
  { key: 'peshitta',  label: 'Peshitta',           date: 'c. 400–450 CE',   script: 'Syriac',  glossSource: 'PayneSmith'},
  { key: 'byzantine', label: 'Byzantine',          date: 'c. 5th–9th c.',   script: 'Greek',   glossSource: 'TAGNT'     },
];

const SINAITICUS_COL: ColumnDef = {
  key: 'sinaiticus', label: 'Sinaiticus', date: 'c. 350 CE', script: 'Greek', glossSource: 'TAGNT',
};

type TraditionDef = {
  label: string;
  getSpan: (showSinaiticus: boolean) => number;
  hasToggle?: true;
};

const TRADITIONS: TraditionDef[] = [
  { label: 'Greek Papyri', getSpan: () => 3 },
  { label: 'Alexandrian',  getSpan: (s) => (s ? 6 : 3), hasToggle: true },
  { label: 'Western',      getSpan: () => 3 },
  { label: 'Latin',        getSpan: () => 3 },
  { label: 'Syriac',       getSpan: () => 3 },
  { label: 'Byzantine',    getSpan: () => 3 },
];

export function AlignmentTable({ data, nextFragment, nextFragmentHref }: Props) {
  const [showSinaiticus, setShowSinaiticus] = useState(false);

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

          {/* Row 2 — Witness names, dates, scripts, sources (collapsed to one info line) */}
          <tr className="bg-witness-band text-ink-on-band">
            {columns.map((col) => {
              const source = col.key === 'bezae' ? 'Greek · Latin' : col.glossSource;
              return (
                <th
                  key={col.key}
                  colSpan={3}
                  className="py-2 text-sm font-semibold uppercase tracking-wide"
                >
                  <div className="flex items-start">
                    {/* Left: name + single collapsed info line */}
                    <div className="w-[45%] text-right pr-2">
                      {col.key === 'papyrus' ? (
                        <Link
                          href="/papyrus-map"
                          className="font-semibold hover:text-amber-200 transition-colors underline underline-offset-2 decoration-amber-200/40"
                        >
                          {col.label}
                        </Link>
                      ) : (
                        <div className="font-semibold">{col.label}</div>
                      )}
                      <div className="font-normal text-ink-on-band-muted text-xs mt-0.5">
                        {col.key === 'bezae'
                          ? `${col.date} · Greek · Latin`
                          : `${col.date} · ${col.script}${source ? ` · ${source}` : ''}`}
                      </div>
                    </div>

                    <div className="w-[10%]" />

                    {/* Right: papyrus map link + next fragment */}
                    <div className="w-[45%] pl-2 flex flex-col gap-0.5">
                      {col.key === 'papyrus' && (
                        <Link
                          href="/papyrus-map"
                          className="font-normal normal-case tracking-normal text-[10px] text-amber-200/80 hover:text-amber-200 transition-colors underline underline-offset-2 decoration-amber-200/40"
                        >
                          ← 65 Papyri map
                        </Link>
                      )}
                      {col.key === 'papyrus' && nextFragment && (
                        <div className="font-normal normal-case tracking-normal text-[10px] text-amber-200/80">
                          {nextFragmentHref ? (
                            <Link
                              href={nextFragmentHref}
                              className="underline underline-offset-2 decoration-amber-200/40 hover:text-amber-200 transition-colors"
                            >
                              {nextFragment}
                            </Link>
                          ) : (
                            nextFragment
                          )}
                        </div>
                      )}
                    </div>
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
      </table>
    </div>
  );
}
