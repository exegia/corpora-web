import { Card, Chart, Frame, Text } from "@exegia/corpora-ui"
import type { CSSProperties } from "react"
import type { CorpusArchive } from "@/lib/api"
import type { CorpusDocument } from "@/lib/corpus"
import Corpus from "@/lib/corpus"
import { formatCompact, formatCount } from "@/lib/utils"

const chartColors = {
    "--chart-series-1": "#8b7ce8",
    "--chart-series-2": "#39b7ad",
    "--chart-series-3": "#efa84e",
    "--chart-series-4": "#e578a5",
    "--chart-series-5": "#559ce8",
} as CSSProperties

export function NodeByTypeChart({ archive }: { document: CorpusDocument; archive: CorpusArchive | null }) {
    const stats = archive ? Corpus.Explore.nodeTypeStatsFromIndex(archive.index) : []
    
    return (
        <Frame className="flex-1 rounded-lg h-full" style={chartColors}>  
            <Card className="flex flex-col gap-3 border-none p-4 h-full">
              <Text.Heading className="mb-0">Node by type</Text.Heading>
              <Text.Span className="mb-4 text-sm leading-0 text-muted-foreground">
                  Compare the number of nodes in each structural level.
              </Text.Span>
                <Chart
                    headerless
                    type="bar"
                    variant="default"
                    title="Nodes by type"
                    data={[...stats]
                        .sort((a, b) => b.count - a.count)
                        .map(row => ({ label: row.type, count: row.count }))}
                    series={[{ key: "count", label: "Nodes", color: "#8b7ce8", format: formatCount }]}
                    width="100%"
                    plotHeight={Math.max(220, stats.length * 36)}
                    xAxis
                    yAxis={{ tickFormatter: value => formatCompact(Number(value)) }}
                    showLegend={false}
                    animation
                    renderer="svg"
                />
            </Card>
        </Frame>
    )
}