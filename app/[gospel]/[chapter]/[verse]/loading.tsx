export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-12 bg-bg-elevated border-b border-rule-hairline animate-pulse" />
      <div className="h-10 bg-bg-page border-b border-rule-hairline animate-pulse" />
      <div className="h-9 bg-bg-elevated border-b border-rule-hairline animate-pulse" />
      <div className="h-8 bg-bg-page border-b border-rule-hairline animate-pulse" />

      <main className="flex-1 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-3 py-2 border-b border-rule-hairline">
                    <div className="h-4 bg-bg-elevated rounded animate-pulse w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, r) => (
                <tr key={r} className="border-b border-rule-hairline">
                  {Array.from({ length: 6 }).map((_, c) => (
                    <td key={c} className="px-3 py-2">
                      <div
                        className="h-5 bg-bg-elevated rounded animate-pulse"
                        style={{ width: `${50 + ((r * 7 + c * 13) % 40)}px` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
