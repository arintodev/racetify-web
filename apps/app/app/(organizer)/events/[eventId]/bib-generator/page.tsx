"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Download,
  FileText,
  LayoutTemplate,
  Loader2,
  Play,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

type Job = Schemas["GeneratedDocumentJobDto"]

export default function BibGeneratorPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = React.useState("")
  const [raceId, setRaceId] = React.useState("all")
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(false)

  const templates = useQuery({
    queryKey: [...queryKeys.templates(eventId), "bib"],
    queryFn: () =>
      getBrowserApi().request<Schemas["GeneratorTemplateDto"][]>(
        `/v1/events/${eventId}/generator-templates`,
        { query: { scope: "bib" } }
      ),
  })

  const races = useQuery({
    queryKey: queryKeys.eventRaces(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["RaceDto"][]>(
        `/v1/events/${eventId}/races`
      ),
  })

  const participants = useQuery({
    queryKey: queryKeys.participants(eventId, {
      status: "confirmed",
      raceId: raceId === "all" ? undefined : raceId,
      limit: 100,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<Schemas["ParticipantRowDto"][]>(
        `/v1/events/${eventId}/participants`,
        {
          query: {
            status: "confirmed",
            raceId: raceId === "all" ? undefined : raceId,
            limit: 100,
          },
        }
      ),
  })

  const jobs = useQuery({
    queryKey: queryKeys.documentJobs(eventId, { type: "bib" }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<Job[]>(
        `/v1/events/${eventId}/generated-documents`,
        { query: { type: "bib", limit: 20 } }
      ),
  })

  const job = useQuery({
    queryKey: [...queryKeys.documentJobs(eventId, { type: "bib" }), jobId],
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

  const templateRows = templates.data ?? []
  const raceRows = races.data ?? []
  const recipientCount = participants.data?.data.length ?? 0

  React.useEffect(() => {
    if (!templateId && templateRows.length > 0) {
      setTemplateId(templateRows[0]?.id ?? "")
    }
  }, [templateId, templateRows])

  async function generate() {
    if (!templateId) {
      toast.error("Choose a bib template first")
      return
    }
    setStarting(true)
    try {
      const created = await getBrowserApi().request<Job>(
        `/v1/events/${eventId}/generated-documents`,
        {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: {
            templateId,
            type: "bib",
            recipientFilter: {
              status: "confirmed",
              raceId: raceId === "all" ? undefined : raceId,
            },
          } satisfies Schemas["CreateDocumentJobRequest"],
        }
      )
      setJobId(created.id)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentJobs(eventId, { type: "bib" }),
      })
      toast.success("Bib generation started")
    } catch {
      toast.error("Could not start bib generation")
    } finally {
      setStarting(false)
    }
  }

  function download(jobRow: Job) {
    if (!jobRow.output?.downloadUrl) return
    window.location.assign(`/api${jobRow.output.downloadUrl}`)
  }

  const current = job.data

  return (
    <RequirePermission permission="event:generators:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Bib generator"
          description="Render printable bibs from a bib template for confirmed participants."
          actions={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/events/${eventId}/template-studio?scope=bib`}
                />
              }
            >
              <LayoutTemplate />
              Template Studio
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Generate bibs</CardTitle>
            <CardDescription>
              Choose a template and optionally limit the batch to one race.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load templates</AlertTitle>
                <AlertDescription>
                  Create a bib-scoped template before generating.
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
              <Badge variant="secondary">
                {participants.isPending
                  ? "Loading participants…"
                  : `${recipientCount} confirmed participants`}
              </Badge>
              <Button
                onClick={() => void generate()}
                disabled={starting || !templateId}
              >
                {starting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play />
                )}
                {starting ? "Starting…" : "Generate bibs"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {current ? (
          <Card>
            <CardHeader>
              <CardTitle>Current job</CardTitle>
              <CardDescription className="font-mono text-xs">
                {current.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{current.status}</Badge>
                <Badge variant="outline">
                  {current.progress.processed} / {current.progress.total}
                </Badge>
              </div>
              <Progress
                value={
                  current.progress.total > 0
                    ? (current.progress.processed / current.progress.total) * 100
                    : 0
                }
              />
              {current.error ? (
                <Alert variant="destructive">
                  <AlertTitle>{current.error.code}</AlertTitle>
                  <AlertDescription>{current.error.message}</AlertDescription>
                </Alert>
              ) : null}
              {current.output?.downloadUrl ? (
                <Button
                  variant="outline"
                  onClick={() => download(current)}
                >
                  <Download />
                  Download bibs
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent batches</CardTitle>
            <CardDescription>Bib jobs for this event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.isPending ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : null}
            {(jobs.data?.data ?? []).map((jobRow) => (
              <div
                key={jobRow.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{jobRow.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(jobRow.createdAt)} ·{" "}
                    {jobRow.progress.succeeded} succeeded,{" "}
                    {jobRow.progress.failed} failed
                  </p>
                </div>
                <Badge variant="outline">{jobRow.status}</Badge>
                {jobRow.output?.downloadUrl ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(jobRow)}
                  >
                    <Download />
                    Download
                  </Button>
                ) : null}
              </div>
            ))}
            {!jobs.isPending && (jobs.data?.data.length ?? 0) === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No bib batches yet"
                description="Generated bibs will appear here."
              />
            ) : null}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Bib templates are managed through the generator templates API; this
          screen generates a document job from the selected template.
        </p>
      </div>
    </RequirePermission>
  )
}
