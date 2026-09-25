import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadVerse } from '@/lib/data';
import { GOSPELS, type Gospel } from '@/lib/types';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import { PUBLIC_COLUMNS, publicCell } from '@/lib/publicVerse';

type Params = Promise<{ gospel: string; chapter: string; verse: string }>;
const display = { matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' } satisfies Record<Gospel, string>;

function parse(reference: { gospel: string; chapter: string; verse: string }) {
  const chapter = Number(reference.chapter);
  const verse = Number(reference.verse);
  if (!GOSPELS.includes(reference.gospel as Gospel) || !Number.isInteger(chapter) || !Number.isInteger(verse)) return null;
  const gospel = reference.gospel as Gospel;
  const counts = VERSE_COUNTS[gospel];
  if (chapter < 1 || chapter > counts.length || verse < 1 || verse > counts[chapter - 1]) return null;
  return { gospel, chapter, verse };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const parsed = parse(await params);
  if (!parsed) return {};
  const title = `${display[parsed.gospel]} ${parsed.chapter}:${parsed.verse} manuscript transcript — Urevangelium`;
  const url = `https://urevangelium.com/transcript/${parsed.gospel}/${parsed.chapter}/${parsed.verse}`;
  return { title, description: `Machine-readable source text and English alignment for ${display[parsed.gospel]} ${parsed.chapter}:${parsed.verse} across the Urevangelium traditions.`, alternates: { canonical: url }, robots: { index: true, follow: true } };
}

export default async function TranscriptPage({ params }: { params: Params }) {
  const parsed = parse(await params);
  if (!parsed) notFound();
  const data = await loadVerse(parsed.gospel, parsed.chapter, parsed.verse);
  if (!data) notFound();
  const label = `${display[parsed.gospel]} ${parsed.chapter}:${parsed.verse}`;
  const api = `/api/verse/${parsed.gospel}/${parsed.chapter}/${parsed.verse}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">{label} manuscript transcript</h1>
      <p className="mt-3 text-sm text-ink-secondary">Server-rendered scholarly access to the source-language cells and attributed English displayed by Urevangelium. Empty, omitted, lost, and unpopulated states remain distinct.</p>
      <nav className="mt-4 flex gap-4 text-sm">
        <Link className="underline" href={`/${parsed.gospel}/${parsed.chapter}/${parsed.verse}`}>Comparison table</Link>
        <a className="underline" href={api}>JSON API</a>
        <Link className="underline" href="/certification-systems">Certification systems</Link>
      </nav>
      {PUBLIC_COLUMNS.map(([key, columnLabel]) => {
        const cells = data.rows.map((row) => ({ rowId: row.id, ...publicCell(row, key) }));
        return (
          <section key={key} id={key} className="mt-10">
            <h2 className="text-xl font-semibold">{columnLabel}</h2>
            <ol className="mt-3 space-y-1" aria-label={`${columnLabel} source sequence`}>
              {cells.map((cell) => (
                <li key={cell.rowId} className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-rule-hairline py-1 text-sm">
                  <span className="text-ink-muted">{cell.rowId} · {cell.state}</span>
                  <bdi dir={key === 'peshitta' ? 'rtl' : 'ltr'} lang={key === 'peshitta' ? 'syr' : key === 'coptic' ? 'cop' : undefined}>{cell.sourceText || '—'}</bdi>
                  <span>{cell.english || '—'}{cell.englishSource ? ` [${cell.englishSource}]` : ''}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
