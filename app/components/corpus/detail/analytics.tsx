import type { CorpusArchive } from "@/lib/api"
import type { CorpusDocument } from "@/lib/corpus"
import Corpus from "@/lib/corpus"
import Panel from "./panel"
import { abbreviateSection, formatCompact, formatCount } from "./utils"

function maxCount(values: number[]): number {
  return Math.max(1, ...values)
}

/** Analytics tab: node-type bars, words-per-section columns, type table. */
export default function Analytics({
  document,
  archive,
}: {
  document: CorpusDocument
  archive: CorpusArchive | null
}) {
  const stats = archive ? Corpus.Explore.nodeTypeStatsFromIndex(archive.index) : []
  const widest = maxCount(stats.map((row) => row.count))
  const sections =
    document.toc?.length
      ? document.toc
      : archive
        ? Corpus.Explore.sectionsFromIndex(archive.index)
        : []
  const tallest = maxCount(sections.map((section) => section.words ?? 0))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Nodes by type">
          {stats.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No node-type counts were published for this corpus.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.map((row) => (
                <li
                  aria-label={`${row.type}: ${formatCount(row.count)} nodes`}
                  className="flex items-center gap-3"
                  key={row.type}
                >
                  <span className="w-20 shrink-0 text-sm">{row.type}</span>
                  <div className="h-3 min-w-0 flex-1 rounded-sm bg-muted">
                    <div
                      aria-hidden="true"
                      className="h-full rounded-sm bg-primary"
                      style={{
                        width: `${Math.max(2, (row.count / widest) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                    {formatCount(row.count)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Words per document">
          {sections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No section word counts were captured for this corpus.
            </p>
          ) : (
            <ul className="flex h-48 items-end gap-3">
              {sections.map((section) => {
                const words = section.words ?? 0
                const height = tallest === 0 ? 0 : (words / tallest) * 100
                return (
                  <li
                    aria-label={`${section.title}: ${formatCompact(words)} words`}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    key={section.title}
                  >
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatCompact(words)}
                    </span>
                    <div
                      className="w-full rounded-sm bg-primary"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-muted-foreground text-xs">
                      {abbreviateSection(section.title)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel bodyClassName="p-0" title="Type">
        {stats.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground text-sm">
            No node-type counts were published for this corpus.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs tracking-wider uppercase">
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Nodes</th>
                <th className="px-4 py-2 text-right font-medium">Avg slots</th>
                <th className="px-4 py-2 text-right font-medium">% of corpus</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr className="border-b last:border-0" key={row.type}>
                  <td className="px-4 py-3 font-medium">{row.type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCount(row.count)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.avgSlots ? row.avgSlots.toLocaleString("en-US") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.pct.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
