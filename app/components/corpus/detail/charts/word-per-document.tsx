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

export function WordPerDocumentChart({ archive, document }: { document: CorpusDocument; archive: CorpusArchive | null }) {   
    const sections = document.toc?.length
        ? document.toc
        : archive
          ? Corpus.Explore.sectionsFromIndex(archive.index)
          : []
    // Missing counts are unknown, not zero. Keep true zeroes in the chart.
    const countedSections = sections.filter(section => section.words != null && Number.isFinite(section.words))
    const rankedSections = [...countedSections].sort((a, b) => b.words! - a.words!)
    return (
        <Frame className="flex-1 rounded-lg col-span-4" style={chartColors}>
            <Card className="flex flex-col gap-3 border-none p-4">
              <Text.Heading className="mb-0">Node by Document</Text.Heading>
              <Text.Span className="mb-4 text-sm leading-0 text-muted-foreground">
                All {formatCount(countedSections.length)} documents, largest first. Drag the brush below to
                choose a range.
              </Text.Span>
          <Chart
          type="bar"
                    variant="default"
                    headerless
          title="Words per document"
          data={rankedSections.map(section => ({
              label: section.title,
              words: section.words!,
          }))}
          series={[{ key: "words", label: "Words", color: "#39b7ad", format: formatCount }]}
          width="100%"
          plotHeight={380}
          xAxis
          yAxis={{ tickFormatter: value => formatCompact(Number(value)) }}
          // The built-in brush targets x categories only. Horizontal bars
          // need a y-axis dataZoom, displayed as a horizontal brush.
            chartOptions={{
              grid: { left: 8, right: 12, top: 12, bottom: 80, containLabel: true },
              dataZoom: [
                  {
                      type: "slider",
                      orient: "horizontal",
                      yAxisIndex: [],
                      xAxisIndex: [0],
                      filterMode: "filter",
                      startValue: 0,
                      endValue: Math.min(9, rankedSections.length - 1),
                      left: 12,
                      right: 12,
                      bottom: 8,
                      height: 36,
                      brushSelect: false,
                      showDetail: false,
                      borderColor: "#39b7ad",
                      fillerColor: "rgba(57, 183, 173, 0.18)",
                      handleStyle: { color: "#39b7ad", borderColor: "#39b7ad" },
                      dataBackground: {
                          lineStyle: { color: "#39b7ad" },
                          areaStyle: { color: "#39b7ad", opacity: 0.15 },
                      },
                      selectedDataBackground: {
                          lineStyle: { color: "#39b7ad" },
                          areaStyle: { color: "#39b7ad", opacity: 0.4 },
                      },
                  },
              ],
          }}
          showLegend={false}
          animation
          renderer="svg"
          /> 
        </Card>
    </Frame>
    )
}
