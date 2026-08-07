import { Blocks } from "@/components/blocks"
import type { OrganizationFieldProps } from "@/components/project/detail/types"
import { Button } from "@exegia/corpora-ui";

/** The organization chip and its inline clear control. */
export default function OrganizationField({ organization, readOnly, onEdit }: OrganizationFieldProps) {

    return (
        <Blocks.Metadata
            label="Organization"
            value={
                organization && (
                    <Button variant="link" aria-label="Edit organization" onClick={onEdit}>
                        <span className="truncate">{organization.name}</span>
                    </Button>
                )
            }
            addAction={readOnly ? undefined : { onClick: onEdit, "aria-label": "Add organization" }}
        />
    )
}
