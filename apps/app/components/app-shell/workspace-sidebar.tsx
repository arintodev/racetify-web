"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

import type { NavGroup } from "@/lib/navigation"

import { NavMenu } from "./nav-menu"
import { NavUser } from "./nav-user"
import type { WorkspaceInfo } from "./types"
import { WorkspaceSwitcher } from "./workspace-switcher"

export function WorkspaceSidebar({
  workspace,
  navGroups,
}: {
  workspace: WorkspaceInfo
  navGroups: NavGroup[]
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher workspace={workspace} />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMenu key={group.label} group={group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
