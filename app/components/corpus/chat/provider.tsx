import { useState, type ReactNode } from "react"
import { ChatContext, createChatAtom } from "./state"

export default function ChatProvider({ children }: { children: ReactNode }) {
    const [state] = useState(createChatAtom)
    return <ChatContext.Provider value={state}>{children}</ChatContext.Provider>
}
