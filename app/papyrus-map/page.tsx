import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { loadPapyrusMap } from '@/lib/papyrusMap';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';

export const metadata = {
  title: 'Earliest Papyrus Witnesses — Urevangelium',
  description: 'A complete map of all 65 papyrus manuscript witnesses across the four Gospels, with verse coverage and CNTR transcription status.',
};

const GOSPEL_DISPLAY: Record<Gospel, string> = {
  matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John',
};
const GOSPEL_ABBR: Record<Gospel, string> = {
  matthew: 'Mt', mark: 'Mk', luke: 'Lk', john: 'Jn',
};
const GOSPEL_COLOR: Record<Gospel, string> = {
  matthew: '#8B4423',
  mark:    '#6B8C45',
  luke:    '#B8893A',
  john:    '#4D5560',
};

function papyrusLabel(siglum: string): string {
  if (siglum.includes('+')) {
    const nums = siglum.split('+').map(s => s.replace(/^P/, ''));
    return `Papyri ${nums.join('+')}`;
  }
  return `Papyrus ${siglum.replace(/^P/, '')}`;
}

function dotColor(gospels: Gospel[]): string {
  if (gospels.length > 1) return '#B8893A'; // gold = multi-gospel
  if (gospels.length === 1) return GOSPEL_COLOR[gospels[0]];
  return '#C4B89E';
}

// Empty spacer bubbles prepended before chapter indicators so the label
// text never visually collides with the first real bubble regardless of
// how the browser renders proportional uppercase text.
const LEADING_BUBBLES: Record<string, number> = {
  matthew: 1,
  mark:    4,
  luke:    4,
  john:    4,
};

function CoverageBar({
  chaptersTotal, coveredChapters, color, gospel,
}: {
  chaptersTotal: number;
  coveredChapters: Set<number> | undefined;
  color: string;
  gospel: string;
}) {
  const hasCoverage = coveredChapters && coveredChapters.size > 0;
  const leading = LEADING_BUBBLES[gospel] ?? 2;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-widest shrink-0 text-ink-secondary w-16">{gospel}</span>
      <div className="flex gap-px h-3.5">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`sp-${i}`} className="h-full rounded-sm" style={{ width: '7px' }} />
        ))}
        {Array.from({ length: chaptersTotal }, (_, i) => i + 1).map(ch => (
          <div
            key={ch}
            className="h-full rounded-sm"
            style={{
              width: '7px',
              backgroundColor: hasCoverage && coveredChapters!.has(ch) ? color : 'rgba(0,0,0,0.06)',
            }}
            title={`${GOSPEL_DISPLAY[gospel as Gospel]} ch. ${ch}${coveredChapters?.has(ch) ? ' — covered' : ''}`}
          />
        ))}
      </div>
      {hasCoverage && (
        <span className="text-[11px] text-ink-secondary ml-1">{coveredChapters!.size}ch</span>
      )}
    </div>
  );
}

