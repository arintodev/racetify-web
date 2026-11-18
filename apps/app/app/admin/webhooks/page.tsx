"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Search, Webhook } from "lucide-react"
import Link from "next/link"
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
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

type WebhookRow = Schemas["WebhookRowDto"]

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "disabled", label: "Disabled" },
]

export default function AdminWebhooksPage() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)

  const webhooks = useQuery({
    queryKey: ["admin", "webhooks", { q: query.trim(), status }],
    queryFn: () =>
      getBrowserApi().requestEnvelope<WebhookRow[]>("/v1/admin/webhooks", {
        query: {
          q: query.trim() || undefined,
          status: status === "all" ? undefined : status,
          limit: 25,
          cursor,
        },
      }),
  })

  const rows = webhooks.data?.data ?? []
  const pagination = webhooks.data?.meta.pagination

  return (
    <RequirePermission permission="system:webhooks:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Webhooks"
          description="Organization webhook endpoints and their delivery health."
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search URL or organization"
              className="pl-8"
              aria-label="Search webhooks"
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
            {webhooks.isPending ? "Loading…" : `${rows.length} on this page`}
          </p>
        </div>

        {webhooks.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load webhooks</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {webhooks.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!webhooks.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No webhooks match this filter"
            description="Try another search or status."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-80 truncate font-mono text-xs">
                      {row.url}
                    </TableCell>
                    <TableCell>{row.org.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline">
                            {event}
                          </Badge>
                        ))}
                        {row.events.length > 3 ? (
                          <Badge variant="outline">
                            +{row.events.length - 3}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "secondary" : "outline"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lastDelivery
                        ? `${row.lastDelivery.status}${
                            row.lastDelivery.deliveredAt
                              ? ` · ${formatDateTime(row.lastDelivery.deliveredAt)}`
                              : ""
                          }`
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/webhooks/${row.id}/deliveries`} />
                        }
                      >
                        Deliveries
                      </Button>
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
