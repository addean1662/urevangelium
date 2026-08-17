import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { PapyrusCoverageGaps } from '@/components/PapyrusCoverageGaps';
import { COLUMN_SOURCES, SOURCE_MANIFEST_VERSION, type CertificationStatus } from '@/lib/sourceManifest';

export const metadata: Metadata = {
  title: 'Sources & Rules — Urevangelium',
  description: 'The source material, governing rules, coverage, and certification status of every Urevangelium column.',
};

const statusLabel: Record<CertificationStatus, string> = {
  'source-verified': 'Source verified',
  provisional: 'Editorially provisional',
  'requires-rebuild': 'Requires source rebuild',
};

const statusClass: Record<CertificationStatus, string> = {
  'source-verified': 'border-semantic-extant/40 bg-semantic-extant/10 text-semantic-extant',
  provisional: 'border-accent-gold/40 bg-accent-gold/10 text-[#72531f]',
  'requires-rebuild': 'border-semantic-lacuna/30 bg-semantic-lacuna/5 text-semantic-lacuna',
};

export default function SourcesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="border-b border-rule-hairline bg-bg-elevated px-4 py-2 text-sm text-ink-muted">
        <Link href="/matthew/1/1" className="hover:text-ink-primary">← Back to the Gospel table</Link>
        <span className="mx-2">/</span><span className="font-medium text-ink-primary">Sources &amp; rules</span>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-4xl border-b border-rule-strong pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Editorial record · manifest {SOURCE_MANIFEST_VERSION}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink-primary">Sources and governing rules</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            Urevangelium preserves each witness or textual tradition in its own form so readers can follow the transmission of the Gospels across millennia. This page names the immediate source behind every live column and the rules that source is allowed to follow.
          </p>
          <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary">
            <strong className="text-ink-primary">Current certification statement:</strong> the site is an open textual-comparison project under active source collation. A source being present locally does not by itself certify every displayed word. Each status below describes the present source-to-display relationship.
          </div>
        </header>

        <PapyrusCoverageGaps />

        <section className="mt-10" aria-labelledby="column-records">
          <h2 id="column-records" className="text-2xl font-semibold text-ink-primary">Column records</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-secondary">
            Positions 3a and 3b share the Alexandrian toggle in the live table. Dates distinguish the history of a tradition from the date of the particular manuscript or edition actually displayed.
          </p>

          <div className="mt-6 space-y-7">
            {COLUMN_SOURCES.map((column) => (
              <article key={column.id} id={column.id} className="scroll-mt-24 overflow-hidden rounded-lg border border-rule-hairline bg-bg-elevated">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule-hairline px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Position {column.position} · {column.tradition}</p>
                    <h3 className="mt-1 text-2xl font-semibold text-ink-primary">{column.label}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[column.status]}`}>{statusLabel[column.status]}</span>
                </div>

                <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div><h4 className="font-semibold text-ink-primary">What the column displays</h4><p className="mt-1 text-ink-secondary">{column.displayedObject}</p></div>
                    <div><h4 className="font-semibold text-ink-primary">Dates</h4><p className="mt-1 text-ink-secondary">{column.traditionDate} {column.witnessOrEditionDate}</p></div>
                    <div><h4 className="font-semibold text-ink-primary">Current coverage</h4><p className="mt-1 text-ink-secondary">{column.coverage}</p></div>
                    <div><h4 className="font-semibold text-ink-primary">Status finding</h4><p className="mt-1 text-ink-secondary">{column.statusNote}</p></div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-ink-primary">Immediate source material</h4>
                    <div className="mt-2 space-y-3">
                      {column.sources.map((source) => (
                        <div key={`${column.id}-${source.name}`} className="rounded border border-rule-hairline bg-bg-page/60 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3"><strong className="text-ink-primary">{source.name}</strong><span className="text-xs uppercase tracking-wider text-ink-muted">{source.role}</span></div>
                          <p className="mt-1 text-ink-secondary"><code>{source.localFiles}</code></p>
                          <p className="mt-1 text-xs text-ink-muted">{source.version} · {source.license}{source.url ? <> · <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">source record ↗</a></> : null}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 border-t border-rule-hairline px-5 py-5 lg:grid-cols-2">
                  <div><h4 className="font-semibold text-ink-primary">Governing rules</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-secondary">{column.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
                  <div><h4 className="font-semibold text-ink-primary">Not permitted</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-secondary">{column.prohibited.map((rule) => <li key={rule}>{rule}</li>)}</ul><p className="mt-4 text-sm leading-relaxed text-ink-primary"><strong>Next certification action:</strong> {column.nextAction}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-rule-strong pt-8" aria-labelledby="shared-rules">
          <h2 id="shared-rules" className="text-2xl font-semibold text-ink-primary">Rules shared by every column</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-secondary">
            <li>Every displayed text token must trace to a permitted text source for that column.</li>
            <li>Alignment tools and lexicons may place or explain words; they may not silently become witness text.</li>
            <li>Physical loss, canonical absence, alignment emptiness, editorial supply, and unavailable transcription are different states.</li>
            <li>Normalization must be reversible and documented; the source form remains the archival authority.</li>
            <li>Draft computational alignment is labeled as draft until reviewed by a qualified reader.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
