/** Every project fetcher action answers with this shape. */
export interface ActionResult {
    ok: boolean
    intent?: string
    error?: string
}
