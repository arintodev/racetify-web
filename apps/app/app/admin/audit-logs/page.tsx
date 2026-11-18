"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { ScrollText, Search } from "lucide-react"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
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
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

type AuditRow = Schemas["AdminAuditRowDto"]
type AuditDetail = Schemas["AdminAuditDetailDto"]

export default function AdminAuditLogsPage() {
  const [query, setQuery] = React.useState("")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const logs = useQuery({
    queryKey: queryKeys.adminAudit({ q: query.trim() || undefined }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<AuditRow[]>("/v1/admin/audit-logs", {
        query: { q: query.trim() || undefined, limit: 25, cursor },
      }),
  })

  const detail = useQuery({
    queryKey: ["admin", "audit", "detail", selectedId],
    queryFn: () =>
      getBrowserApi().request<AuditDetail>(
        `/v1/admin/audit-logs/${selectedId}`
      ),
    enabled: Boolean(selectedId),
    retry: false,
  })

  const rows = logs.data?.data ?? []
  const pagination = logs.data?.meta.pagination

  return (
    <RequirePermission permission="system:audit:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit logs"
          description="Platform-wide audit trail."
        />

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search action or resource"
            className="pl-8"
            aria-label="Search audit logs"
          />
        </div>

        {logs.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load audit logs</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {logs.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!logs.isPending && rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit events match this search"
            description="Try a different action or resource."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.action}
                    </TableCell>
                    <TableCell>{row.actor?.name ?? "System"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.resourceType}</Badge>
                      {row.resourceId ? (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {row.resourceId}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.orgId ?? row.eventId ?? "Platform"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedId(row.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <Sheet
          open={Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null)
          }}
        >
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Audit event</SheetTitle>
              <SheetDescription>
                {detail.data?.action ?? "Loading audit detail…"}
              </SheetDescription>
            </SheetHeader>
            {detail.isPending ? (
              <div className="px-4">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : null}
            {detail.isError ? (
              <div className="px-4">
                <Alert variant="destructive">
                  <AlertTitle>Could not load this audit event</AlertTitle>
                  <AlertDescription>Check your connection.</AlertDescription>
                </Alert>
              </div>
            ) : null}
            {detail.data ? (
              <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Actor</p>
                    <p className="mt-1 font-medium">
                      {detail.data.actor?.name ?? "System"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">When</p>
                    <p className="mt-1">
                      {formatDateTime(detail.data.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resource</p>
                    <p className="mt-1 font-mono text-xs">
                      {detail.data.resourceType}
                      {detail.data.resourceId
                        ? ` · ${detail.data.resourceId}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scope</p>
                    <p className="mt-1 font-mono text-xs">
                      {detail.data.orgId ?? detail.data.eventId ?? "Platform"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IP</p>
                    <p className="mt-1">{detail.data.ipAddress ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Request ID
                    </p>
                    <p className="mt-1 font-mono text-xs break-all">
                      {detail.data.requestId ?? "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User agent</p>
                  <p className="mt-1 break-all text-xs">
                    {detail.data.userAgent ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Metadata</p>
                  <pre className="mt-1 max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    {detail.data.metadata
                      ? JSON.stringify(detail.data.metadata, null, 2)
                      : "No metadata."}
                  </pre>
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

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
