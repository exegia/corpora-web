import { Card, Chart, Frame, Text } from "@exegia/corpora-ui"
import type { CSSProperties } from "react"
import type { CorpusArchive } from "@/lib/api"
import type { CorpusDocument } from "@/lib/corpus"
import Corpus from "@/lib/corpus"
import { formatCount } from "@/lib/utils"

const chartColors = {
    "--chart-series-1": "#8b7ce8",
    "--chart-series-2": "#39b7ad",
    "--chart-series-3": "#efa84e",
    "--chart-series-4": "#e578a5",
    "--chart-series-5": "#559ce8",
} as CSSProperties

export function OverviewChart({ archive }: { document: CorpusDocument; archive: CorpusArchive | null }) {
    const stats = archive ? Corpus.Explore.nodeTypeStatsFromIndex(archive.index) : []
    const totalNodes = stats.reduce((total, row) => total + row.count, 0)
    return (
        <Frame className="flex-1 rounded-lg col-span-2 h-full" style={chartColors}>
            <Card className="flex flex-col gap-3 border-none p-4 h-full">
                <Text.Heading className="mb-0">Node by type</Text.Heading>
                <Text.Span className="mb-4 text-sm leading-0 text-muted-foreground">
                    Share of all nodes by type. Hover over a slice for its exact count.
                </Text.Span>
                <Chart
                    headerless
                    className="flex-1 my-auto h-full"
                    type="pie"
                    variant="donut"
                    title="Node type proportions"
                    data={totalNodes > 0 ? stats.map(row => ({ label: row.type, count: row.count })) : []}
                    series={[{ key: "count", label: "Nodes", format: formatCount }]}
                    center={{ value: formatCount(totalNodes), label: "total nodes" }}
                    width="100%"
                    plotHeight={320}
                    animation
                    renderer="svg"
                    pie={{ paddingAngle: 4, cornerRadius: 8 }}
                    emptyContent="No non-zero node counts are available."
                />
            </Card>
        </Frame>
    )
}
