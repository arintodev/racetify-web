"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Eye, MoreHorizontal, Search, UserRound } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
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
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDate, formatDateTime } from "@/lib/format"
import { userStatuses } from "@/lib/status"

type UserRow = Schemas["AdminUserRowDto"]

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
]

export default function AdminUsersPage() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)

  const users = useQuery({
    queryKey: queryKeys.adminUsers({
      q: query.trim() || undefined,
      status,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<UserRow[]>("/v1/admin/users", {
        query: {
          q: query.trim() || undefined,
          status: status === "all" ? undefined : status,
          limit: 25,
          cursor,
        },
      }),
  })

  const rows = users.data?.data ?? []
  const pagination = users.data?.meta.pagination

  return (
    <RequirePermission permission="system:users:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Users"
          description="Organizer and administrator accounts across the platform."
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search name or email"
              className="pl-8"
              aria-label="Search users"
            />
          </div>
          <Select
            items={statusItems}
            value={status}
            onValueChange={(value) => {
              if (typeof value === "string") setStatus(value)
            }}
          >
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {users.isPending ? "Loading…" : `${rows.length} on this page`}
          </p>
        </div>

        {users.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load users</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {users.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!users.isPending && rows.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No users match these filters"
            description="Try another search or status."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Memberships</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const statusConfig =
                    userStatuses[row.status as keyof typeof userStatuses]
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        {statusConfig ? (
                          <StatusBadge
                            label={statusConfig.label}
                            tone={statusConfig.tone}
                          />
                        ) : (
                          row.status
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.memberships.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              None
                            </span>
                          ) : (
                            row.memberships.slice(0, 3).map((membership) => (
                              <Badge
                                key={`${membership.orgId}-${membership.roleName}`}
                                variant="outline"
                              >
                                {membership.orgName} · {membership.roleName}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.lastLoginAt
                          ? formatDateTime(row.lastLoginAt)
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${row.name}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              nativeButton={false}
                              render={<Link href={`/admin/users/${row.id}`} />}
                            >
                              <Eye />
                              View user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(pagination?.nextCursor ?? undefined)}
            disabled={!pagination?.hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  )
}
