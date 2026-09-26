import { SidebarInset, SidebarProvider, SidebarTrigger } from "@exegia/corpora-ui/ui/sidebar"
import { Sidebar as Navigation } from "./component"
import { Header } from "./header"
import ProfileCard from "./profile-card"

export const Sidebar = {
    Navigation,
    Header,
    Profile: ProfileCard,
    Provider: SidebarProvider,
    Trigger: SidebarTrigger,
    Wrapper: SidebarInset,
}
