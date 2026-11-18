"use client"

import type { Schemas } from "@workspace/api-client"
import { queryKeys } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Check,
  ChevronsUpDown,
  Flag,
  LayoutGrid,
  Shield,
  UserRound,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"

import { getBrowserApi } from "@/lib/api/browser"
import { useGuardedNavigate } from "@/lib/navigation/leave-guard"

import type { WorkspaceInfo } from "./types"

const workspaceIcon = {
  organization: Building2,
  event: Flag,
  admin: Shield,
  account: UserRound,
}

export function WorkspaceSwitcher({ workspace }: { workspace: WorkspaceInfo }) {
  const { isMobile } = useSidebar()
  const navigate = useGuardedNavigate()

  const { data } = useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: () =>
      getBrowserApi().request<Schemas["WorkspacesDto"]>("/v1/me/workspaces"),
    staleTime: 5 * 60_000,
  })

  const organizations = data?.organizations ?? []
  const events = data?.events ?? []
  const Icon = workspaceIcon[workspace.kind]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Icon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{workspace.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {workspace.subtitle ?? "Workspace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-72"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((organization) => {
                const active =
                  workspace.kind === "organization" &&
                  workspace.id === organization.id
                const usable = organization.status === "active"
                return (
                  <DropdownMenuItem
                    key={organization.id}
                    className="gap-2 p-2"
                    disabled={!usable}
                    onClick={() => {
                      if (usable) {
                        navigate(`/orgs/${organization.id}/overview`)
                      }
                    }}
                  >
                    <Building2 className="size-4" />
                    <span className="truncate">{organization.name}</span>
                    {!usable ? (
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {organization.status}
                      </span>
                    ) : active ? (
                      <Check className="ml-auto size-4" />
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Events
              </DropdownMenuLabel>
              {events.map((event) => {
                const active =
                  workspace.kind === "event" && workspace.id === event.id
                return (
                  <DropdownMenuItem
                    key={event.id}
                    className="gap-2 p-2"
                    onClick={() => navigate(`/events/${event.id}/overview`)}
                  >
                    <Flag className="size-4" />
                    <span className="truncate">{event.name}</span>
                    {active ? <Check className="ml-auto size-4" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => navigate("/workspaces")}
            >
              <LayoutGrid className="size-4" />
              All workspaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
