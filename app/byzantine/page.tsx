import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Byzantine Textform: Sources and Certification — Urevangelium',
  description: 'Sources, rules, and internal certification for the Robinson–Pierpont 2018 Byzantine Textform and its English layer.',
};

const sources = [
  ['Governing Greek', 'Robinson–Pierpont 2018', 'Only the byztxt v3.3.2 RP2018 files determine the displayed Byzantine Greek. They are pinned to upstream commit 27a45ff1b7be6c17ccbfeac414f3f55732ae8e28.'],
  ['Source identity', 'RP2018 Strong and parsing files', 'The matching v3.3.2 morphology files establish the identity and grammatical form of every displayed token.'],
  ['Contextual English', 'STEPBible TAGNT', 'English is eligible only where TAGNT explicitly identifies the Byzantine reading and the token aligns exactly to RP2018. TAGNT never governs the Greek.'],
  ['Lexical evidence', 'TBESG / Abbott-Smith', 'Extended Strong identities and published lexical evidence check the English bridge. Site-selected results display in orange.'],
  ['Secondary verification', 'MorphGNT, PROIEL, and MorphGNT lexicon', 'These sources adjudicate legacy Strong-number and lemma conventions without importing a reading or English cell from another tradition.'],
];

const stages = [
  ['1', 'Pin', 'Freeze RP2018, its upstream commit, and every local source hash.'],
  ['2', 'Rebuild', 'Generate the column solely from the RP2018 Gospel records.'],
  ['3', 'Verify', 'Match all 66,130 cells to RP2018 surface, order, Strong number, and parsing.'],
  ['4', 'Align', 'Place readings in the shared grid without changing wording or source order.'],
  ['5', 'Admit', 'Use explicit Byzantine context or the declared lexical chain for English.'],
  ['6', 'Disclose', 'Color project-adjudicated English orange.'],
  ['7', 'Certify', 'Require complete accounting, passing tests, and a production build.'],
];

const figures = [
  ['3,778', 'RP2018 Gospel verse records'],
  ['66,130', 'displayed RP2018 Greek tokens'],
  ['66,130', 'admitted English placements'],
  ['61,774', 'direct contextual placements'],
  ['4,356', 'orange adjudicated placements'],
  ['0', 'unresolved placements'],
];

