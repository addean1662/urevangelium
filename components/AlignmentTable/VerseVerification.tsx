import type { Check, VerseReport } from '@/lib/verification/verifyVerse';

const labels = { papyrus: 'Greek Papyri', coptic: 'Sahidic', vaticanus: 'Vaticanus', sinaiticus: 'Sinaiticus', vulgate: 'Vulgate', bezaeGreek: 'Bezae Greek', bezaeLatin: 'Bezae Latin', peshitta: 'Peshitta', byzantine: 'Byzantine' };
const statuses = { compared: 'Machine compared', difference: 'Difference found', review: 'Review needed', unavailable: 'Unavailable', 'not-applicable': 'Not applicable' };
function Result({ result }: { result: Check }) {
  return <td className="align-top p-2 min-w-44"><strong className={result.status === 'difference' ? 'text-semantic-damaged' : 'text-ink-primary'}>{statuses[result.status]}</strong><p className="mt-1 text-ink-secondary">{result.detail}</p></td>;
}

export function VerseVerification({ report }: { report: VerseReport }) {
  const differences = report.columns.filter(c => [c.source, c.order, c.english].some(r => r.status === 'difference')).length;
  return (
    <details className="mb-4 rounded border border-rule-strong bg-bg-elevated text-sm">
      <summary className="cursor-pointer p-3 font-medium">Verse integrity report · {differences ? `${differences} source columns need investigation` : 'Scholarly review remains open'}</summary>
      <div className="px-3 pb-3">
        <p className="mb-3 text-ink-secondary">Checks run on this verse’s loaded word streams against each tradition’s own pinned source. Differences between traditions are preserved. These checks never change source text or English wording. English placement, cross-source correspondence, and manuscript-image review remain separate.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse" aria-label={`Integrity checks for ${report.reference}`}>
            <caption className="sr-only">Per-source verification of {report.reference}</caption>
            <thead><tr>{['Source', 'Source wording', 'Source order', 'English wording', 'English placement', 'Evidence limits'].map(title => <th key={title} scope="col" className="p-2 border-b border-rule-strong">{title}</th>)}</tr></thead>
            <tbody>{report.columns.map(column => <tr key={column.column} className="border-b border-rule-hairline">
              <th scope="row" className="p-2 align-top min-w-36">{labels[column.column]}<p className="mt-1 font-normal text-ink-muted">{column.authority}</p></th>
              <Result result={column.source} /><Result result={column.order} /><Result result={column.english} /><Result result={column.placement} /><Result result={column.evidence} />
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
