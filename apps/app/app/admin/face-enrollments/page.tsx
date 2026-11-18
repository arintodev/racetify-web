"use client"

import { type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Eye, ScanFace, Search } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

type EnrollmentRow = Schemas["FaceEnrollmentRowDto"]

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "deleted", label: "Deleted" },
]

export default function AdminFaceEnrollmentsPage() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [detailId, setDetailId] = React.useState<string | null>(null)

  const enrollments = useQuery({
    queryKey: ["admin", "face-enrollments", { q: query.trim(), status }],
    queryFn: () =>
      getBrowserApi().requestEnvelope<EnrollmentRow[]>(
        "/v1/admin/face-enrollments",
        {
          query: {
            q: query.trim() || undefined,
            status: status === "all" ? undefined : status,
            limit: 25,
            cursor,
          },
        }
      ),
  })

  const detail = useQuery({
    queryKey: ["admin", "face-enrollment", detailId],
    queryFn: () =>
      getBrowserApi().request<Schemas["FaceEnrollmentDetailDto"]>(
        `/v1/admin/face-enrollments/${detailId}`
      ),
    enabled: Boolean(detailId),
  })

  const rows = enrollments.data?.data ?? []
  const pagination = enrollments.data?.meta.pagination

  async function previewImage(imageId: string) {
    if (!detailId) return
    try {
      const preview = await getBrowserApi().request<
        Schemas["FaceEnrollmentImagePreviewDto"]
      >(`/v1/admin/face-enrollments/${detailId}/images/${imageId}`)
      window.open(preview.url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Could not load the enrollment image")
    }
  }

  return (
    <RequirePermission permission="system:face-enrollments:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Face enrollments"
          description="Read-only enrollment metadata and audited image previews."
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search subject or organization"
              className="pl-8"
              aria-label="Search enrollments"
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
        </div>

        {enrollments.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load enrollments</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {enrollments.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!enrollments.isPending && rows.length === 0 ? (
          <EmptyState
            icon={ScanFace}
            title="No enrollments match this filter"
            description="Try another search or status."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Consented</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell>
                      {row.user
                        ? `${row.user.name} · ${row.user.email}`
                        : "Organization subject"}
                      <p className="text-xs text-muted-foreground">
                        {row.scope}
                      </p>
                    </TableCell>
                    <TableCell>{row.organization?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={row.status}
                        tone={
                          row.status === "active"
                            ? "success"
                            : row.status === "rejected"
                              ? "destructive"
                              : "warning"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.consentedAt
                        ? formatDateTime(row.consentedAt)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailId(row.id)}
                      >
                        <Eye />
                        View
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

        <Sheet
          open={Boolean(detailId)}
          onOpenChange={(open) => {
            if (!open) setDetailId(null)
          }}
        >
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Enrollment detail</SheetTitle>
              <SheetDescription>{detailId}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
              {detail.isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : null}
              {detail.data ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{detail.data.status}</Badge>
                    <Badge variant="outline">{detail.data.scope}</Badge>
                    {detail.data.organization ? (
                      <Badge variant="outline">
                        {detail.data.organization.name}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="mt-1">
                        {detail.data.user
                          ? `${detail.data.user.name} · ${detail.data.user.email}`
                          : "Organization subject"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Consented</p>
                      <p className="mt-1">
                        {detail.data.consentedAt
                          ? formatDateTime(detail.data.consentedAt)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Images</p>
                    {detail.data.images.map((image) => (
                      <div
                        key={image.id}
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                      >
                        <span className="flex-1 font-mono text-xs">
                          {image.id}
                        </span>
                        <Badge variant="outline">{image.status}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void previewImage(image.id)}
                        >
                          <Eye />
                          Preview
                        </Button>
                      </div>
                    ))}
                    {detail.data.images.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No images recorded.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </RequirePermission>
  )
}
