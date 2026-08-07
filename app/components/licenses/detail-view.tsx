import { Badge } from "@/components/ui/badge"
import DetailField from "@/components/licenses/detail-field"
import { domainList } from "@/components/licenses/utils"
import { formatDate } from "@/lib/format"
import type { LicenceDetail } from "@/lib/licenses"

/** Read-only field grid, shown to everyone. */
export default function LicenceDetailView({ licence }: { licence: LicenceDetail }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      <DetailField label="Identifier">{licence.id}</DetailField>
      <DetailField label="Status">
        <Badge variant={licence.status === "active" ? "secondary" : "destructive"}>
          {licence.status}
        </Badge>
      </DetailField>
      <DetailField label="Domains">
        <span className="flex flex-wrap gap-1">
          {domainList(licence).length === 0
            ? "—"
            : domainList(licence).map((domain) => (
                <Badge key={domain} variant="outline">
                  {domain}
                </Badge>
              ))}
        </span>
      </DetailField>
      <DetailField label="Family">{licence.family ?? "—"}</DetailField>
      <DetailField label="Maintainer">{licence.maintainer ?? "—"}</DetailField>
      <DetailField label="URL">
        {licence.url ? (
          <a
            href={licence.url}
            target="_blank"
            rel="noreferrer"
            className="break-all underline-offset-2 hover:underline"
          >
            {licence.url}
          </a>
        ) : (
          "—"
        )}
      </DetailField>
      <DetailField label="Open Definition">
        {licence.odConformance ?? "not reviewed"}
      </DetailField>
      <DetailField label="Open Source Definition">
        {licence.osdConformance ?? "not reviewed"}
      </DetailField>
      <DetailField label="Dates">
        Added {formatDate(licence.createdAt)}
        {licence.updatedAt && ` · updated ${formatDate(licence.updatedAt)}`}
      </DetailField>
    </dl>
  )
}
