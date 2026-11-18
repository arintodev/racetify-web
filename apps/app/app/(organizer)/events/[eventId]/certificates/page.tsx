"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Award,
  Download,
  LayoutTemplate,
  Loader2,
  Play,
  Search,
  ShieldX,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
import { useCan } from "@/lib/auth/session-provider"
import { formatDateTime } from "@/lib/format"
import { certificateStatuses } from "@/lib/status"

const PAGE_SIZE = 25

type Certificate = Schemas["CertificateRowDto"]
type Job = Schemas["GeneratedDocumentJobDto"]

const statusFilterItems = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "issued", label: "Issued" },
  { value: "revoked", label: "Revoked" },
]

export default function CertificatesPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()
  const canGenerate = useCan("event:certificates:generate")
  const canRevoke = useCan("event:certificates:revoke")

  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [raceId, setRaceId] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [templateId, setTemplateId] = React.useState("")
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(false)
  const [revokeId, setRevokeId] = React.useState<string | null>(null)

  const templates = useQuery({
    queryKey: [...queryKeys.templates(eventId), "certificate"],
    queryFn: () =>
      getBrowserApi().request<Schemas["GeneratorTemplateDto"][]>(
        `/v1/events/${eventId}/generator-templates`,
        { query: { scope: "certificate" } }
      ),
  })

  const races = useQuery({
    queryKey: queryKeys.eventRaces(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["RaceDto"][]>(
        `/v1/events/${eventId}/races`
      ),
  })

  const certificates = useQuery({
    queryKey: queryKeys.certificates(eventId, {
      q: query.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      raceId: raceId === "all" ? undefined : raceId,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<Certificate[]>(
        `/v1/events/${eventId}/certificates`,
        {
          query: {
            q: query.trim() || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            raceId: raceId === "all" ? undefined : raceId,
            limit: PAGE_SIZE,
            cursor,
          },
        }
      ),
  })

  const job = useQuery({
    queryKey: [...queryKeys.documentJobs(eventId, { type: "certificate" }), jobId],
    queryFn: () =>
      getBrowserApi().request<Job>(
        `/v1/events/${eventId}/generated-documents/${jobId}`
      ),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "pending" || status === "processing" ? 3000 : false
    },
  })

  React.useEffect(() => {
    const templateRows = templates.data ?? []
    if (!templateId && templateRows.length > 0) {
      setTemplateId(templateRows[0]?.id ?? "")
    }
  }, [templateId, templates.data])

  React.useEffect(() => {
    const status = job.data?.status
    if (status === "completed" || status === "partial") {
      void queryClient.invalidateQueries({
        queryKey: ["event", eventId, "certificates"],
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventOverview(eventId),
      })
    }
  }, [eventId, job.data?.status, queryClient])

  const rows = certificates.data?.data ?? []
  const pagination = certificates.data?.meta.pagination
  const templateRows = templates.data ?? []
  const raceRows = races.data ?? []
  const revokeRow = rows.find((row) => row.certificate.id === revokeId)

  async function generate() {
    if (!templateId) {
      toast.error("Choose a certificate template first")
      return
    }
    setStarting(true)
    try {
      const created = await getBrowserApi().request<Job>(
        `/v1/events/${eventId}/certificates/generate`,
        {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: {
            templateId,
            type: "certificate",
            recipientFilter: {
              status: "confirmed",
              raceId: raceId === "all" ? undefined : raceId,
            },
          } satisfies Schemas["CreateDocumentJobRequest"],
        }
      )
      setJobId(created.id)
      toast.success("Certificate generation started")
    } catch {
      toast.error("Could not start certificate generation")
    } finally {
      setStarting(false)
    }
  }

  async function revokeConfirmed() {
    if (!revokeId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/certificates/${revokeId}/revoke`,
        { method: "POST" }
      )
      toast.success("Certificate revoked")
      void queryClient.invalidateQueries({
        queryKey: ["event", eventId, "certificates"],
      })
    } catch {
      toast.error("Could not revoke the certificate")
    } finally {
      setRevokeId(null)
    }
  }

  function nextPage() {
    if (!pagination?.nextCursor) return
    setCursor(pagination.nextCursor ?? undefined)
  }

  return (
    <RequirePermission permission="event:certificates:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Certificates"
          description="Generate, download, and revoke participant certificates."
          actions={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/events/${eventId}/template-studio?scope=certificate`}
                />
              }
            >
              <LayoutTemplate />
              Template Studio
            </Button>
          }
        />

        {canGenerate ? (
          <Card>
            <CardHeader>
              <CardTitle>Generate certificates</CardTitle>
              <CardDescription>
                Confirmed registrations are rendered from the selected
                certificate template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>No certificate template</AlertTitle>
                  <AlertDescription>
                    Create a certificate-scoped generator template first.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  items={templateRows.map((template) => ({
                    value: template.id,
                    label: `${template.name} · v${template.version}`,
                  }))}
                  value={templateId}
                  onValueChange={(value) => {
                    if (typeof value === "string") setTemplateId(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateRows.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} · v{template.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={[
                    { value: "all", label: "All races" },
                    ...raceRows.map((race) => ({
                      value: race.id,
                      label: race.name,
                    })),
                  ]}
                  value={raceId}
                  onValueChange={(value) => {
                    if (typeof value === "string") setRaceId(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All races" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All races</SelectItem>
                    {raceRows.map((race) => (
                      <SelectItem key={race.id} value={race.id}>
                        {race.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void generate()}
                  disabled={starting || !templateId}
                >
                  {starting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Play />
                  )}
                  {starting ? "Starting…" : "Generate certificates"}
                </Button>
                {job.data ? (
                  <Badge variant="outline">
                    {job.data.status} · {job.data.progress.processed}/
                    {job.data.progress.total}
                  </Badge>
                ) : null}
              </div>
              {job.data?.error ? (
                <Alert variant="destructive">
                  <AlertTitle>{job.data.error.code}</AlertTitle>
                  <AlertDescription>{job.data.error.message}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search participants, bib, or certificate number"
              className="pl-8"
              aria-label="Search certificates"
            />
          </div>
          <Select
            items={statusFilterItems}
            value={statusFilter}
            onValueChange={(value) => {
              if (typeof value === "string") setStatusFilter(value)
            }}
          >
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue>
                {(value) =>
                  statusFilterItems.find((item) => item.value === value)
                    ?.label ?? "All statuses"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusFilterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={[
              { value: "all", label: "All races" },
              ...raceRows.map((race) => ({
                value: race.id,
                label: race.name,
              })),
            ]}
            value={raceId}
            onValueChange={(value) => {
              if (typeof value === "string") setRaceId(value)
            }}
          >
            <SelectTrigger className="w-[170px]" aria-label="Filter by race">
              <SelectValue placeholder="All races" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All races</SelectItem>
              {raceRows.map((race) => (
                <SelectItem key={race.id} value={race.id}>
                  {race.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {certificates.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load certificates</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {certificates.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {!certificates.isPending && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Race</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status =
                    certificateStatuses[
                      row.certificate.status as keyof typeof certificateStatuses
                    ]
                  return (
                    <TableRow key={row.certificate.id}>
                      <TableCell className="font-mono text-xs">
                        {row.certificate.certificateNumber}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {row.participant.firstName} {row.participant.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.registration.bibNumber
                            ? `Bib ${row.registration.bibNumber}`
                            : row.registration.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        {row.race?.name ?? "—"}
                        {row.category ? ` · ${row.category.name}` : ""}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <StatusBadge
                            label={status.label}
                            tone={status.tone}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.certificate.issuedAt
                          ? formatDateTime(row.certificate.issuedAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {row.downloadUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.location.assign(`/api${row.downloadUrl}`)
                              }
                            >
                              <Download />
                              Download
                            </Button>
                          ) : null}
                          {canRevoke &&
                          row.certificate.status === "issued" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRevokeId(row.certificate.id)
                              }
                            >
                              <ShieldX />
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {!certificates.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Generate certificates for confirmed registrations."
          />
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={!pagination?.hasMore}
          >
            Next
          </Button>
        </div>

        <AlertDialog
          open={Boolean(revokeId)}
          onOpenChange={(open) => {
            if (!open) setRevokeId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke certificate?</AlertDialogTitle>
              <AlertDialogDescription>
                {revokeRow
                  ? `${revokeRow.certificate.certificateNumber} will be marked revoked. The file stays available to organizers.`
                  : "This certificate will be revoked."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void revokeConfirmed()}
              >
                Revoke certificate
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
