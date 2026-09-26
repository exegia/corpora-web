import { FileQuestion } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@exegia/corpora-ui/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@exegia/corpora-ui/ui/empty"

export default function LicenceNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>This licence does not exist</EmptyTitle>
        <EmptyDescription>
          It may have been removed from the catalog.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/licenses" viewTransition />}>Back to licenses</Button>
      </EmptyContent>
    </Empty>
  )
}
