const COVERAGE_GAPS = [
  { chapters: 'Matthew 6–9', record: 'Papyrus evidence reaches portions of Matthew 5 and resumes in Matthew 10.' },
  { chapters: 'Matthew 15–16', record: 'P103 preserves Matthew 13:55–14:5; the next surviving registered papyrus material begins in Matthew 17.' },
  { chapters: 'Matthew 22', record: 'Surviving papyrus material reaches Matthew 21 and resumes in Matthew 23.' },
  { chapters: 'Mark 3', record: 'Surviving Mark papyri cover portions of chapters 1–2 and resume with P45 at Mark 4:36.' },
  { chapters: 'Mark 10', record: 'P45 stops at Mark 9:31 and resumes at Mark 11:27.' },
  { chapters: 'Mark 13–16', record: 'P45’s surviving Mark text ends at Mark 12:28. No later Mark chapter survives in a registered New Testament papyrus.' },
  { chapters: 'Luke 19–21', record: 'P75 stops at Luke 18:18 and resumes at Luke 22:4; the intervening leaves are lost.' },
];

export function PapyrusCoverageGaps() {
  return (
    <section className="mt-10 overflow-hidden rounded-lg border border-rule-hairline bg-bg-elevated" aria-labelledby="papyrus-coverage-gaps">
      <div className="border-b border-rule-hairline px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-gold">Documentary limit</p>
        <h2 id="papyrus-coverage-gaps" className="mt-1 text-2xl font-semibold text-ink-primary">Chapters without an extant registered Greek New Testament papyrus</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-secondary">
          These are gaps in the surviving manuscript record, not merely gaps in Urevangelium’s transcription files. The Earliest Papyri column keeps its red lost dots throughout these chapters. Parchment codices and parallel traditions never supply or reconstruct a papyrus cell.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-bg-page/70 text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="w-44 px-5 py-3">Chapters</th><th className="px-5 py-3">Surviving papyrus record</th></tr>
          </thead>
          <tbody>
            {COVERAGE_GAPS.map((gap) => (
              <tr key={gap.chapters} className="border-t border-rule-hairline align-top">
                <th scope="row" className="px-5 py-3 font-semibold text-ink-primary">{gap.chapters}</th>
                <td className="px-5 py-3 leading-relaxed text-ink-secondary">{gap.record}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 border-t border-rule-hairline px-5 py-5 text-sm leading-relaxed lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink-primary">Column boundary</h3>
          <p className="mt-1 text-ink-secondary">
            Vaticanus (GA 03) and Sinaiticus (GA 01) are displayed only in their own manuscript columns. Their surviving text may guide shared row location, but it never replaces a lost dot or becomes an Earliest Papyri reading.
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Catalogue records: <a className="underline underline-offset-2" href="https://manuscripts.csntm.org/manuscript/View/GA_03" target="_blank" rel="noopener noreferrer">GA 03 ↗</a> · <a className="underline underline-offset-2" href="https://manuscripts.csntm.org/manuscript/View/GA_01" target="_blank" rel="noopener noreferrer">GA 01 ↗</a>
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink-primary">Exceptions requiring separate labels</h3>
          <ul className="mt-1 list-disc space-y-2 pl-5 text-ink-secondary">
            <li><strong className="text-ink-primary">Matthew 6:</strong> P.Oxy. 5575 is a second-century parallel collection of sayings, not a manuscript of Matthew and not a papyrus-column source. Matthew 6 therefore retains lost dots. <a className="underline underline-offset-2" href="https://portal.sds.ox.ac.uk/articles/online_resource/P_Oxy_LXXXVII_5575_Sayings_of_Jesus/23610168" target="_blank" rel="noopener noreferrer">Oxford record ↗</a></li>
            <li><strong className="text-ink-primary">Mark 16:9–20:</strong> Vaticanus and Sinaiticus end at 16:8. Washingtonianus (GA 032) and Alexandrinus (GA 02) are later parchment evidence and must not be represented as papyri.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
