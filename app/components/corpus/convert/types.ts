import type { ConversionEntry } from "@/lib/corpus-convert"
import type { ConversionController } from "./use-conversion"

export interface StatusPillProps {
  entry: ConversionEntry
  /** Set once the converted document is persisted — enables "View corpus". */
  documentId: string | null
  onOpen: () => void
}

export interface PanelProps {
  entry: ConversionEntry
  documentId: string | null
  /** Collapse the shell panel without abandoning the run. */
  onClose: () => void
  onRetry: () => void
  onDismiss: () => void
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
