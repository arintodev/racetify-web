"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { KeyRound, Search } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

export default function AdminPermissionsPage() {
  const [query, setQuery] = React.useState("")

  const permissions = useQuery({
    queryKey: queryKeys.adminPermissions(),
    queryFn: () =>
      getBrowserApi().request<Schemas["AdminPermissionDto"][]>(
        "/v1/admin/permissions"
      ),
  })

  const allPermissions = (permissions.data ?? []).map((item) => ({
    permission: `${item.scope}:${item.resource}:${item.action}`,
    label: item.description || item.name,
    group: item.module,
    scope: item.scope,
  }))
  const normalizedQuery = query.trim().toLowerCase()

  const filtered = allPermissions.filter(
    (item) =>
      !normalizedQuery ||
      `${item.permission} ${item.label} ${item.group} ${item.scope}`
        .toLowerCase()
        .includes(normalizedQuery)
  )

  const orgCount = allPermissions.filter((item) => item.scope === "org").length
  const eventCount = allPermissions.filter(
    (item) => item.scope === "event"
  ).length
  const systemCount = allPermissions.filter(
    (item) => item.scope === "system"
  ).length

  return (
    <RequirePermission permission="system:permissions:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Permissions"
          description="The platform permission catalog used by organization, event, and system roles."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Total {allPermissions.length}</Badge>
          <Badge variant="outline">Organization {orgCount}</Badge>
          <Badge variant="outline">Event {eventCount}</Badge>
          <Badge variant="outline">System {systemCount}</Badge>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search permission, label, or group"
            className="pl-8"
            aria-label="Search permissions"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.permission}>
                  <TableCell className="font-mono text-xs">
                    {item.permission}
                  </TableCell>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.group}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.scope}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No permissions match this search"
            description="Try a different permission key, label, or group."
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                Reset search
              </Button>
            }
          />
        ) : null}
      </div>
    </RequirePermission>
  )
}
