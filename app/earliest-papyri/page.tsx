import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import attestation from '@/data/papyrus-attestation-summary.json';

export const metadata: Metadata = {
  title: 'Earliest Gospel Papyri: System and Sources — Urevangelium',
  description: 'How Urevangelium selects, aligns, displays, and is certifying the surviving Greek papyrus evidence for the four Gospels.',
};

const stages = [
  ['1', 'Register', 'Retain each papyrus siglum, date range, coverage, and source identity.'],
  ['2', 'Transcribe', 'CNTR supplies governing text; INTF checks witness identity and difficult conditions.'],
  ['3', 'Order', 'Scan surviving tokens forward in their own manuscript order; record transpositions.'],
  ['4', 'Align', 'Guide witnesses locate shared rows but never supply papyrus wording.'],
  ['5', 'Select', 'Prefer a complete preserved reading; rank witnesses by date within each evidence class.'],
  ['6', 'Condition', 'Keep readable damage, missing text, and editorial supply distinct.'],
  ['7', 'Certify or hold', 'Admit source-supported tokens and retain unresolved evidence explicitly.'],
];

const figures = [
  ['65', 'registered Gospel papyri'], ['2,132', 'verses with a coverage record'],
  [attestation.totals.preservedSourceCoordinates.toLocaleString('en-US'), 'source coordinates retained'],
  [attestation.totals.removedFullySuppliedCells.toLocaleString('en-US'), 'fully reconstructed cells moved to loss notes'],
  [attestation.totals.partialCells.toLocaleString('en-US'), 'partial cells showing only surviving letters'],
  [attestation.totals.verses.toLocaleString('en-US'), 'verses checked against declared transcriptions'],
];

