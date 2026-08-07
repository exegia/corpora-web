import { Card, CardFrame, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoadingSound } from "@/lib/sounds"

/** CardFrame placeholder while the licence text downloads on first visit. */
export default function LicenceTextSkeleton() {
  useLoadingSound()

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle render={<h2 />}>License</CardFrameTitle>
      </CardFrameHeader>
      <Card>
        <CardPanel className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </CardPanel>
      </Card>
    </CardFrame>
  )
}
