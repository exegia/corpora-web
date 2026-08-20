import { ProfileCardBlock, Skeleton, type ProfileCardItem } from "@exegia/corpora-ui"
import { LogOutIcon, UserIcon } from "lucide-react"
import { useFetcher, useNavigate } from "react-router"
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

    return (
        <Suspense fallback={renderFallback()}>
            {user && (
                <ProfileCardBlock
                    align="start"
                    items={menu}
                    className="w-full! flex-1"
                    side="top"
                    user={{
                        name: user.name ?? user.email,
                        username: user.email,
                        avatar: user.avatarUrl ?? undefined,
                    }}
                />
            )}
        </Suspense>
    )
}