export default function EarliestPapyriPage() {
  return <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <div className="border-b border-rule-hairline bg-bg-elevated px-4 py-2 text-sm text-ink-muted"><Link href="/matthew/1/1" className="hover:text-ink-primary">← Back to the Gospel table</Link><span className="mx-2">/</span><span className="font-medium text-ink-primary">Earliest Papyri</span></div>
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="max-w-4xl border-b border-rule-strong pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Greek papyrus witnesses · four Gospels</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-primary">How the Earliest Papyri column works</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-secondary">This column is a governed composite of surviving Gospel papyri, not a reconstruction of an original New Testament and not one continuous manuscript. It shows papyrus text only where papyrus text survives. The red lost dots are part of the evidence and are intentionally retained.</p>
        <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary"><strong className="text-ink-primary">Current status: attestation checked against the declared transcriptions; manuscript-image review remains incomplete.</strong> Only recorded surviving evidence enters the word stream. Editorial restorations remain in scholarly notes. Exact witness and token coordinates are retained for every reading, including excluded restorations.</div>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/papyrus-map" className="rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Coverage Map &amp; Evidence Appendix</Link><Link href="/sources#earliest-papyri" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">Source manifest</Link></div>
      </header>

      <section className="mt-10"><h2 className="text-2xl font-semibold text-ink-primary">Corpus and shadow-audit record</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{figures.map(([number,label]) => <div key={label} className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{number}</p><p className="mt-1 text-sm text-ink-muted">{label}</p></div>)}</div><p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink-secondary">Coverage means that a papyrus has material somewhere in a verse; it does not mean every word survives. The word-level system separately determines which letters and tokens are extant.</p></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">What this column preserves</h2><div className="mt-5 grid gap-5 md:grid-cols-3">
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">Many physical witnesses</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Papyri remain separately identified. Multiple papyri may fill different gaps, but their evidence is never blended into an unnamed manuscript.</p></article>
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">One deterministic view</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">The compact column needs one reading per row. Fully preserved readings are preferred over partial readings. Chronology ranks witnesses within each evidence class; agreeing sigla share the cell and dissenting readings remain recorded.</p></article>
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">Survival, not completion</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Where no registered papyrus preserves text, the column remains lost. Vaticanus, Sinaiticus, Byzantine, and later codices are not fallback text.</p></article>
      </div></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">Source hierarchy</h2><div className="mt-5 overflow-hidden rounded border border-rule-hairline">
        <Source role="Governing text" name="CNTR Class 1 papyrus transcriptions">Local P*.txt witnesses determine displayed readings. Their markup distinguishes readable text, damage, missing characters, and editorial supply. CC BY-SA 4.0.</Source>
        <Source role="Verification" name="INTF NTVMR diplomatic transcriptions">INTF checks witness identity and difficult conditions, especially leading loss. It does not erase a recorded disagreement.</Source>
        <Source role="Alignment aid" name="TAGNT and guide columns">They identify likely positions in the shared table. They are not papyrus witnesses and cannot create surviving text or decide between papyrus variants.</Source>
      </div></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">The seven-stage system</h2><div className="mt-5 grid gap-3 lg:grid-cols-7">{stages.map(([number,title,detail],i) => <div key={title} className="relative rounded border border-rule-hairline bg-bg-elevated p-4"><span className="text-xs font-semibold text-accent-gold">{number}</span><h3 className="mt-1 font-semibold text-ink-primary">{title}</h3><p className="mt-2 text-xs leading-relaxed text-ink-secondary">{detail}</p>{i < stages.length-1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden text-accent-gold lg:block">→</span> : null}</div>)}</div></section>

      <section className="mt-12 grid gap-7 lg:grid-cols-2">
        <Card title="When papyri disagree"><ol className="list-decimal space-y-2 pl-5"><li>Prefer a fully preserved reading; if none survives, show only surviving letters.</li><li>Within the same evidence class, rank by the starting year of the published date range.</li><li>On a tie, use the lower Gregory–Aland papyrus number.</li><li>Attach sigla only for witnesses preserving the selected reading to the displayed extent. Keep partial and supplied witnesses distinct in notes.</li><li>Preserve dissenting readings in provenance.</li></ol><p className="mt-4 text-xs text-ink-muted">This selects a public display; it does not claim the earliest surviving reading is necessarily the autograph.</p></Card>
        <Card title="How rows are aligned"><ul className="list-disc space-y-2 pl-5"><li>Source order is preserved by contiguous forward scan.</li><li>Vaticanus is the primary structural guide because it is early, Greek, and nearly continuous.</li><li>Sinaiticus and Byzantine may corroborate placement where Vaticanus is absent or uncertain.</li><li>A guide controls row location only—not wording, survival, selection, or English.</li><li>Transpositions receive explicit provenance; word-count balancing is forbidden.</li></ul></Card>
      </section>

      <section id="damage-and-scan-key" className="mt-12 grid gap-7 lg:grid-cols-2">
        <p className="text-sm leading-relaxed text-ink-secondary lg:col-span-2">Letters with dotted underlines and a tinted background are the particular characters CNTR marks as damaged traces. Amber dots replace characters CNTR marks as missing. A source-conflict notice identifies a recorded disagreement with another transcription; it does not resolve which reading the manuscript supports. A retained English gloss requires a matching reading with no missing letters in the governing transcription. Partial words have no whole-word gloss. Neither a gloss nor a damage label certifies the physical ink.</p>
        <Card title="Damage and loss"><dl className="space-y-4"><div><dt className="font-semibold text-semantic-damaged">damaged</dt><dd className="mt-1">Readable damage is retained. A partially preserved reading shows dots in place of missing letters and an amber indicator; the proposed complete reading is available only in its scholarly note.</dd></div><div><dt className="font-semibold text-semantic-lacuna">lost dots</dt><dd className="mt-1">The papyrus text is physically missing or not preserved. No later manuscript fills it. Red is reserved for this genuinely non-extant state.</dd></div><div><dt className="font-semibold text-ink-primary">editorial supply</dt><dd className="mt-1">An entirely supplied word is excluded from papyrus text, its English gloss, and highlighting. It remains in a loss note. A different papyrus may supply the displayed evidence only when it actually preserves the reading, with its own witness attribution.</dd></div></dl></Card>
        <Card title="Certification status"><p>The corpus retains every original source coordinate, including editorial reconstructions, while separating surviving text from proposed restorations. Corpus construction and page loading enforce the same word-level admission rule. A build check rejects data that would silently reintroduce supplied words or completed missing letters. These checks verify fidelity to the declared transcriptions; they do not certify that every manuscript image has been inspected.</p><p className="mt-3">Admission and alignment are separate. Papyrus attestation determines what appears; neighboring certified source coordinates and the comparative grid determine placement. A different reading normally shares the same row when it occupies the same position in the sentence—the disagreement is the evidence being displayed. Multiple papyrus word-units may share one cell when another tradition expresses the corresponding unit differently. Agreement with Vaticanus, Sinaiticus, Byzantine, or another tradition is never an admission requirement. Separate papyrus-only or transposition rows are reserved for additions, genuinely unavailable comparison positions, and order differences that the shared grid cannot represent honestly. External scholarly review, pinned source revisions, and the separate English audit remain additional certification layers.</p></Card>
      </section>

      <section className="mt-12 rounded border border-rule-strong bg-bg-elevated p-6"><h2 className="text-2xl font-semibold text-ink-primary">Evidence appendix</h2><p className="mt-3 max-w-4xl text-sm leading-relaxed text-ink-secondary">The Papyrus Map remains the public data appendix: chronology, coverage dots, Gospel distribution, chapter coverage, transcription status, and fragment records. It answers “what survives where?” This page answers “by what rules does that evidence enter the column?”</p><Link href="/papyrus-map" className="mt-5 inline-block rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Explore all 65 papyri</Link></section>
    </main>
  </div>;
}

function Source({role,name,children}:{role:string;name:string;children:React.ReactNode}) { return <article className="grid gap-2 border-b border-rule-hairline bg-bg-elevated px-5 py-4 last:border-b-0 md:grid-cols-[13rem_1fr]"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">{role}</p><h3 className="mt-1 font-semibold text-ink-primary">{name}</h3></div><p className="text-sm leading-relaxed text-ink-secondary">{children}</p></article>; }
function Card({title,children}:{title:string;children:React.ReactNode}) { return <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h2 className="text-2xl font-semibold text-ink-primary">{title}</h2><div className="mt-4 text-sm leading-relaxed text-ink-secondary">{children}</div></article>; }
