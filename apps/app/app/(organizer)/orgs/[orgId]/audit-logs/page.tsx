"use client"

import { type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { ScrollText, Search } from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
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

type AuditRow = Schemas["AuditLogRowDto"]

export default function OrganizationAuditLogsPage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId
  const [query, setQuery] = React.useState("")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)

  const logs = useQuery({
    queryKey: ["org", orgId, "audit", { q: query.trim() }],
    queryFn: () =>
      getBrowserApi().requestEnvelope<AuditRow[]>(
        `/v1/orgs/${orgId}/audit-logs`,
        { query: { q: query.trim() || undefined, limit: 25, cursor } }
      ),
  })

  const rows = logs.data?.data ?? []
  const pagination = logs.data?.meta.pagination

  return (
    <RequirePermission permission="org:audit:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit logs"
          description="Organization activity across events, members, and settings."
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
              Check your access and connection.
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
                  <TableHead>IP</TableHead>
                  <TableHead>When</TableHead>
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
                      {row.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
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
