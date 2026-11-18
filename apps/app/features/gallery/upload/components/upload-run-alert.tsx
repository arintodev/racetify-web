"use client"

import { PauseCircle, TriangleAlert, XCircle } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"

import type { UploadTotals } from "../hooks/use-upload-workspace"
import type { UploadState } from "../lib/types"

type UploadRunAlertProps = {
  state: UploadState
  totals: UploadTotals
  isPaused: boolean
  onResume: () => void
  onRetryFailed: () => void
  onExportFailed: () => void
}

/** Only actionable alerts: paused, paused with an error, or nothing uploaded. */
export function UploadRunAlert({
  state,
  totals,
  isPaused,
  onResume,
  onRetryFailed,
  onExportFailed,
}: UploadRunAlertProps) {
  if (state.runner === "running" || state.runner === "stopping") return null

  const pending =
    totals.queued +
    totals.preparing +
    totals.ready +
    totals.uploading +
    totals.uploaded
  const failed = totals.failed
  const done = totals.completed

  if (state.runner === "paused-error") {
    return (
      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>Uploads need attention</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            A batch couldn&apos;t finish. Photos that already uploaded stay in
            the gallery.
          </p>
          <div className="flex flex-wrap gap-2">
            {failed > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetryFailed}
              >
                Retry failed ({failed})
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onResume}
              >
                Try again
              </Button>
            )}
            {failed > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onExportFailed}
              >
                Export failed
              </Button>
            ) : null}
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (isPaused && pending > 0) {
    return (
      <Alert>
        <PauseCircle aria-hidden="true" />
        <AlertTitle>Uploads paused</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {pending} photo{pending === 1 ? "" : "s"} are waiting. Resume to
            keep uploading.
          </p>
          <Button type="button" size="sm" onClick={onResume}>
            Resume uploads
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!state.hasUploaded && done === 0 && failed > 0 && pending === 0) {
    return (
      <Alert variant="destructive">
        <XCircle aria-hidden="true" />
        <AlertTitle>No photos could be uploaded</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Every photo in this batch failed. Retry them or export the list.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetryFailed}
            >
              Retry failed ({failed})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onExportFailed}
            >
              Export failed
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
