import { AnimatedSidebarPanelContext, Tree, type TreeNode } from "@exegia/corpora-ui"
import { BookMarked, BookOpen, Database, FolderKanban, LayoutDashboard, Scale } from "lucide-react"
import { useContext } from "react"
import type { ISidebarProps } from "./types"
import { useNavigate } from "react-router"

export function Sidebar({ header, footer, children }: ISidebarProps) {
    const navigate = useNavigate()
    // The tree doesn't watch the AnimatedPanel it sits in (unlike the profile
    // card, which folds on its own) — read the rail's state and pass it down.
    const collapsed = useContext(AnimatedSidebarPanelContext)?.collapsed ?? false
    const handleNavigate = (node: TreeNode) => {
        if (!node.id) return
        navigate(`/${node.id}`)
    }

    const treeData: TreeNode[] = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: <LayoutDashboard />,
        },
        {
            id: "references",
            label: "References",
            icon: <BookMarked />,
        },
        {
            id: "library",
            label: "Library",
            icon: <BookOpen />,
        },
        {
            id: "project",
            label: "Project",
            icon: <FolderKanban />,
        },
        {
            id: "corpus",
            label: "Corpus",
            icon: <Database />,
        },
        {
            id: "licenses",
            label: "Licenses",
            icon: <Scale />,
        },
    ]

    return (
        <div className="flex h-full w-full flex-1 flex-col justify-between gap-4 px-6 pb-4">
            <div className="flex flex-1 flex-col gap-4">
                {header ? header : null}
                <Tree collapsed={collapsed} items={treeData} variant="sidebar" onNavigate={handleNavigate} />
            </div>
            <div className="flex w-full flex-col items-stretch gap-4">
                {children ? children : null}
                {footer ? footer : null}
            </div>
        </div>
    )
}
