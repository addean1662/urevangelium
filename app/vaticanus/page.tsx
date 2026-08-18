import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Codex Vaticanus: Sources and Certification — Urevangelium',
  description: 'How Urevangelium represents, checks, aligns, annotates, and internally certifies the four-Gospel text of Codex Vaticanus (GA 03).',
};

const sourceLayers = [
  {
    role: 'Governing manuscript text',
    name: 'INTF NTVMR transcription of GA 03',
    detail: 'The published original-hand TEI transcription for NTVMR document 20003 controls what Greek is displayed. Its Gospel files are pinned by SHA-256 in the audit record.',
    license: 'CC BY 4.0',
  },
  {
    role: 'Independent transcription check',
    name: 'CNTR Class 1 transcription of GA 03',
    detail: 'A pinned CNTR revision is compared automatically with INTF. Agreement corroborates a reading; disagreement is recorded but never silently changes the governing INTF text.',
    license: 'CC BY-SA 4.0',
  },
  {
    role: 'Lexical and morphological checks',
    name: 'TBESG / Abbott-Smith, MorphGNT, PROIEL, and Tischendorf morphology',
    detail: 'These sources identify lemmas, morphology, and lexical English. They explain a Vaticanus form; they do not become the Vaticanus text. Shared ancestry is not counted as independent agreement.',
    license: 'Pinned open or public-domain datasets',
  },
  {
    role: 'Alignment aid',
    name: 'STEPBible TAGNT',
    detail: 'TAGNT supplies contextual alignment and existing English candidates only after the Greek identity is fixed. It is never allowed to replace a Vaticanus omission or reading.',
    license: 'CC BY 4.0',
  },
];

const stages = [
  ['1', 'Acquire', 'Pin the INTF original-hand Gospel transcriptions and record their hashes and reading layer.'],
  ['2', 'Parse', 'Preserve words, word divisions, corrections, uncertain letters, gaps, nomina sacra, omissions, and lacunae as distinct states.'],
  ['3', 'Shadow', 'Compare every Vaticanus token with CNTR using exact and declared reversible normalization. INTF remains governing where they disagree.'],
  ['4', 'Align', 'Place tokens between monotonic source anchors. Existing shared rows are exhausted before a new row is introduced. Another tradition may guide placement but cannot supply Vaticanus text.'],
  ['5', 'Annotate', 'Admit English only when lexical identity is supported by the declared source chain. Site-generated results are orange; manuscript conditions are red.'],
  ['6', 'Abstain', 'Leave English blank when evidence cannot support one result. A blank is a controlled scholarly outcome, not permission to guess.'],
  ['7', 'Certify', 'Run invariant, source-concordance, generated-English, and production-build checks. Publish the decision hash and retain all disagreements.'],
];

const figures = [
  ['3,779', 'Gospel verses classified'],
  ['63,511', 'INTF source tokens'],
  ['63,546', 'displayed lexical words'],
  ['63,543', 'words with certified English'],
  ['134', 'orange system-generated glosses'],
  ['3', 'red manuscript events without English'],
];

