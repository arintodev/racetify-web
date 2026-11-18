"use client"

import * as React from "react"
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

import { useAccess } from "@/lib/auth/session-provider"
import type { NavGroup } from "@/lib/navigation"

import { ThemeToggle } from "../theme-toggle"
import type { ShellBreadcrumb, WorkspaceInfo } from "./types"
import { WorkspaceSidebar } from "./workspace-sidebar"

export function WorkspaceShell({
  workspace,
  navGroups,
  breadcrumbs,
  children,
}: {
  workspace: WorkspaceInfo
  navGroups: NavGroup[]
  breadcrumbs: ShellBreadcrumb[]
  children: React.ReactNode
}) {
  const access = useAccess()

  const visibleGroups = React.useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.permission ||
            !access ||
            access.permissions.has(item.permission)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [access, navGroups])

  return (
    <SidebarProvider>
      <WorkspaceSidebar workspace={workspace} navGroups={visibleGroups} />
      <SidebarInset className="min-h-svh">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={`${item.label}-${index}`}>
                      <BreadcrumbItem
                        className={isLast ? undefined : "hidden md:block"}
                      >
                        {item.href && !isLast ? (
                          <BreadcrumbLink render={<Link href={item.href} />}>
                            {item.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="truncate">
                            {item.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {!isLast ? (
                        <BreadcrumbSeparator className="hidden md:block" />
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
