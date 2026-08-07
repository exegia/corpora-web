import type { SessionUser } from "@/lib/auth"

export interface ProfileCardProps {
    user: SessionUser
}

export interface DrawerProps {
    user?: SessionUser
}
