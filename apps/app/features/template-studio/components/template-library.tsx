"use client"

import {
  Copy,
  Download,
  FileJson,
  FileText,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { formatDate } from "@/lib/format"

import { formatCanvasSize } from "../model/units"
import {
  getTemplateRepository,
  type DraftSummary,
} from "../repository"
import {
  downloadTemplateDocument,
  readTemplateFile,
  TemplateValidationError,
} from "../repository/json-transfer"

import { NewTemplateDialog } from "./new-template-dialog"

type ScopeFilter = "all" | "bib" | "certificate"

const SCOPE_LABELS: Record<ScopeFilter, string> = {
  all: "All",
  bib: "Bib",
  certificate: "Certificate",
}

export function TemplateLibrary({ eventId }: { eventId: string }) {
  const { repository } = getTemplateRepository()
  const [drafts, setDrafts] = React.useState<DraftSummary[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [newOpen, setNewOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [scope, setScope] = React.useState<ScopeFilter>("all")
  const [query, setQuery] = React.useState("")
  const importInputRef = React.useRef<HTMLInputElement>(null)

  const reload = React.useCallback(async (): Promise<void> => {
    try {
      setDrafts(await repository.list(eventId))
      setError(null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not read local drafts."
      )
    }
  }, [eventId, repository])

  React.useEffect(() => {
    void reload()
  }, [reload])

  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("scope")
    if (requested === "bib" || requested === "certificate") {
      setScope(requested)
    }
  }, [])

  const filtered = React.useMemo(() => {
    const rows = drafts ?? []
    const term = query.trim().toLowerCase()
    return rows.filter((draft) => {
      if (scope !== "all" && draft.scope !== scope) return false
      if (term && !draft.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [drafts, query, scope])

  async function duplicateDraft(draft: DraftSummary): Promise<void> {
    try {
      await repository.duplicate(eventId, draft.id)
      toast.success("Draft duplicated")
      await reload()
    } catch (duplicateError) {
      toast.error(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Could not duplicate the draft."
      )
    }
  }

  async function exportDraft(draft: DraftSummary): Promise<void> {
    try {
      const stored = await repository.get(eventId, draft.id)
      if (!stored) {
        toast.error("The draft could not be found.")
        return
      }
      downloadTemplateDocument(stored.document)
    } catch {
      toast.error("Could not export the draft.")
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteId) return
    try {
      await repository.delete(eventId, deleteId)
      toast.success("Draft deleted")
      setDeleteId(null)
      await reload()
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the draft."
      )
    }
  }

  async function importDraft(file: File | undefined): Promise<void> {
    if (!file) return
    try {
      const document = await readTemplateFile(file)
      await repository.create(eventId, document)
      toast.success("Template imported", { description: document.name })
      await reload()
    } catch (importError) {
      if (importError instanceof TemplateValidationError) {
        toast.error(importError.message, {
          description:
            importError.issues.length > 0
              ? importError.issues.join(" · ")
              : undefined,
        })
        return
      }
      toast.error("Could not import the template.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Template Studio"
        description="Design bib and certificate templates with dynamic participant data. Drafts stay in this browser until template storage is available."
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                void importDraft(file)
              }}
            />
            <Button
              variant="outline"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload />
              Import JSON
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus />
              New template
            </Button>
          </>
        }
      />

      <Alert>
        <FileJson />
        <AlertTitle>Local drafts</AlertTitle>
        <AlertDescription>
          These drafts are stored in this browser only. They are not yet used by
          bib or certificate generation. Export anything you want to keep or
          move to another device.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not read local drafts</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          placeholder="Search templates"
          aria-label="Search templates"
          className="h-8 w-full sm:w-64"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          items={Object.entries(SCOPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          value={scope}
          onValueChange={(value) => {
            if (typeof value === "string") setScope(value as ScopeFilter)
          }}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCOPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {drafts === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Create your first bib or certificate template. Start from a blank canvas or import an SVG."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus />
              New template
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates match"
          description="Try a different search term or clear the scope filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("")
                setScope("all")
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((draft) => (
            <Card key={draft.id} className="overflow-hidden p-0">
              <Link
                href={`/events/${eventId}/template-studio/${draft.id}`}
                className="flex aspect-[4/3] items-center justify-center border-b bg-muted/40"
              >
                {draft.thumbnailDataUrl ? (
                  // Data URLs are generated locally; the Next image optimizer is unnecessary.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.thumbnailDataUrl}
                    alt={`${draft.name} preview`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <FileText className="size-8 text-muted-foreground" />
                )}
              </Link>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{draft.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatCanvasSize(
                        draft.widthMm,
                        draft.heightMm,
                        draft.unit,
                        draft.dpi
                      )}{" "}
                      · {draft.objectCount}{" "}
                      {draft.objectCount === 1 ? "object" : "objects"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Actions for ${draft.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => void duplicateDraft(draft)}
                      >
                        <Copy />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void exportDraft(draft)}
                      >
                        <Download />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(draft.id)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {draft.scope === "bib" ? "Bib" : "Certificate"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(draft.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTemplateDialog
        key={scope}
        eventId={eventId}
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => void reload()}
        defaultScope={scope === "all" ? "certificate" : scope}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              The draft and its embedded images and fonts are removed from this
              browser. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogCancel
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete draft
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
