import type CorporaApi from "@/lib/api"

/** Everything `useCorporaApi` hands back: the corpora-py client itself. */
export type UseCorporaApiResult = typeof CorporaApi

/** A method name on the client — for helpers that key off one, e.g. test doubles. */
export type TMethodName = keyof typeof CorporaApi