export default function VaticanusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="border-b border-rule-hairline bg-bg-elevated px-4 py-2 text-sm text-ink-muted">
        <Link href="/matthew/1/1" className="hover:text-ink-primary">← Back to the Gospel table</Link>
        <span className="mx-2">/</span><span className="font-medium text-ink-primary">Vaticanus</span>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-4xl border-b border-rule-strong pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">GA 03 · four-Gospel witness</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-primary">Codex Vaticanus on Urevangelium</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            The Vaticanus column represents one manuscript witness: Codex Vaticanus, Gregory–Aland 03. It does not display a reconstructed critical text, a blended Alexandrian tradition, or words borrowed from another column. If Vaticanus omits something, the column says <em>omitted</em>. If its physical text is unavailable, the site preserves that condition rather than filling it.
          </p>
          <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary">
            <strong className="text-ink-primary">Certification claim:</strong> the four-Gospel column has passed Urevangelium’s reproducible source-to-display and English-annotation checks. This is internal source certification. It is not yet a claim that an external editorial board or peer-reviewed publication has certified the site.
          </div>
        </header>

        <section className="mt-10" aria-labelledby="figures">
          <h2 id="figures" className="text-2xl font-semibold text-ink-primary">Current certified corpus</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {figures.map(([number, label]) => <div key={label} className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{number}</p><p className="mt-1 text-sm text-ink-muted">{label}</p></div>)}
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink-secondary">The token and lexical-word totals differ because 35 joined manuscript tokens contain two identifiable lexical units and are displayed as 70 cells without changing the archived diplomatic source record. English coverage is 99.995%.</p>
        </section>

        <section className="mt-12" aria-labelledby="sources">
          <h2 id="sources" className="text-2xl font-semibold text-ink-primary">Source hierarchy</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-secondary">Sources have different authority. Only the governing transcription decides the Vaticanus Greek; the remaining sources check, place, or explain it.</p>
          <div className="mt-5 overflow-hidden rounded border border-rule-hairline">
            {sourceLayers.map((source, index) => <article key={source.role} className={`grid gap-2 bg-bg-elevated px-5 py-4 md:grid-cols-[13rem_1fr] ${index ? 'border-t border-rule-hairline' : ''}`}><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">{source.role}</p><h3 className="mt-1 font-semibold text-ink-primary">{source.name}</h3></div><div><p className="text-sm leading-relaxed text-ink-secondary">{source.detail}</p><p className="mt-1 text-xs text-ink-muted">{source.license}</p></div></article>)}
          </div>
          <p className="mt-4 text-sm text-ink-secondary">The complete versions, local paths, licenses, and upstream records are listed on the <Link href="/sources#vaticanus" className="underline underline-offset-2 hover:text-accent-gold">Sources &amp; Rules page</Link>.</p>
        </section>

        <section className="mt-12" aria-labelledby="pipeline">
          <h2 id="pipeline" className="text-2xl font-semibold text-ink-primary">How the system works</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-7">
            {stages.map(([number, title, detail], index) => <div key={title} className="relative rounded border border-rule-hairline bg-bg-elevated p-4"><span className="text-xs font-semibold text-accent-gold">{number}</span><h3 className="mt-1 font-semibold text-ink-primary">{title}</h3><p className="mt-2 text-xs leading-relaxed text-ink-secondary">{detail}</p>{index < stages.length - 1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden text-accent-gold lg:block">→</span> : null}</div>)}
          </div>
        </section>

        <section className="mt-12 grid gap-7 lg:grid-cols-2" aria-label="Display language">
          <article className="rounded border border-rule-hairline bg-bg-elevated p-5">
            <h2 className="text-2xl font-semibold text-ink-primary">What the colors mean</h2>
            <dl className="mt-4 space-y-4 text-sm leading-relaxed">
              <div><dt className="font-semibold text-accent-gold">Orange English</dt><dd className="mt-1 text-ink-secondary">English generated by the site’s declared evidence system. The output is retained with its rule, evidence families, and decision-ledger hash.</dd></div>
              <div><dt className="font-semibold text-semantic-lacuna">Red manuscript notation</dt><dd className="mt-1 text-ink-secondary">A condition of the Greek witness—not a translation. Current examples mark a damaged form, an incomplete first-hand form, and a probable scribal false start labeled “scribal error?”</dd></div>
              <div><dt className="font-semibold text-ink-primary">Normal English</dt><dd className="mt-1 text-ink-secondary">English admitted through the standard aligned lexical-source chain.</dd></div>
            </dl>
          </article>
          <article className="rounded border border-rule-hairline bg-bg-elevated p-5">
            <h2 className="text-2xl font-semibold text-ink-primary">Rules that cannot be broken</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-secondary">
              <li>No NA28 or other critical edition may be presented as Vaticanus.</li>
              <li>No omitted Vaticanus word may be filled from Sinaiticus, Byzantine, or another tradition.</li>
              <li>No English meaning crosses from another column; parallel Greek is corroborating evidence only.</li>
              <li>No correction, uncertain letter, gap, or selected hand is silently resolved.</li>
              <li>No OCR or AI image transcription certifies the displayed text.</li>
              <li>No unresolved form receives English merely to make the column look complete.</li>
            </ul>
          </article>
        </section>

        <section className="mt-12" aria-labelledby="results">
          <h2 id="results" className="text-2xl font-semibold text-ink-primary">What the certification found</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="rounded border border-rule-hairline p-5"><p className="text-3xl font-semibold text-ink-primary">49,975</p><p className="mt-2 text-sm text-ink-secondary">tokens corroborated exactly by the CNTR shadow</p></div>
            <div className="rounded border border-rule-hairline p-5"><p className="text-3xl font-semibold text-ink-primary">13,338</p><p className="mt-2 text-sm text-ink-secondary">corroborated after declared reversible normalization</p></div>
            <div className="rounded border border-rule-hairline p-5"><p className="text-3xl font-semibold text-ink-primary">198</p><p className="mt-2 text-sm text-ink-secondary">INTF-governed disagreements retained rather than harmonized</p></div>
          </div>
          <p className="mt-5 max-w-4xl text-sm leading-relaxed text-ink-secondary">Both the live four-Gospel source audit and the generated-English audit completed with zero invariant failures. The English decision ledger is fixed by SHA-256 <code className="break-all">61cf5809fb7921635a072cd87e3802b3b3284901d912aed2ad414f365b0bf1c9</code>.</p>
        </section>

        <section className="mt-12 rounded border border-rule-strong bg-bg-elevated p-6" aria-labelledby="next-standard">
          <h2 id="next-standard" className="text-2xl font-semibold text-ink-primary">What remains for external scholarly certification</h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-ink-secondary">Reproducibility is necessary, but it is not the last scholarly step. External certification would add qualified manuscript specialists, published review criteria, independent reruns from the pinned sources, adjudication of the retained disagreements, image-level spot checks where open scans permit them, versioned corrections, and signed reviewer findings.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/vaticanus-english-exceptions" className="rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">View the three manuscript events</Link><Link href="/certification-systems#vaticanus" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">See the system diagram</Link></div>
        </section>
      </main>
    </div>
  );
}
