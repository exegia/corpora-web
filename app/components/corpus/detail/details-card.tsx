import { Link } from "react-router"
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { DetailsCardProps } from "./types"
import { formatSize } from "../list/utils"

function Item({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

/** The left-hand Details card on the corpus detail page. */
export default function DetailsCard({ document }: DetailsCardProps) {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle render={<h2 />}>Details</CardFrameTitle>
      </CardFrameHeader>
      <Card>
        <CardPanel>
          <dl className="flex flex-col gap-3">
            <Item label="Size">{formatSize(document.sizeBytes)}</Item>
            <Item label="Nodes">
              {document.nodes?.toLocaleString("en-US") ?? "—"}
            </Item>
            <Item label="Documents">
              {document.docsCount?.toLocaleString("en-US") ?? "—"}
            </Item>
            <Item label="Language">{document.language ?? "—"}</Item>
            <Item label="Source format">{document.sourceFormat ?? "—"}</Item>
            <Item label="License">
              {document.licence ? (
                <Link
                  className="text-warning-foreground hover:underline"
                  to="/licenses"
                >
                  {document.licence}
                </Link>
              ) : (
                "—"
              )}
            </Item>
            <Item label="Uploaded">{formatDate(document.uploadedAt)}</Item>
            <Item label="Converted">
              {document.convertedAt ? formatDate(document.convertedAt) : "—"}
            </Item>
          </dl>
        </CardPanel>
      </Card>
    </CardFrame>
  )
}
