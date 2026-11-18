"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ListChecks, RotateCcw } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

type JobRow = Schemas["AdminJobRowDto"]

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
]

export default function AdminJobsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)

  const jobs = useQuery({
    queryKey: queryKeys.adminJobs({ status }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<JobRow[]>("/v1/admin/jobs", {
        query: {
          status: status === "all" ? undefined : status,
          limit: 25,
          cursor,
        },
      }),
  })

  const rows = jobs.data?.data ?? []
  const pagination = jobs.data?.meta.pagination

  async function retry(job: JobRow) {
    try {
      await getBrowserApi().request(`/v1/admin/jobs/${job.id}/retry`, {
        method: "POST",
      })
      toast.success("Job re-queued")
      void queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] })
    } catch {
      toast.error("Could not retry the job")
    }
  }

  return (
    <RequirePermission permission="system:jobs:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Jobs"
          description="Outbox events and background work across the platform."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select
            items={statusItems}
            value={status}
            onValueChange={(value) => {
              if (typeof value === "string") setStatus(value)
            }}
          >
            <SelectTrigger className="w-[170px]" aria-label="Filter by status">
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
            {jobs.isPending ? "Loading…" : `${rows.length} on this page`}
          </p>
        </div>

        {jobs.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load jobs</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {jobs.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!jobs.isPending && rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No jobs match this filter"
            description="Choose a different status."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-mono text-xs">{row.type}</p>
                      <p className="text-xs text-muted-foreground">{row.id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.attempts}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                      {row.error?.message ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "failed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void retry(row)}
                        >
                          <RotateCcw />
                          Retry
                        </Button>
                      ) : null}
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