export default function PapyrusMapPage() {
  const { papyri, totalCitations, gospelTotals, chapterCount } = loadPapyrusMap();

  const cntCount  = papyri.filter(p => p.hasCNTR).length;
  const stubCount = papyri.length - cntCount;

  // ── Century grouping (primary = chronological) ──────────────────────────
  function centuryLabel(date: string): string {
    const m = date.match(/(\d{3,4})/);
    if (!m) return 'Unknown';
    const y = parseInt(m[1]);
    if (y <= 175) return '2nd century CE';
    if (y <= 300) return '3rd century CE';
    if (y <= 400) return '4th century CE';
    if (y <= 500) return '5th century CE';
    if (y <= 600) return '6th century CE';
    return '7th century CE';
  }

  const ERA_ORDER = [
    '2nd century CE',
    '3rd century CE',
    '4th century CE',
    '5th century CE',
    '6th century CE',
    '7th century CE',
  ];

  const grouped = new Map<string, typeof papyri>();
  for (const p of papyri) {
    const c = centuryLabel(p.date);
    if (!grouped.has(c)) grouped.set(c, []);
    grouped.get(c)!.push(p);
  }

  // ── SVG Timeline layout ─────────────────────────────────────────────────
  const TL_LEFT  = 50;
  const TL_RIGHT = 860;
  const TL_W     = TL_RIGHT - TL_LEFT;   // 810
  const TL_BAR_Y = 62;
  const TL_START = 100;
  const TL_END   = 750;
  const TL_RANGE = TL_END - TL_START;    // 650

  function dateYear(date: string): number {
    const m = date.match(/\d{3,4}/);
    return m ? parseInt(m[0]) : 400;
  }
  function xForYear(y: number): number {
    return TL_LEFT + ((y - TL_START) / TL_RANGE) * TL_W;
  }

  // Assign each papyrus to a stagger lane (0 = closest to bar)
  const LANES      = 5;
  const MIN_GAP    = 16;  // px minimum between dot centres in same lane
  const laneLastX  = new Array(LANES).fill(-999);
  const LANE_Y     = [50, 38, 26, 14, 5]; // y positions per lane (above bar)

  const tlPoints = papyri.map(p => {
    const year  = dateYear(p.date);
    const x     = xForYear(year);
    const r     = p.verseCount > 200 ? 6 : p.verseCount > 30 ? 5 : 4;
    const color = dotColor(p.gospels);

    let lane = LANES - 1;
    for (let l = 0; l < LANES; l++) {
      if (x - laneLastX[l] >= MIN_GAP) { lane = l; break; }
    }
    laneLastX[lane] = x;

    return { siglum: p.siglum, x, y: LANE_Y[lane], r, color, year, date: p.date, verseCount: p.verseCount };
  });

  const CENTURY_TICKS = [200, 300, 400, 500, 600, 700];

  // ── Chapter-range helper ────────────────────────────────────────────────
  function verseRangeStr(p: typeof papyri[0], gospel: Gospel): string {
    const chs = p.chaptersCovered[gospel];
    if (!chs || chs.size === 0) return '';
    const sorted = [...chs].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0], prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
      ranges.push(start === prev ? `ch. ${start}` : `ch. ${start}–${prev}`);
      start = prev = sorted[i];
    }
    ranges.push(start === prev ? `ch. ${start}` : `ch. ${start}–${prev}`);
    return ranges.join(', ');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />

      {/* Breadcrumb */}
      <div className="px-4 py-2 border-b border-rule-hairline bg-bg-elevated flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/matthew/1/1" className="hover:text-ink-primary transition-colors">← Browse Verses</Link>
        <span>/</span>
        <span className="text-ink-primary font-medium">Earliest Papyrus Witnesses</span>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        {/* Title */}
        <h2 className="text-3xl font-semibold text-ink-primary mb-1">
          Earliest Papyrus Witnesses
        </h2>
        <p className="text-ink-secondary text-base mb-6">
          All known papyrus manuscripts of the four Gospels — ordered by manuscript date, then by Gregory-Aland
          registration number (which approximates discovery order within the same date).
          Date ranges (e.g. 125–175 CE) are paleographic estimates: scholars date each manuscript by comparing
          its handwriting style to other dated documents, yielding a range rather than a precise year.
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Papyri registered',       value: papyri.length.toString() },
            { label: 'Verse citations',          value: totalCitations.toLocaleString() },
            { label: 'With CNTR transcription',  value: cntCount.toString() },
            { label: 'Coverage stubs',           value: stubCount.toString() },
          ].map(s => (
            <div key={s.label} className="bg-bg-elevated rounded-lg border border-rule-hairline px-4 py-3">
              <div className="text-2xl font-semibold text-accent-gold">{s.value}</div>
              <div className="text-xs text-ink-secondary mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── SVG Timeline ── */}
        <section className="mb-10 bg-bg-elevated border border-rule-hairline rounded-lg overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
              Manuscript Date Timeline
            </p>
            <p className="text-xs text-ink-secondary mb-3">
              Each dot is one papyrus. Size = relative verse coverage. Color = Gospel(s) covered.
              Hover for details; click to jump to its entry below.
            </p>
          </div>

          <div className="overflow-x-auto px-2 pb-4">
            <svg
              viewBox="0 0 910 92"
              style={{ width: '100%', minWidth: '560px', height: 'auto', display: 'block' }}
              aria-label="Papyrus manuscript timeline from 100 CE to 750 CE"
            >
              {/* Century band fills */}
              {CENTURY_TICKS.map((yr, i) => {
                const x1 = xForYear(i === 0 ? TL_START : CENTURY_TICKS[i - 1]);
                const x2 = xForYear(yr);
                return (
                  <rect
                    key={yr}
                    x={x1} y={0} width={x2 - x1} height={TL_BAR_Y - 2}
                    fill={i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.03)'}
                  />
                );
              })}

              {/* Timeline bar */}
              <line
                x1={TL_LEFT} y1={TL_BAR_Y} x2={TL_RIGHT} y2={TL_BAR_Y}
                stroke="#C4B89E" strokeWidth="1.5"
              />

              {/* Century tick marks + labels */}
              {CENTURY_TICKS.map(yr => {
                const x = xForYear(yr);
                return (
                  <g key={yr}>
                    <line x1={x} y1={TL_BAR_Y - 4} x2={x} y2={TL_BAR_Y + 4} stroke="#C4B89E" strokeWidth="1" />
                    <text x={x} y={TL_BAR_Y + 14} textAnchor="middle" fontSize="8" fill="#796A4D">{yr}</text>
                  </g>
                );
              })}
              {/* Start label */}
              <text x={TL_LEFT} y={TL_BAR_Y + 14} textAnchor="middle" fontSize="8" fill="#796A4D">100</text>
              {/* "CE" axis label */}
              <text x={TL_RIGHT + 6} y={TL_BAR_Y + 3} fontSize="7" fill="#C4B89E">CE</text>

              {/* Papyrus dots */}
              {tlPoints.map(pt => (
                <a key={pt.siglum} href={`#${pt.siglum}`}>
                  <title>{pt.siglum} · {pt.date} · {pt.verseCount} verses</title>
                  <circle
                    cx={pt.x} cy={pt.y} r={pt.r}
                    fill={pt.color}
                    fillOpacity="0.85"
                    stroke="white"
                    strokeWidth="0.8"
                  />
                </a>
              ))}

              {/* Labels for high-coverage papyri (> 100 verses) — placed to the right of dot */}
              {tlPoints
                .filter(pt => pt.verseCount > 100)
                .map(pt => (
                  <text
                    key={pt.siglum + '-lbl'}
                    x={pt.x + pt.r + 2}
                    y={pt.y + 3}
                    textAnchor="start"
                    fontSize="7"
                    fill="#1F1A14"
                    fontFamily="serif"
                  >
                    {pt.siglum}
                  </text>
                ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-4 pb-4 text-xs text-ink-secondary border-t border-rule-hairline pt-3">
            {GOSPELS.map(g => (
              <span key={g} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: GOSPEL_COLOR[g] }}
                />
                {GOSPEL_DISPLAY[g]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: '#B8893A' }}
              />
              Multiple Gospels
            </span>
            <span className="text-ink-muted ml-auto">Dot size ∝ verse coverage</span>
          </div>
        </section>

        {/* Gospel totals reference */}
        <div className="mb-6 bg-bg-elevated border border-rule-hairline rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-ink-secondary mb-2 uppercase tracking-wider">Gospel verse totals</p>
          <div className="flex flex-wrap gap-4">
            {GOSPELS.map(g => (
              <span key={g} className="text-sm">
                <span style={{ color: GOSPEL_COLOR[g] }} className="font-semibold">{GOSPEL_DISPLAY[g]}</span>
                <span className="text-ink-muted ml-1">{gospelTotals[g].toLocaleString()} vv · {chapterCount[g]} ch</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-secondary mt-2">
            Coverage bars show one cell per chapter; filled = at least one verse of that chapter survives in the papyrus.
          </p>
        </div>

        {/* Per-century groups */}
        {ERA_ORDER.map(era => {
          const group = grouped.get(era);
          if (!group || group.length === 0) return null;
          return (
            <section key={era} className="mb-10">
              <h3 className="text-lg font-semibold text-ink-secondary border-b border-rule-hairline pb-1 mb-4">
                {era}
                <span className="ml-2 text-sm font-normal text-ink-muted">({group.length} papyri)</span>
              </h3>
              <div className="flex flex-col gap-4">
                {group.map(p => {
                  const fv = p.firstVerse;
                  return (
                    <div
                      key={p.siglum}
                      id={p.siglum}
                      className="bg-bg-elevated border border-rule-hairline rounded-lg overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-rule-hairline bg-witness-band text-ink-on-band">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl font-semibold tracking-tight">
                            {papyrusLabel(p.siglum)}
                          </span>
                          <span className="text-sm text-ink-on-band-muted" style={{ fontFamily: 'var(--font-greek)' }}>
                            ({p.siglum})
                          </span>
                          <span className="text-sm text-ink-on-band-muted">
                            Written {p.date}
                          </span>
                          <span className="text-xs text-ink-on-band-muted">
                            {p.discoveryYear ? `Disc. ${p.discoveryYear}` : 'Disc. unknown'} · {p.discoveryNote}
                          </span>
                          {p.hasCNTR ? (
                            <span className="text-xs bg-semantic-extant/20 text-semantic-extant border border-semantic-extant/30 px-1.5 py-0.5 rounded">
                              CNTR transcription
                            </span>
                          ) : (
                            <span className="text-xs bg-white/10 text-ink-on-band-muted border border-white/20 px-1.5 py-0.5 rounded">
                              coverage stub
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-ink-on-band-muted">
                            {p.verseCount} {p.verseCount === 1 ? 'verse' : 'verses'}
                          </span>
                          {fv && (
                            <Link
                              href={`/${fv.gospel}/${fv.chapter}/${fv.verse}`}
                              className="text-xs bg-accent-gold text-band px-2 py-1 rounded hover:bg-accent-gold-soft transition-colors font-medium"
                            >
                              Go to {GOSPEL_ABBR[fv.gospel]} {fv.chapter}:{fv.verse} →
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Coverage body */}
                      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-ink-secondary mb-2">Chapter coverage</p>
                          <div className="flex flex-col gap-1.5">
                            {GOSPELS.map(g => (
                              <CoverageBar
                                key={g}
                                gospel={g}
                                chaptersTotal={chapterCount[g]}
                                coveredChapters={p.chaptersCovered[g]}
                                color={GOSPEL_COLOR[g]}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-ink-secondary mb-2">Covered sections</p>
                          <div className="flex flex-col gap-1 text-sm">
                            {p.gospels.length === 0 && (
                              <span className="text-ink-muted italic">No verses indexed</span>
                            )}
                            {p.gospels.map(g => (
                              <div key={g} className="flex gap-2 items-baseline">
                                <span className="font-semibold w-16 shrink-0" style={{ color: GOSPEL_COLOR[g] }}>
                                  {GOSPEL_DISPLAY[g]}
                                </span>
                                <span className="text-ink-secondary">{verseRangeStr(p, g)}</span>
                                <span className="text-ink-muted ml-auto whitespace-nowrap">
                                  {p.verseCountByGospel[g]} vv
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Full index table */}
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-ink-secondary border-b border-rule-hairline pb-1 mb-4">
            Full Index
            <span className="ml-2 text-sm font-normal text-ink-muted">
              — chronological order, discovery order as tie-breaker
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-witness-band text-ink-on-band text-left">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Papyrus (siglum)</th>
                  <th className="px-3 py-2 font-semibold">Written (paleographic est.)</th>
                  <th className="px-3 py-2 font-semibold">Discovery / acquisition / recognition</th>
                  <th className="px-3 py-2 font-semibold text-center">Mt</th>
                  <th className="px-3 py-2 font-semibold text-center">Mk</th>
                  <th className="px-3 py-2 font-semibold text-center">Lk</th>
                  <th className="px-3 py-2 font-semibold text-center">Jn</th>
                  <th className="px-3 py-2 font-semibold text-center">Total</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Jump to</th>
                </tr>
              </thead>
              <tbody>
                {papyri.map((p, i) => {
                  const fv = p.firstVerse;
                  return (
                    <tr key={p.siglum} className={i % 2 === 0 ? 'bg-bg-page' : 'bg-bg-elevated'}>
                      <td className="px-3 py-1.5 text-ink-muted text-sm">{i + 1}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <a
                          href={`#${p.siglum}`}
                          className="font-semibold text-ink-primary hover:text-accent-gold transition-colors"
                        >
                          {papyrusLabel(p.siglum)}
                        </a>
                        <span className="ml-1.5 text-ink-muted text-xs" style={{ fontFamily: 'var(--font-greek)' }}>
                          ({p.siglum})
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-ink-secondary text-sm whitespace-nowrap">{p.date}</td>
                      <td className="px-3 py-1.5 text-sm">
                        {p.discoveryYear ? (
                          <span>
                            <span className="font-medium text-ink-primary">{p.discoveryYear}</span>
                            <span className="text-ink-secondary ml-1">· {p.discoveryNote}</span>
                          </span>
                        ) : (
                          <span className="text-ink-secondary italic">{p.discoveryNote}</span>
                        )}
                      </td>
                      {(['matthew', 'mark', 'luke', 'john'] as Gospel[]).map(g => (
                        <td key={g} className="px-3 py-1.5 text-center">
                          {p.verseCountByGospel[g] ? (
                            <span style={{ color: GOSPEL_COLOR[g] }} className="font-medium text-sm">
                              {p.verseCountByGospel[g]}
                            </span>
                          ) : (
                            <span className="text-ink-muted text-sm">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center font-semibold text-sm">{p.verseCount}</td>
                      <td className="px-3 py-1.5">
                        {p.hasCNTR
                          ? <span className="text-xs text-semantic-extant font-medium">CNTR</span>
                          : <span className="text-xs text-ink-muted">stub</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {fv && (
                          <Link
                            href={`/${fv.gospel}/${fv.chapter}/${fv.verse}`}
                            className="text-xs text-accent-gold hover:text-accent-gold-soft transition-colors"
                          >
                            {GOSPEL_ABBR[fv.gospel]} {fv.chapter}:{fv.verse}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology */}
        <section className="mt-10 border-t border-rule-hairline pt-6 text-sm text-ink-secondary leading-relaxed">
          <p className="font-semibold text-ink-primary mb-2">Methodology &amp; Sources</p>
          <p className="mb-2">
            Papyri are ordered primarily by manuscript date (earliest scholarly estimate), then by
            Gregory-Aland siglum number — the international registration system maintained by the Institut
            für Neutestamentliche Textforschung (INTF, Münster). Siglum numbers were assigned roughly in
            discovery and registration order, so within papyri sharing the same date estimate this serves
            as a proxy for discovery chronology.
          </p>
          <p className="mb-2">
            Transcriptions marked <span className="text-semantic-extant font-medium">CNTR</span> are
            sourced from the Center for New Testament Restoration (CNTR) Class 1 transcriptions (CC BY-SA 4.0).
            Each word in the Earliest Papyrus column is drawn directly from the CNTR text, stripped of
            editorial markup (scribal corrections <code>x&#123;wrong&#125;&#123;right&#125;</code>,
            per-letter uncertainty markers <code>^%</code>, nomina sacra prefixes <code>~=</code>).
          </p>
          <p>
            Papyri marked <span className="font-medium">coverage stub</span> are registered from verse
            ranges documented in the scholarly literature but have no CNTR transcription in this database.
            Their alignment cells are marked extant (the papyrus is known to cover that verse) but the
            displayed text falls back to the TAGNT Greek form.
          </p>
        </section>

      </main>
    </div>
  );
}
