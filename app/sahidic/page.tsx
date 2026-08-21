import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'How the Sahidic Coptic Column Works — Urevangelium',
  description: 'How Urevangelium builds, aligns, translates, and certifies the Sahidica NT 4.1.0 Gospel column.',
};

const counts = [
  ['Matthew', '13,857', 'c984f64c2b848628e39606f3e44e686928c336b780aa48eb65409e3fc8cce148'],
  ['Mark', '8,390', 'ada3f7efafeffe089679ce495efb1cc93bd268463c28fedc4e25a5707ea1686c'],
  ['Luke', '14,237', '1d8b1e45b0efa39433060a4edb27a08299a88753fa450cf1e4e24d10e06dfec0'],
  ['John', '11,791', 'f30470c5d529c81fab94154618a8ab9f487adc3d0637893590918fbb4d23199d'],
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h2 className="text-lg font-semibold text-ink-primary">{title}</h2><div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-secondary">{children}</div></article>;
}

export default function SahidicPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="border-b border-rule-hairline bg-bg-elevated px-4 py-2 text-sm text-ink-muted">
        <Link href="/matthew/1/1" className="hover:text-ink-primary">← Back to the Gospel table</Link>
        <span className="mx-2">/</span><span className="font-medium text-ink-primary">Sahidic</span>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-4xl border-b border-rule-strong pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Tradition-column methodology</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-primary">How the Sahidic Coptic column works</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">This column displays the normalized Sahidic Gospel text of <em>Sahidica NT 4.1.0</em>, distributed through Coptic SCRIPTORIUM. It is an edited electronic corpus, not one manuscript and not a reconstruction made by Urevangelium.</p>
          <div className="mt-5 inline-flex rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1 text-sm font-semibold text-accent-gold">Source forms verified; parallel-row alignment under review</div>
        </header>

        <section className="mt-8 overflow-hidden rounded border border-rule-hairline">
          <div className="bg-witness-band px-5 py-3 text-sm font-semibold uppercase tracking-wide text-ink-on-band">From source files to the live column</div>
          <ol className="grid gap-px bg-rule-hairline md:grid-cols-4">
            <li className="bg-bg-elevated p-5"><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">1 · Parse</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Read the pinned Sahidica files in document order. SCRIPTORIUM word-groups—not modern English words—are the indivisible source units.</p></li>
            <li className="bg-bg-elevated p-5"><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">2 · Identify</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Assign each occurrence a Gospel, verse, source-token number, diplomatic form, source file, and hash. Repeated forms are matched by occurrence within their verse.</p></li>
            <li className="bg-bg-elevated p-5"><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">3 · Align</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Place the independent Sahidic sequence into comparative rows. Neighboring traditions may guide placement, but can neither create nor replace Coptic text.</p></li>
            <li className="bg-bg-elevated p-5"><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">4 · Decide English</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Run every source group through one deterministic evidence ledger, apply the highest permitted English layer, record its rule and sources, and withhold output when no rule passes.</p></li>
          </ol>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="What is source-matched"><p>All 48,275 source word-groups occur exactly once in the live four-Gospel column. Every displayed form is Unicode-NFC identical to its Sahidica diplomatic word-group and carries its edition, source file, verse, occurrence number, diplomatic form, source hash, and verification state.</p><p>This certifies the inventory and characters of the Sahidic source forms. It does <strong>not</strong> certify that every form currently occupies the correct comparative row.</p></Card>
          <Card title="What is not claimed"><p>This establishes fidelity to pinned Sahidica NT 4.1.0. It does not claim that Sahidica exhausts every surviving Sahidic manuscript or preserves every manuscript&apos;s spelling, damage, correction, and variation.</p><p>SCRIPTORIUM identifies the corpus segmentation, tagging, parsing, and named-entity layers as automatic. Exact reproduction of those source layers is not a claim that each annotation was manually validated by a Coptologist.</p></Card>
          <Card title="Governing source"><p><strong>Sahidica NT 4.1.0</strong>, version date 2021-03-31, via Coptic SCRIPTORIUM. This historical release is deliberately pinned; it is not represented as the newest SCRIPTORIUM release. Corpus metadata names J. Warren Wells for the Sahidica material and Caroline T. Schroeder and Amir Zeldes for annotation.</p><p>Coptic SCRIPTORIUM segmentation defines the displayed word-group unit. Crum through the KELLIA Comprehensive Coptic Lexicon is a lexical aid only and never supplies Coptic text.</p></Card>
          <Card title="John 7 and 8"><p>The distributed file <code>43_John_07.tt</code> contains John 7 followed by John 8. The importer recognizes the John 7:53 empty marker as the logical boundary, so repeated verse numbers cannot overwrite John 7 or be assigned to the wrong chapter.</p><p>Because this edition supplies no word-groups for John 7:53 or John 8:1–11, those verses remain explicitly marked <em>omitted</em>; no neighboring tradition fills them.</p></Card>
        </section>

        <section className="mt-8 rounded border border-accent-gold/50 bg-accent-gold/10 p-5 text-sm leading-relaxed text-ink-secondary">
          <h2 className="text-lg font-semibold text-ink-primary">Current alignment status</h2>
          <p className="mt-3">The source audit records 42,803 computationally provisional placements and 3,174 breaks in Sahidica source-token order. These are alignment warnings, not 42,803 textual differences. Urevangelium is rebuilding the Sahidic row placement in a non-public shadow dataset. Until that work passes source-order and contextual-placement review, the precise public claim is <strong>source text verified; parallel alignment under review</strong>.</p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="English decision order"><p><strong>All 48,275 Sahidic word-groups receive exactly one deterministic decision.</strong> The system first looks for an admitted Horner translation unit, then an eligible KELLIA/CCL lexical aid, then a source-attributed SCRIPTORIUM annotation, then a tightly gated Urevangelium contextual aid. If none qualifies, the English cell stays blank.</p><p>The latest applied ledger records 8 Sahidica groups with admitted Horner English, 43,845 KELLIA/CCL lexical aids, 1,340 scholarly automatic annotations, 92 orange site-generated contextual aids, and 2,990 withheld decisions. A later whole-table invariant check counts 235 displayed translation cells, including previously classified live translation spans, and reports zero layer violations.</p></Card>
          <Card title="Published Horner English"><p>George W. Horner is now an admitted published-English authority in the live system, but only at reviewed translation-unit boundaries. Horner&apos;s English is admitted after his underlying Southern-dialect Coptic is compared with the corresponding Sahidica span and the source and OCR boundary evidence pass the declared gates.</p><p>The published sentence or phrase remains the authoritative translation unit. Where a reviewed allocation exists, its unchanged wording is distributed across the corresponding Sahidica word-groups for readable row-by-row display; the shared unit identifier preserves the original boundary and authorship. Facsimile-controlled OCR units remain explicitly provisional until qualified human-transcription review.</p></Card>
          <Card title="Lexical and annotation layers"><p>KELLIA/CCL supplies lexical ranges, not contextual translation. Exact lemma, declared bound-form, and exact surface matches may display as lexical aids; a surface-only candidate needs exact same-row comparative support.</p><p>A SCRIPTORIUM name component normally requires the same component in the exact comparative row, or support from at least two traditions within the two-row context window. Parenthetical catalogue descriptions and biographical expansions are not shown as though they were translated Coptic.</p></Card>
          <Card title="Reviewed source-coordinate exceptions"><p>The manifest can record a small, explicit exception only when the Sahidica source itself supplies English evidence at a known verse coordinate—for example a proper name in SCRIPTORIUM&apos;s verse translation or a reviewed source phrase span. Each exception records the coordinate, source wording, output, and rule.</p><p>These exceptions do not authorize free translation and do not borrow English from another tradition. Comparative columns may corroborate identity or placement; the cited Sahidica/Scriptorium evidence remains the source.</p></Card>
        </section>

        <section className="mt-8 overflow-hidden rounded border border-rule-hairline">
          <div className="bg-witness-band px-5 py-3 text-sm font-semibold uppercase tracking-wide text-ink-on-band">Pinned local corpus evidence</div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-bg-elevated text-ink-secondary"><tr><th className="px-4 py-3">Gospel</th><th className="px-4 py-3">Word-groups</th><th className="px-4 py-3">Aggregate SHA-256</th></tr></thead><tbody>{counts.map(([gospel, total, hash]) => <tr key={gospel} className="border-t border-rule-hairline"><td className="px-4 py-3 font-medium text-ink-primary">{gospel}</td><td className="px-4 py-3">{total}</td><td className="break-all px-4 py-3 font-mono text-xs">{hash}</td></tr>)}</tbody></table></div>
          <p className="border-t border-rule-hairline px-4 py-3 text-xs leading-relaxed text-ink-muted">Each aggregate hash is calculated deterministically over the ordered Gospel source filenames and their exact local contents, separated by null bytes. Any source-file or filename change invalidates the recorded value.</p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="Reproducible gates"><ol className="list-decimal space-y-2 pl-5"><li>Parse Sahidica word-groups in document order.</li><li>Resolve the embedded John 8 boundary.</li><li>Match repeated forms by verse-level occurrence.</li><li>Require exact diplomatic equality for every displayed form.</li><li>Require one unique provenance coordinate per source occurrence.</li><li>Require source-token order and contextual row placement before alignment certification.</li><li>Build a per-group decision ledger and require exactly one English decision for every source group.</li><li>Validate translation-layer separation, source policy, and a production build.</li></ol></Card>
          <Card title="Editorial safeguards"><ul className="list-disc space-y-2 pl-5"><li>No Greek, Latin, Syriac, or English source may supply Coptic wording.</li><li>No Sahidica omission may be filled from another column.</li><li>Every English output is classified as published translation, lexical aid, contextually corroborated scholarly annotation, or withheld.</li><li>Automatic entity metadata cannot add a title, relationship, or epithet to a single Coptic cell. Comparative traditions must corroborate the displayed name component in its row context.</li><li>CrossWire contributes only Coptic comparison evidence; it contains no English.</li><li>Horner contributes only verbatim units whose underlying Coptic passes the applicability rules.</li><li>Dictionary evidence never inherits translation status.</li><li>Translation authorship and Urevangelium alignment authorship are recorded separately.</li></ul></Card>
        </section>

        <div className="mt-8 flex flex-wrap gap-3"><Link href="/sources#sahidic" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">Full source manifest</Link><Link href="/matthew/1/1" className="rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Open the Gospel table</Link></div>
      </main>
    </div>
  );
}
