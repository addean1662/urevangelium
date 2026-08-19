import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Sahidic Coptic: Sources and Certification — Urevangelium',
  description: 'How Urevangelium represents and source-verifies the Sahidica NT 4.1.0 text of the four Gospels.',
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Pinned-source verification record</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-primary">The Sahidic Coptic column</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">This column displays the normalized Sahidic Gospel text of <em>Sahidica NT 4.1.0</em>, distributed through Coptic SCRIPTORIUM. It is an edited electronic corpus, not one manuscript and not a reconstruction made by Urevangelium.</p>
          <div className="mt-5 inline-flex rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1 text-sm font-semibold text-accent-gold">Source forms verified; parallel-row alignment under review</div>
        </header>

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
          <Card title="English status"><p><strong>No Sahidic published translation is presently certified in the table.</strong> Crum/KELLIA entries remain visible only as dictionary evidence and are labeled “Lexical aid—not contextual translation.” They are not counted as translation coverage.</p><p>Former TAGNT-derived English and project-generated proper names have been removed from the Sahidic translation layer and retained in the audit record. Another Greek tradition cannot author Sahidic English.</p></Card>
          <Card title="Horner alignment pilots"><p>George W. Horner is the proposed primary published English authority, but his English belongs first to his own edited Coptic text. Urevangelium will admit Horner&apos;s wording only after Horner&apos;s underlying Coptic has been compared with the corresponding Sahidica span.</p><p>The input must be a legally reusable, provenance-qualified human transcription of both Horner&apos;s Coptic and English. An existing licensed scholarly or publisher transcription may qualify; fresh double-key transcription is the fallback. A control pilot will test safe admission, while Mark 16 will test refusal in a high-risk passage.</p></Card>
        </section>

        <section className="mt-8 overflow-hidden rounded border border-rule-hairline">
          <div className="bg-witness-band px-5 py-3 text-sm font-semibold uppercase tracking-wide text-ink-on-band">Pinned local corpus evidence</div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-bg-elevated text-ink-secondary"><tr><th className="px-4 py-3">Gospel</th><th className="px-4 py-3">Word-groups</th><th className="px-4 py-3">Aggregate SHA-256</th></tr></thead><tbody>{counts.map(([gospel, total, hash]) => <tr key={gospel} className="border-t border-rule-hairline"><td className="px-4 py-3 font-medium text-ink-primary">{gospel}</td><td className="px-4 py-3">{total}</td><td className="break-all px-4 py-3 font-mono text-xs">{hash}</td></tr>)}</tbody></table></div>
          <p className="border-t border-rule-hairline px-4 py-3 text-xs leading-relaxed text-ink-muted">Each aggregate hash is calculated deterministically over the ordered Gospel source filenames and their exact local contents, separated by null bytes. Any source-file or filename change invalidates the recorded value.</p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="Reproducible gates"><ol className="list-decimal space-y-2 pl-5"><li>Parse Sahidica word-groups in document order.</li><li>Resolve the embedded John 8 boundary.</li><li>Match repeated forms by verse-level occurrence.</li><li>Require exact diplomatic equality for every displayed form.</li><li>Require one unique provenance coordinate per source occurrence.</li><li>Require source-token order and contextual row placement before alignment certification.</li><li>Regenerate a second time and require zero new rows or textual changes.</li><li>Validate source policy and complete a production build.</li></ol></Card>
          <Card title="Editorial safeguards"><ul className="list-disc space-y-2 pl-5"><li>No Greek, Latin, Syriac, or English source may supply Coptic wording.</li><li>No Sahidica omission may be filled from another column.</li><li>Sahidica source order and word-group boundaries remain primary; the column is not reshaped to imitate another tradition.</li><li>Many-to-many correspondence is represented through alignment links or spans, with independent provenance retained for every source unit.</li><li>Normalization is used for auditing only; it cannot replace the displayed diplomatic word-group.</li><li>Computational row placements remain visibly distinct from source identity.</li><li>Dictionary evidence never inherits translation status.</li><li>Translation authorship and Urevangelium alignment authorship are recorded separately.</li></ul></Card>
        </section>

        <div className="mt-8 flex flex-wrap gap-3"><Link href="/sources#sahidic" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">Full source manifest</Link><Link href="/matthew/1/1" className="rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Open the Gospel table</Link></div>
      </main>
    </div>
  );
}
