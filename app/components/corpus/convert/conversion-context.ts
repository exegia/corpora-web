import { createContext, useContext } from "react"
import type { ConversionController } from "./use-conversion"

/**
 * The layout's conversion controller, readable from anywhere under AppLayout.
 * Routes keep getting it through the outlet context; this exists for UI that
 * renders outside the route tree — above all the element handed to the
 * shell's `openPanel`, which must read live state rather than snapshot props.
 */
export const ConversionContext = createContext<ConversionController | null>(null)

export function useConversionContext(): ConversionController {
    const conversion = useContext(ConversionContext)
    if (!conversion) {
        throw new Error("useConversionContext must be called under AppLayout")
    }
    return conversion
}
