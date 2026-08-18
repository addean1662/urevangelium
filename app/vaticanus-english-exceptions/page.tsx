import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import exceptionData from '@/data/vaticanus-english-exceptions.json';

export const metadata: Metadata = {
  title: 'Vaticanus English Exceptions — Urevangelium',
  description: 'The complete public ledger of Vaticanus words whose English lexical annotation remains withheld.',
};

export default function VaticanusEnglishExceptionsPage() {
  const ambiguous = exceptionData.cases.filter((item) => item.category.startsWith('Ambiguous'));
  const unavailable = exceptionData.cases.filter((item) => item.category.startsWith('No exact'));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-4xl border-b border-rule-strong pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Vaticanus · public exception ledger</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink-primary">English annotations still withheld</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            {exceptionData.certified.toLocaleString()} of {exceptionData.total.toLocaleString()} displayed Vaticanus lexical words have internally certified English annotations. These {exceptionData.unresolved} words remain blank because the automated scholarly source chain does not yet support one unambiguous lexical result.
          </p>
          <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary">
            The Greek shown in the Vaticanus column remains the INTF GA 03 original-hand transcription. Withholding English does not question the Greek reading; it prevents an unsupported interpretation from being presented as certified.
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Certification totals">
          <div className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">99.784%</p><p className="text-sm text-ink-muted">internally certified</p></div>
          <div className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{ambiguous.length}</p><p className="text-sm text-ink-muted">ambiguous analyses</p></div>
          <div className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{unavailable.length}</p><p className="text-sm text-ink-muted">not in morphology indexes</p></div>
        </section>

        <section className="mt-10" aria-labelledby="exceptions-list">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="exceptions-list" className="text-2xl font-semibold text-ink-primary">All unresolved words</h2><p className="mt-1 text-sm text-ink-muted">Each reference opens the exact verse in the parallel corpus.</p></div>
            <Link href="/sources#vaticanus" className="text-sm underline underline-offset-2 text-ink-secondary hover:text-accent-gold">Vaticanus sources and rules</Link>
          </div>
          <div className="mt-5 overflow-x-auto rounded border border-rule-hairline">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-witness-band text-ink-on-band"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Vaticanus Greek</th><th className="px-4 py-3">Reason withheld</th><th className="px-4 py-3">Aligned candidate (not admitted)</th></tr></thead>
              <tbody>
                {exceptionData.cases.map((item) => (
                  <tr key={`${item.gospel}-${item.chapter}-${item.verse}-${item.rowId}`} className="border-t border-rule-hairline align-top">
                    <td className="whitespace-nowrap px-4 py-3"><Link className="font-semibold text-ink-primary underline decoration-transparent underline-offset-2 hover:decoration-accent-gold" href={`/${item.gospel}/${item.chapter}/${item.verse}`}>{item.gospel[0].toUpperCase() + item.gospel.slice(1)} {item.chapter}:{item.verse}</Link><div className="text-xs text-ink-muted">{item.rowId}</div></td>
                    <td className="px-4 py-3 font-greek text-lg text-ink-primary">{item.greek}</td>
                    <td className="px-4 py-3 text-ink-secondary"><span className="font-medium text-ink-primary">{item.category}</span><div className="mt-1 text-xs text-ink-muted">{item.rule}</div></td>
                    <td className="px-4 py-3 text-ink-secondary">{item.alignedCandidate ? <><span className="font-greek">{item.alignedCandidate.greek}</span><span className="mx-2">·</span>{item.alignedCandidate.gloss}<div className="text-xs text-ink-muted">{item.alignedCandidate.strong}</div></> : <span className="text-ink-muted">No unique TAGNT counterpart</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
