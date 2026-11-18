"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Eye, MoreHorizontal, Plus, Search } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
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

import { CreateOrganizationDialog } from "@/components/admin/create-organization-dialog"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { useCan } from "@/lib/auth/session-provider"
import { formatDate, formatNumber } from "@/lib/format"
import { organizationStatuses } from "@/lib/status"

type OrganizationRow = Schemas["AdminOrganizationRowDto"]

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
]

export default function AdminOrganizationsPage() {
  const canManage = useCan("system:orgs:manage")
  const queryClient = useQueryClient()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [action, setAction] = React.useState<{
    type: "suspend" | "activate"
    row: OrganizationRow
  } | null>(null)

  const organizations = useQuery({
    queryKey: queryKeys.adminOrgs({
      q: query.trim() || undefined,
      status,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<OrganizationRow[]>("/v1/admin/orgs", {
        query: {
          q: query.trim() || undefined,
          status: status === "all" ? undefined : status,
          limit: 25,
          cursor,
        },
      }),
  })

  const rows = organizations.data?.data ?? []
  const pagination = organizations.data?.meta.pagination

  function handleCreated(
    response: Schemas["CreateOrganizationResponseDto"]
  ) {
    toast.success("Organization created", {
      description: response.ownerInvited
        ? "It is pending activation. The owner was invited by email."
        : "It is pending activation. The owner can sign in now.",
    })
    setCursor(undefined)
    void queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] })
    void queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  }

  async function confirmStatusChange() {
    if (!action) return
    try {
      await getBrowserApi().request(
        `/v1/admin/orgs/${action.row.id}/${action.type}`,
        { method: "POST" }
      )
      toast.success(
        action.type === "suspend" ? "Organization suspended" : "Organization activated"
      )
      void queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] })
    } catch {
      toast.error("Could not update the organization")
    } finally {
      setAction(null)
    }
  }

  return (
    <RequirePermission permission="system:orgs:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Organizations"
          description="Tenant accounts across the Racetify platform."
          actions={
            canManage ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                New organization
              </Button>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => {
                setQuery(changeEvent.target.value)
                setCursor(undefined)
              }}
              placeholder="Search name or slug"
              className="pl-8"
              aria-label="Search organizations"
            />
          </div>
          <Select
            items={statusItems}
            value={status}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setStatus(value)
                setCursor(undefined)
              }
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
            {organizations.isPending
              ? "Loading…"
              : `${rows.length} on this page`}
          </p>
        </div>

        {organizations.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load organizations</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {organizations.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!organizations.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations match these filters"
            description={
              canManage
                ? "Try another search or status, or create a new organization."
                : "Try another search or status."
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const statusConfig =
                    organizationStatuses[
                      row.status as keyof typeof organizationStatuses
                    ]
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.slug}
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
                      <TableCell className="tabular-nums">
                        {formatNumber(row.memberCount)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(row.eventCount)}
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
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              nativeButton={false}
                              render={
                                <Link href={`/admin/overviews/${row.id}`} />
                              }
                            >
                              <Eye />
                              View overview
                            </DropdownMenuItem>
                            {canManage ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setAction({
                                    type:
                                      row.status === "active"
                                        ? "suspend"
                                        : "activate",
                                    row,
                                  })
                                }
                              >
                                {row.status === "active"
                                  ? "Suspend tenant"
                                  : "Activate tenant"}
                              </DropdownMenuItem>
                            ) : null}
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

        <CreateOrganizationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />

        <AlertDialog
          open={Boolean(action)}
          onOpenChange={(open) => {
            if (!open) setAction(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {action?.type === "suspend"
                  ? "Suspend organization?"
                  : "Activate organization?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {action?.row.name ?? "This organization"} will be{" "}
                {action?.type === "suspend" ? "suspended" : "activated"}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant={action?.type === "suspend" ? "destructive" : undefined}
                onClick={() => void confirmStatusChange()}
              >
                Confirm
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
