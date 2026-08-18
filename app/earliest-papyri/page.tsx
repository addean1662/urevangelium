import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Earliest Gospel Papyri: System and Sources — Urevangelium',
  description: 'How Urevangelium selects, aligns, displays, and is certifying the surviving Greek papyrus evidence for the four Gospels.',
};

const stages = [
  ['1', 'Register', 'Retain each papyrus siglum, date range, coverage, and source identity.'],
  ['2', 'Transcribe', 'CNTR supplies governing text; INTF checks witness identity and difficult conditions.'],
  ['3', 'Order', 'Scan surviving tokens forward in their own manuscript order; record transpositions.'],
  ['4', 'Align', 'Guide witnesses locate shared rows but never supply papyrus wording.'],
  ['5', 'Select', 'Earlier date governs disagreement; lower GA number breaks a date tie.'],
  ['6', 'Condition', 'Keep readable damage, missing text, and editorial supply distinct.'],
  ['7', 'Certify or hold', 'Admit source-supported tokens and retain unresolved evidence explicitly.'],
];

const figures = [
  ['65', 'registered Gospel papyri'], ['2,132', 'verses with a coverage record'],
  ['51,380', 'source-token attestations accepted'], ['33,549', 'rows carrying papyrus evidence'],
  ['7,811', 'attestations with source-identified missing letters'], ['37', 'disagreements preserved'],
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
        <div className="mt-5 rounded border-l-4 border-accent-gold bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink-secondary"><strong className="text-ink-primary">Current status: provisional.</strong> The selection and alignment rules are explicit and reproducible, and the complete source-order shadow contains no source-token collisions or cross-column mutation errors. Final certification still requires resolving held conditioned tokens, unsupported placements, and coverage stubs.</div>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/papyrus-map" className="rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Coverage Map &amp; Evidence Appendix</Link><Link href="/sources#earliest-papyri" className="rounded border border-rule-strong px-4 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary">Source manifest</Link></div>
      </header>

      <section className="mt-10"><h2 className="text-2xl font-semibold text-ink-primary">Corpus and shadow-audit record</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{figures.map(([number,label]) => <div key={label} className="rounded border border-rule-hairline bg-bg-elevated p-4"><p className="text-2xl font-semibold text-ink-primary">{number}</p><p className="mt-1 text-sm text-ink-muted">{label}</p></div>)}</div><p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink-secondary">Coverage means that a papyrus has material somewhere in a verse; it does not mean every word survives. The word-level system separately determines which letters and tokens are extant.</p></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">What this column preserves</h2><div className="mt-5 grid gap-5 md:grid-cols-3">
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">Many physical witnesses</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Papyri remain separately identified. Multiple papyri may fill different gaps, but their evidence is never blended into an unnamed manuscript.</p></article>
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">One deterministic view</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">The compact column needs one reading per row. Chronology determines that display; agreeing sigla share the cell and dissenting readings remain recorded.</p></article>
        <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h3 className="font-semibold text-ink-primary">Survival, not completion</h3><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Where no registered papyrus preserves text, the column remains lost. Vaticanus, Sinaiticus, Byzantine, and later codices are not fallback text.</p></article>
      </div></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">Source hierarchy</h2><div className="mt-5 overflow-hidden rounded border border-rule-hairline">
        <Source role="Governing text" name="CNTR Class 1 papyrus transcriptions">Local P*.txt witnesses determine displayed readings. Their markup distinguishes readable text, damage, missing characters, and editorial supply. CC BY-SA 4.0.</Source>
        <Source role="Verification" name="INTF NTVMR diplomatic transcriptions">INTF checks witness identity and difficult conditions, especially leading loss. It does not erase a recorded disagreement.</Source>
        <Source role="Alignment aid" name="TAGNT and guide columns">They identify likely positions in the shared table. They are not papyrus witnesses and cannot create surviving text or decide between papyrus variants.</Source>
      </div></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold text-ink-primary">The seven-stage system</h2><div className="mt-5 grid gap-3 lg:grid-cols-7">{stages.map(([number,title,detail],i) => <div key={title} className="relative rounded border border-rule-hairline bg-bg-elevated p-4"><span className="text-xs font-semibold text-accent-gold">{number}</span><h3 className="mt-1 font-semibold text-ink-primary">{title}</h3><p className="mt-2 text-xs leading-relaxed text-ink-secondary">{detail}</p>{i < stages.length-1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden text-accent-gold lg:block">→</span> : null}</div>)}</div></section>

      <section className="mt-12 grid gap-7 lg:grid-cols-2">
        <Card title="When papyri disagree"><ol className="list-decimal space-y-2 pl-5"><li>Rank each papyrus by the starting year of its published date range.</li><li>Display the earliest-ranked reading.</li><li>On a tie, use the lower Gregory–Aland papyrus number.</li><li>Attach only agreeing sigla to the compact cell.</li><li>Preserve dissenting readings in provenance.</li></ol><p className="mt-4 text-xs text-ink-muted">This selects a public display; it does not claim the earliest surviving reading is necessarily the autograph.</p></Card>
        <Card title="How rows are aligned"><ul className="list-disc space-y-2 pl-5"><li>Source order is preserved by contiguous forward scan.</li><li>Vaticanus is the primary structural guide because it is early, Greek, and nearly continuous.</li><li>Sinaiticus and Byzantine may corroborate placement where Vaticanus is absent or uncertain.</li><li>A guide controls row location only—not wording, survival, selection, or English.</li><li>Transpositions receive explicit provenance; word-count balancing is forbidden.</li></ul></Card>
      </section>

      <section className="mt-12 grid gap-7 lg:grid-cols-2">
        <Card title="Damage and loss"><dl className="space-y-4"><div><dt className="font-semibold text-semantic-damaged">damaged</dt><dd className="mt-1">Characters remain traceable and a supported word can be shown. Damage does not automatically mean illegibility.</dd></div><div><dt className="font-semibold text-semantic-lacuna">lost dots</dt><dd className="mt-1">The papyrus text is physically missing or not preserved. No later manuscript fills it.</dd></div><div><dt className="font-semibold text-ink-primary">missing/supplied</dt><dd className="mt-1">In CNTR's official MES grammar, <code>^</code> is the <code>MISSING</code> condition attached to a particular Greek letter. When CNTR's editor identifies that absent character, the word is displayed in normal Greek with this label. The reconstruction is credited to the source edition, not generated by Urevangelium, and remains distinct from physically extant letters.</dd></div><div><dt className="font-semibold text-ink-primary">supplied</dt><dd className="mt-1">CNTR's separate word-level editorial-supply state (<code>~</code>, or its qualified supplied form) is likewise shown in normal text with a source-editor label rather than Urevangelium orange.</dd></div></dl></Card>
        <Card title="Certification gap"><p>The latest shadow accepted 51,380 source-token attestations with zero collisions, missing target rows, non-papyrus mutation errors, or coverage-application errors. All 19,433 tokens with resolved condition-aware row mappings are now admitted and labeled; 3,889 ambiguous or semantic-review tokens remain held.</p><p className="mt-3">Final certification still requires pinned source revisions, CNTR-to-INTF review of difficult conditions, resolution of the remaining unsupported placements and coverage stubs, and a separate English audit.</p></Card>
      </section>

      <section className="mt-12 rounded border border-rule-strong bg-bg-elevated p-6"><h2 className="text-2xl font-semibold text-ink-primary">Evidence appendix</h2><p className="mt-3 max-w-4xl text-sm leading-relaxed text-ink-secondary">The Papyrus Map remains the public data appendix: chronology, coverage dots, Gospel distribution, chapter coverage, transcription status, and fragment records. It answers “what survives where?” This page answers “by what rules does that evidence enter the column?”</p><Link href="/papyrus-map" className="mt-5 inline-block rounded border border-ink-primary px-4 py-2 text-sm font-semibold text-ink-primary hover:bg-ink-primary hover:text-ink-on-band">Explore all 65 papyri</Link></section>
    </main>
  </div>;
}

function Source({role,name,children}:{role:string;name:string;children:React.ReactNode}) { return <article className="grid gap-2 border-b border-rule-hairline bg-bg-elevated px-5 py-4 last:border-b-0 md:grid-cols-[13rem_1fr]"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">{role}</p><h3 className="mt-1 font-semibold text-ink-primary">{name}</h3></div><p className="text-sm leading-relaxed text-ink-secondary">{children}</p></article>; }
function Card({title,children}:{title:string;children:React.ReactNode}) { return <article className="rounded border border-rule-hairline bg-bg-elevated p-5"><h2 className="text-2xl font-semibold text-ink-primary">{title}</h2><div className="mt-4 text-sm leading-relaxed text-ink-secondary">{children}</div></article>; }
