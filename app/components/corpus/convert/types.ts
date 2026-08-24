import type { ConversionEntry } from "@/lib/corpus-convert"
import type { ConversionController } from "./use-conversion"

export interface StatusPillProps {
  entry: ConversionEntry
  /** Set once the converted document is persisted — enables "View corpus". */
  documentId: string | null
  onOpen: () => void
  onDismiss: () => void
}

export interface PanelProps {
  entry: ConversionEntry
  documentId: string | null
  /** Clear the run and close the panel (View corpus). */
  onDismiss: () => void
  onRetry: () => void
}

export interface ActionsProps {
  conversion: ConversionController
}

export interface LogStepsProps {
  entry: ConversionEntry
}

export interface FileSummaryProps {
  entry: ConversionEntry
  documentId: string | null
  onRetry: () => void
  onDismiss: () => void
}
