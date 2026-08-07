export type DataErrorCode =
  | "not-found"
  | "already-linked"
  | "already-attached"
  | "validation"
  | "unavailable"
  | "unknown"

export class DataError extends Error {
  code: DataErrorCode

  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = "DataError"
    this.code = code
  }
}
