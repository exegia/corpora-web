import type { ConversionEntry } from "@/lib/corpus-convert"

export interface StatusPillProps {
  entry: ConversionEntry
  /** Set once the converted document is persisted — enables "View corpus". */
  documentId: string | null
  onOpen: () => void
}

export interface DrawerProps {
  entry: ConversionEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string | null
  onRetry: () => void
  onDismiss: () => void
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
