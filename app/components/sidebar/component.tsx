import { Tree, type TreeNode } from "@exegia/corpora-ui"
import { BookMarked, BookOpen, Database, FolderKanban, LayoutDashboard, Scale } from "lucide-react"
import type { ISidebarProps } from "./types"
import { useNavigate } from "react-router"

export function Sidebar({ header, footer, children }: ISidebarProps) {
    const navigate = useNavigate()
    const handleNavigate = (node: TreeNode) => {
        if (!node.href) return
        navigate(node.href)
    }

    const treeData: TreeNode[] = [
        {
            id: "dashboard",
            label: "Dashboard",
            href: "/",
            icon: <LayoutDashboard />,
        },
        {
            id: "references",
            label: "References",
            href: "/references",
            icon: <BookMarked />,
        },
        {
            id: "library",
            label: "Library",
            href: "/library",
            icon: <BookOpen />,
        },
        {
            id: "project",
            label: "Project",
            href: "/project",
            icon: <FolderKanban />,
        },
        {
            id: "corpus",
            label: "Corpus",
            href: "/corpus",
            icon: <Database />,
        },
        {
            id: "licenses",
            label: "Licenses",
            href: "/licenses",
            icon: <Scale />,
        },
    ]

    return (
        <div className="flex h-full w-full flex-1 flex-col justify-between gap-4 px-6 pb-4">
            <div className="flex flex-1 flex-col gap-4">
                {header ? header : null}
                <Tree items={treeData} variant="sidebar" onNavigate={handleNavigate} />
            </div>
            <div className="flex w-full flex-col items-stretch gap-4">
                {children ? children : null}
                {footer ? footer : null}
            </div>
        </div>
    )
}