export default function ByzantinePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="border-b border-rule-hairline bg-bg-elevated px-4 py-2 text-sm text-ink-muted">
        <Link href="/matthew/1/1" className="hover:text-ink-primary">← Back to the Gospel table</Link>
        <span className="mx-2">/</span><span className="font-medium text-ink-primary">Byzantine</span>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-4xl border-b border-rule-strong pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">RP2018 · four-Gospel edited textform</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-primary">The Byzantine Textform on Urevangelium</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">The Byzantine column represents the Robinson–Pierpont 2018 Byzantine Textform electronic edition. It is an edited representation of the Byzantine Greek tradition—not one physical manuscript and not a reconstruction of the original Gospel text. Its distinctive readings and omissions are preserved rather than harmonized with another column.</p>
          <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary"><strong className="text-ink-primary">Certification claim:</strong> all four Gospels passed Urevangelium’s reproducible RP2018 source-to-display and English-admission checks. This is internal source and process certification, not independent scholarly peer review.</div>
        </header>

        <section className="mt-10" aria-labelledby="figures">
          <h2 id="figures" className="text-2xl font-semibold text-ink-primary">Current certified corpus</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{figures.map(([number, label]) => <div key={label} className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{number}</p><p className="mt-1 text-sm text-ink-muted">{label}</p></div>)}</div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink-secondary">Luke 17:36 is marked omitted because RP2018 contains no verse record there; it is not filled from another edition. English coverage is 100% under the declared admission rules.</p>
        </section>

        <section className="mt-12" aria-labelledby="sources">
          <h2 id="sources" className="text-2xl font-semibold text-ink-primary">Source hierarchy</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-secondary">Only RP2018 governs the Greek. Every other source has a narrower role in identity, alignment, lexical explanation, or verification.</p>
          <div className="mt-5 overflow-hidden rounded border border-rule-hairline">{sources.map(([role, name, detail], index) => <article key={role} className={`grid gap-2 bg-bg-elevated px-5 py-4 md:grid-cols-[13rem_1fr] ${index ? 'border-t border-rule-hairline' : ''}`}><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">{role}</p><h3 className="mt-1 font-semibold text-ink-primary">{name}</h3></div><p className="text-sm leading-relaxed text-ink-secondary">{detail}</p></article>)}</div>
          <p className="mt-4 text-sm text-ink-secondary">Versions, paths, hashes, licenses, and governing rules also appear on the <Link href="/sources#byzantine" className="underline underline-offset-2 hover:text-accent-gold">Sources &amp; Rules page</Link>.</p>
        </section>

        <section className="mt-12" aria-labelledby="pipeline">
          <h2 id="pipeline" className="text-2xl font-semibold text-ink-primary">How the system works</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-7">{stages.map(([number, title, detail], index) => <div key={title} className="relative rounded border border-rule-hairline bg-bg-elevated p-4"><span className="text-xs font-semibold text-accent-gold">{number}</span><h3 className="mt-1 font-semibold text-ink-primary">{title}</h3><p className="mt-2 text-xs leading-relaxed text-ink-secondary">{detail}</p>{index < stages.length - 1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden text-accent-gold lg:block">→</span> : null}</div>)}</div>
        </section>

        <section className="mt-12 grid gap-7 lg:grid-cols-2" aria-label="Display and rules">
          <article className="rounded border border-rule-hairline bg-bg-elevated p-5">
            <h2 className="text-2xl font-semibold text-ink-primary">What the English means</h2>
            <dl className="mt-4 space-y-4 text-sm leading-relaxed"><div><dt className="font-semibold text-ink-primary">Normal English</dt><dd className="mt-1 text-ink-secondary">Contextual English from an explicitly Byzantine TAGNT reading after RP2018 identity and lexical checks.</dd></div><div><dt className="font-semibold text-accent-gold">Orange English</dt><dd className="mt-1 text-ink-secondary">A lexical result selected by Urevangelium’s declared evidence chain. Orange marks the project’s responsibility; it is not presented as a published continuous translation.</dd></div><div><dt className="font-semibold text-ink-primary">No cross-column transfer</dt><dd className="mt-1 text-ink-secondary">Another tradition’s displayed English is never copied into this column.</dd></div></dl>
          </article>
          <article className="rounded border border-rule-hairline bg-bg-elevated p-5">
            <h2 className="text-2xl font-semibold text-ink-primary">Rules that cannot be broken</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-secondary"><li>No other Greek edition may replace RP2018.</li><li>No absent word or verse may be filled from another tradition.</li><li>No English is admitted without exact RP2018 token identity.</li><li>No project-selected result appears as ordinary source English.</li><li>No disagreement is removed merely to make columns agree.</li><li>No internal certification is called independent peer review.</li></ul>
          </article>
        </section>

        <section className="mt-12" aria-labelledby="results">
          <h2 id="results" className="text-2xl font-semibold text-ink-primary">Certification results</h2>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink-secondary">All 66,130 RP2018 tokens and English decisions are accounted for with zero held placements. The reproducible decision set is fixed by SHA-256 <code className="break-all">2853943abfc8af3e78430178ae8dd65b91e61b1f6ab21755831789f0649b0dbb</code>. All 184 automated tests and the production build passed at certification.</p>
        </section>

        <section className="mt-12 rounded border border-rule-strong bg-bg-elevated p-6">
          <h2 className="text-2xl font-semibold text-ink-primary">What remains for external scholarly certification</h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-ink-secondary">The next level is independent review by qualified Byzantine-text and Koine Greek specialists: rerunning the pinned corpus, auditing the rules and orange selections, examining every exceptional rule class, publishing corrections, and signing version-specific findings.</p>
          <div className="mt-5"><Link href="/certification-systems" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">See all certification systems</Link></div>
        </section>
      </main>
    </div>
  );
}
