import { Button } from "@exegia/corpora-ui"
import type { MetadataAction } from "@/components/blocks/types"

/** One action in a metadata row's trailing slot. */
const ActionButton = ({ label, icon, variant = "ghost", size = "sm", ...props }: MetadataAction) => {
    return (
        <Button {...props} size={size} variant={variant}>
            {icon}
            {label}
        </Button>
    )
}

export default ActionButton
