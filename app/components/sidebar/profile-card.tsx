import { ProfileCardBlock, Skeleton, type ProfileCardItem } from "@exegia/corpora-ui"
import { LogOutIcon, UserIcon } from "lucide-react"
import { useFetcher, useNavigate } from "react-router"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card"
import type { ProfileCardProps } from "@/components/sidebar/types"
import { Suspense } from "react"

/** The account card pinned under the navigation. */
export default function ProfileCard({ user }: ProfileCardProps) {
    const navigate = useNavigate()
    // Sign-out is a mutation posted to /logout, not a link — see routes/logout.
    // Returning the submit promise keeps the card in its loading state until
    // the action's redirect lands.
    const fetcher = useFetcher()

    const menu: ProfileCardItem[] = [
        { type: "label", label: "Account" },
        {
            id: "profile",
            label: "Profile",
            icon: <UserIcon aria-hidden="true" />,
            onSelect: () => navigate("/profile", { viewTransition: true }),
        },
        { type: "separator" },
        {
            id: "sign-out",
            label: "Log out",
            icon: <LogOutIcon aria-hidden="true" />,
            variant: "destructive",
            onSelect: () => fetcher.submit(null, { method: "post", action: "/logout" }),
        },
    ]

    const renderFallback = () => <Skeleton />

    const displayName = user ? (user.name ?? user.email) : ""
    const initials = displayName
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()

    return (
        <Suspense fallback={renderFallback()}>
            {user && (
                // Hovering the card previews the account; clicking still opens
                // the menu — the trigger is a plain wrapper, not a link, so it
                // never swallows the ProfileCardBlock's own button.
                <PreviewCard>
                    <PreviewCardTrigger render={<div className="flex w-full flex-1" />}>
                        <ProfileCardBlock
                            align="start"
                            items={menu}
                            className="w-full! flex-1"
                            side="top"
                            user={{
                                name: displayName,
                                username: user.email,
                                avatar: user.avatarUrl ?? undefined,
                            }}
                        />
                    </PreviewCardTrigger>
                    <PreviewCardPopup align="start" className="w-80 flex-col gap-3" side="top">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-10">
                                <AvatarImage alt={displayName} src={user.avatarUrl ?? undefined} />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate font-medium">{displayName}</p>
                                <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={user.emailConfirmed ? "success" : "warning"}>
                                {user.emailConfirmed ? "Email verified" : "Email unverified"}
                            </Badge>
                        </div>
                    </PreviewCardPopup>
                </PreviewCard>
            )}
        </Suspense>
    )
}
