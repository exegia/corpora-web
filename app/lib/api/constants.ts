import type { Capabilities, CorporaApiErrorKind, SourceFormat } from "./types";

export const CORPORA_API_URL: string =
  import.meta.env.VITE_CORPORA_API_URL ?? "https://api.exegia.co"

export const EXTENSION_TO_FORMAT: Record<string, SourceFormat> = {
  epub: "epub",
  html: "html",
  xml: "tei",
  tei: "tei",
  pdf: "pdf",
  txt: "plain",
  zip: "tf_zip",
}

/** Human list for "unsupported type" messages, kept in one place. */
export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_FORMAT).map(
  (ext) => `.${ext}`,
)

/** The service rejects uploads above this (413). */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export const KIND_BY_STATUS: Record<number, CorporaApiErrorKind> = {
  401: "unauthorized",
  403: "read-only",
  404: "not-found",
  409: "not-ready",
  413: "too-large",
  422: "unsupported",
  429: "queue-full",
}

/** Pessimistic posture until the service has answered once. */
export const UNKNOWN_CAPABILITIES: Capabilities = {
  authRequired: true,
  hubWritable: false,
}