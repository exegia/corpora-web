import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PanelProps } from "./types"

/** Explorer section: the same CardFrame + Card + CardPanel stack as project Details. */
export default function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <CardFrame className={cn("min-w-xs rounded-sm", className)}>
        <CardFrameHeader>
          <CardFrameTitle render={<h2 />}>{title}</CardFrameTitle>  
          {actions ? <CardFrameAction>{actions}</CardFrameAction> : null}
        </CardFrameHeader>
      <Card>
        <CardPanel className={cn(bodyClassName)}>{children}</CardPanel>
      </Card>
    </CardFrame>
  )
}
