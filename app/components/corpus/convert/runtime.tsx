import { useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useFetcher } from "react-router"
import {
    conversionPersistRequestAtom,
    finishConversionPersistAtom,
    type ConversionPersistRequest,
} from "./store"

function PersistConversion({ request }: { request: ConversionPersistRequest }) {
    const fetcher = useFetcher<{ ok: boolean; documentId?: string; error?: string }>()
    const finish = useSetAtom(finishConversionPersistAtom)
    const submitted = useRef(false)
    const { submit, data, state } = fetcher

    useEffect(() => {
        if (submitted.current) return
        submitted.current = true
        void submit(request.payload, { method: "post", action: "/corpus" })
    }, [request, submit])

    useEffect(() => {
        if (state === "idle" && data) finish(request.id, data)
    }, [data, finish, request.id, state])

    return null
}

/** One fetcher per run, mounted outside the route outlet so navigation cannot discard it. */
export default function ConversionRuntime() {
    const request = useAtomValue(conversionPersistRequestAtom)
    return request ? <PersistConversion key={request.id} request={request} /> : null
}
