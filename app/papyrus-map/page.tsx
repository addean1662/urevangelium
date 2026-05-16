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

function CoverageBar({
  chaptersTotal,
  coveredChapters,
  color,
  gospel,
}: {
  chaptersTotal: number;
  coveredChapters: Set<number> | undefined;
  color: string;
  gospel: string;
}) {
  const cells = Array.from({ length: chaptersTotal }, (_, i) => i + 1);
  const hasCoverage = coveredChapters && coveredChapters.size > 0;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] uppercase tracking-widest w-5 shrink-0 text-ink-muted">{gospel}</span>
      <div className="flex gap-px h-3">
        {cells.map(ch => (
          <div
            key={ch}
            className="h-full rounded-sm"
            style={{
              width: '6px',
              backgroundColor: hasCoverage && coveredChapters!.has(ch) ? color : 'rgba(0,0,0,0.06)',
            }}
            title={`${GOSPEL_DISPLAY[gospel as Gospel]} ch. ${ch}${coveredChapters?.has(ch) ? ' — covered' : ''}`}
          />
        ))}
      </div>
      {hasCoverage && (
        <span className="text-[9px] text-ink-muted ml-1">{coveredChapters!.size}ch</span>
      )}
    </div>
  );
}

export default function PapyrusMapPage() {
  const { papyri, totalCitations, gospelTotals, chapterCount } = loadPapyrusMap();

  const cntCount = papyri.filter(p => p.hasCNTR).length;
  const stubCount = papyri.length - cntCount;

  // Earliest and latest dates
  const allDates = papyri.map(p => p.date);
  const earliest = allDates[0]; // already sorted
  const latest   = allDates[allDates.length - 1];

  // Group into centuries
  function century(date: string): string {
    const m = date.match(/(\d{3,4})/);
    if (!m) return 'Unknown';
    const y = parseInt(m[1]);
    if (y <= 175) return '2nd century CE (–175)';
    if (y <= 300) return '3rd century CE (175–300)';
    if (y <= 400) return '4th century CE (300–400)';
    if (y <= 500) return '5th century CE (400–500)';
    if (y <= 600) return '6th century CE (500–600)';
    return '7th century CE (600+)';
  }

  const grouped = new Map<string, typeof papyri>();
  const ORDER = [
    '2nd century CE (–175)',
    '3rd century CE (175–300)',
    '4th century CE (300–400)',
    '5th century CE (400–500)',
    '6th century CE (500–600)',
    '7th century CE (600+)',
  ];
  for (const p of papyri) {
    const c = century(p.date);
    if (!grouped.has(c)) grouped.set(c, []);
    grouped.get(c)!.push(p);
  }

  // Verse ranges compressed per gospel
  function verseRangeStr(p: typeof papyri[0], gospel: Gospel): string {
    // Get sorted list, compress to ranges
    const vv = [] as Array<{ ch: number; v: number }>;
    // We only have chaptersCovered — for full verse ranges we'd need raw verses
    // Show chapter ranges instead
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
        <h2 className="text-3xl font-semibold text-ink-primary mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
          Earliest Papyrus Witnesses
        </h2>
        <p className="text-ink-muted italic text-sm mb-6">
          All known papyrus manuscripts of the four Gospels, with verse-by-verse coverage across {GOSPELS.map(g => GOSPEL_DISPLAY[g]).join(', ')}.
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Papyri registered', value: papyri.length.toString() },
            { label: 'Verse citations', value: totalCitations.toLocaleString() },
            { label: 'With CNTR transcription', value: cntCount.toString() },
            { label: 'Coverage only (stubs)', value: stubCount.toString() },
          ].map(s => (
            <div key={s.label} className="bg-bg-elevated rounded-lg border border-rule-hairline px-4 py-3">
              <div className="text-2xl font-semibold text-accent-gold">{s.value}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Gospel totals reference */}
        <div className="mb-6 bg-bg-elevated border border-rule-hairline rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-ink-secondary mb-2 uppercase tracking-wider">Gospel verse totals (reference)</p>
          <div className="flex flex-wrap gap-4">
            {GOSPELS.map(g => (
              <span key={g} className="text-sm">
                <span style={{ color: GOSPEL_COLOR[g] }} className="font-semibold">{GOSPEL_DISPLAY[g]}</span>
                <span className="text-ink-muted ml-1">{gospelTotals[g].toLocaleString()} vv · {chapterCount[g]} ch</span>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-ink-muted mt-2">
            Coverage bars below show one cell per chapter. Filled = at least one verse covered by that papyrus.
          </p>
        </div>

        {/* Per-century groups */}
        {ORDER.map(era => {
          const group = grouped.get(era);
          if (!group || group.length === 0) return null;
          return (
            <section key={era} className="mb-10">
              <h3 className="text-lg font-semibold text-ink-secondary border-b border-rule-hairline pb-1 mb-4">
                {era}
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
                      {/* Header row */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-rule-hairline bg-witness-band text-ink-on-band">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-greek)' }}>
                            {p.siglum}
                          </span>
                          <span className="text-sm text-ink-on-band-muted">{p.date}</span>
                          {p.hasCNTR ? (
                            <span className="text-[10px] bg-semantic-extant/20 text-semantic-extant border border-semantic-extant/30 px-1.5 py-0.5 rounded">
                              CNTR transcription
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/10 text-ink-on-band-muted border border-white/20 px-1.5 py-0.5 rounded">
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

                        {/* Coverage bars */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-ink-muted mb-2">Chapter coverage</p>
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

                        {/* Verse range detail */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-ink-muted mb-2">Covered sections</p>
                          <div className="flex flex-col gap-1 text-xs">
                            {p.gospels.length === 0 && (
                              <span className="text-ink-muted italic">No verses indexed</span>
                            )}
                            {p.gospels.map(g => {
                              const rangeStr = verseRangeStr(p, g);
                              const count = p.verseCountByGospel[g] ?? 0;
                              return (
                                <div key={g} className="flex gap-2 items-baseline">
                                  <span
                                    className="font-semibold w-8 shrink-0"
                                    style={{ color: GOSPEL_COLOR[g] }}
                                  >
                                    {GOSPEL_DISPLAY[g]}
                                  </span>
                                  <span className="text-ink-secondary">{rangeStr}</span>
                                  <span className="text-ink-muted ml-auto whitespace-nowrap">{count} vv</span>
                                </div>
                              );
                            })}
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
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-witness-band text-ink-on-band text-left">
                  <th className="px-3 py-2 font-semibold">Siglum</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
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
                    <tr
                      key={p.siglum}
                      className={i % 2 === 0 ? 'bg-bg-page' : 'bg-bg-elevated'}
                    >
                      <td className="px-3 py-1.5">
                        <a
                          href={`#${p.siglum}`}
                          className="font-semibold text-ink-primary hover:text-accent-gold transition-colors"
                          style={{ fontFamily: 'var(--font-greek)' }}
                        >
                          {p.siglum}
                        </a>
                      </td>
                      <td className="px-3 py-1.5 text-ink-secondary text-xs">{p.date}</td>
                      {(['matthew','mark','luke','john'] as Gospel[]).map(g => (
                        <td key={g} className="px-3 py-1.5 text-center">
                          {p.verseCountByGospel[g] ? (
                            <span style={{ color: GOSPEL_COLOR[g] }} className="font-medium text-xs">
                              {p.verseCountByGospel[g]}
                            </span>
                          ) : (
                            <span className="text-ink-muted text-xs">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center font-semibold text-xs">{p.verseCount}</td>
                      <td className="px-3 py-1.5">
                        {p.hasCNTR ? (
                          <span className="text-[10px] text-semantic-extant font-medium">CNTR</span>
                        ) : (
                          <span className="text-[10px] text-ink-muted">stub</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {fv && (
                          <Link
                            href={`/${fv.gospel}/${fv.chapter}/${fv.verse}`}
                            className="text-[10px] text-accent-gold hover:text-accent-gold-soft transition-colors"
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

        {/* Methodology note */}
        <section className="mt-10 border-t border-rule-hairline pt-6 text-xs text-ink-muted leading-relaxed">
          <p className="font-semibold text-ink-secondary mb-2">Methodology</p>
          <p className="mb-2">
            Papyrus transcriptions marked <span className="text-semantic-extant font-medium">CNTR</span> are
            sourced from the Center for New Testament Restoration (CNTR) Class 1 transcriptions (CC BY-SA 4.0)
            and contain the actual Greek text of the manuscript. Each word in the Earliest Papyrus column of the
            alignment table is drawn directly from the CNTR transcription, stripped of editorial markup
            (scribal corrections, per-letter uncertainty markers, nomina sacra prefixes).
          </p>
          <p className="mb-2">
            Papyri marked <span className="font-medium">stub</span> are registered from known verse ranges
            in the scholarly literature but do not yet have a CNTR transcription in this database. Their verse
            cells in the alignment table are marked as extant (the papyrus is known to cover that verse) but
            the displayed text falls back to the TAGNT form.
          </p>
          <p>
            Coverage bars show chapter-level coverage: a filled cell indicates at least one verse in that chapter
            survives in the papyrus. Chapter cells are equal width regardless of verse count within the chapter.
            Jump links navigate directly to the first verse covered by that papyrus in the alignment table.
          </p>
        </section>

      </main>
    </div>
  );
}
