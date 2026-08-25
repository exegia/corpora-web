import type { DataErrorCode } from "./types"

export class DataError extends Error {
  code: DataErrorCode

  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = "DataError"
    this.code = code
  }
}
