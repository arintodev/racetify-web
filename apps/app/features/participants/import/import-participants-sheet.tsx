"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import * as React from "react"
import { Download, FileUp, Loader2, Upload } from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import { getBrowserApi } from "@/lib/api/browser"
import { formatFileSize } from "@/lib/format"

const MAX_FILE_BYTES = 2 * 1024 * 1024

type Step = "upload" | "review" | "completed"

function issueTone(severity: string) {
  return severity === "error" ? "destructive" : "warning"
}

function importError(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail ?? error.issues[0]?.message ?? "The import failed."
  }
  return "The import failed. Try again."
}

export function ImportParticipantsSheet({
  eventId,
  open,
  onOpenChange,
  onCompleted,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}) {
  const [step, setStep] = React.useState<Step>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [importRecord, setImportRecord] = React.useState<
    Schemas["ParticipantImportDto"] | null
  >(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) {
      setStep("upload")
      setFile(null)
      setImportRecord(null)
      setError(null)
      setPending(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }, [open])

  function pickFile(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selected = changeEvent.target.files?.[0]
    if (!selected) return
    if (selected.size > MAX_FILE_BYTES) {
      setError("Import files must be 2 MB or smaller.")
      return
    }
    setError(null)
    setFile(selected)
  }

  async function upload() {
    if (!file) {
      setError("Choose a CSV file first.")
      return
    }
    setError(null)
    setPending(true)
    try {
      const result = await getBrowserApi().request<
        Schemas["ParticipantImportDto"]
      >(`/v1/events/${eventId}/participant-imports`, {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          "X-File-Name": file.name,
        },
        body: file,
      })
      setImportRecord(result)
      setStep("review")
    } catch (uploadError) {
      setError(importError(uploadError))
    } finally {
      setPending(false)
    }
  }

  async function commit() {
    if (!importRecord) return
    setError(null)
    setPending(true)
    try {
      const result = await getBrowserApi().request<
        Schemas["ParticipantImportDto"]
      >(`/v1/events/${eventId}/participant-imports/${importRecord.id}/commit`, {
        method: "POST",
      })
      setImportRecord(result)
      setStep("completed")
      onCompleted?.()
      toast.success("Participants imported", {
        description: `${result.result?.imported ?? 0} rows imported.`,
      })
    } catch (commitError) {
      setError(importError(commitError))
    } finally {
      setPending(false)
    }
  }

  async function cancelImport() {
    if (!importRecord) {
      onOpenChange(false)
      return
    }
    setPending(true)
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/participant-imports/${importRecord.id}/cancel`,
        { method: "POST" }
      )
    } catch {
      // The import may already be terminal; closing is safe either way.
    } finally {
      setPending(false)
      onOpenChange(false)
    }
  }

  function downloadTemplate() {
    window.location.assign(
      `/api/v1/events/${eventId}/participant-imports/template?download=true`
    )
  }

  function downloadErrorReport() {
    const url = importRecord?.result?.errorReportUrl
    if (!url) return
    window.location.assign(`/api${url}`)
  }

  const summary = importRecord?.summary
  const issues = importRecord?.issues ?? []
  const canCommit = importRecord?.status === "ready"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Import participants</SheetTitle>
          <SheetDescription>
            Download the fixed template, fill it in, and upload the CSV. The
            server validates the rows before anything is saved.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          {step === "upload" ? (
            <>
              <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
                <p className="text-sm font-medium">1. Download the template</p>
                <p className="text-xs text-muted-foreground">
                  Columns, example values, and limits are defined by the server.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={downloadTemplate}
                >
                  <Download />
                  Download CSV template
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <p className="text-sm font-medium">2. Upload your CSV</p>
                <Input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={pickFile}
                  aria-label="CSV file"
                />
                {file ? (
                  <p className="text-xs text-muted-foreground">
                    {file.name} · {formatFileSize(file.size)}
                  </p>
                ) : null}
              </div>

              <Alert>
                <AlertTitle>Fixed template</AlertTitle>
                <AlertDescription>
                  Column mapping is not supported in this phase. Use the
                  downloaded template headers as-is; up to 500 rows and 2 MB.
                </AlertDescription>
              </Alert>
            </>
          ) : null}

          {step === "review" && importRecord ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Total {summary?.total ?? importRecord.file.rowCount}
                </Badge>
                <Badge variant="outline">Valid {summary?.valid ?? 0}</Badge>
                <Badge variant="outline">Invalid {summary?.invalid ?? 0}</Badge>
                <Badge variant="outline">
                  Duplicates {summary?.duplicates ?? 0}
                </Badge>
                <Badge variant="outline">{importRecord.status}</Badge>
              </div>

              {issues.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    Issues ({issues.length})
                  </p>
                  <div className="max-h-64 overflow-y-auto rounded-md border">
                    <div className="divide-y">
                      {issues.slice(0, 100).map((issue, index) => (
                        <div
                          key={`${issue.rowNumber}-${issue.code}-${index}`}
                          className="flex flex-col gap-1 p-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                issueTone(issue.severity) === "destructive"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              Row {issue.rowNumber}
                            </Badge>
                            {issue.field ? (
                              <span className="text-xs text-muted-foreground">
                                {issue.field}
                              </span>
                            ) : null}
                          </div>
                          <p>{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>No validation issues</AlertTitle>
                  <AlertDescription>
                    The file is ready to import.
                  </AlertDescription>
                </Alert>
              )}

              {!canCommit ? (
                <Alert variant="destructive">
                  <AlertTitle>This file cannot be committed</AlertTitle>
                  <AlertDescription>
                    Fix the reported issues and upload a new file.
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : null}

          {step === "completed" && importRecord?.result ? (
            <>
              <Alert>
                <AlertTitle>Import completed</AlertTitle>
                <AlertDescription>
                  {importRecord.result.imported} imported,{" "}
                  {importRecord.result.skipped} skipped,{" "}
                  {importRecord.result.failed} failed.
                </AlertDescription>
              </Alert>
              {importRecord.result.errorReportUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={downloadErrorReport}
                >
                  <Download />
                  Download error report
                </Button>
              ) : null}
            </>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <SheetFooter className="flex-col gap-2 px-4 sm:flex-row">
          {step === "upload" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void upload()}
                disabled={pending || !file}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Upload />}
                {pending ? "Validating…" : "Upload and validate"}
              </Button>
            </>
          ) : null}

          {step === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void cancelImport()}
                disabled={pending}
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={() => void commit()}
                disabled={pending || !canCommit}
              >
                {pending ? <Loader2 className="animate-spin" /> : <FileUp />}
                {pending ? "Importing…" : "Import participants"}
              </Button>
            </>
          ) : null}

          {step === "completed" ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
