"use client"

import { Loader2 } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { CardTitle } from "@workspace/ui/components/card"

import { formatNumber } from "@/lib/format"

import type { UploadTotals } from "../hooks/use-upload-workspace"
import type { UploadState } from "../lib/types"

type UploadQueueSummaryProps = {
  state: UploadState
  totals: UploadTotals
}

/** Queue title and live stat badges. */
export function UploadQueueSummary({ state, totals }: UploadQueueSummaryProps) {
  const running = state.runner === "running" || state.runner === "stopping"
  const batch = state.activeBatchId
    ? state.batchesById[state.activeBatchId]
    : null
  const waiting = totals.queued + totals.preparing + totals.ready
  const inFlight = totals.uploading + totals.uploaded

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className="mr-auto">Upload queue</CardTitle>
        {running && batch ? (
          <Badge variant="secondary" className="tabular-nums">
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {state.runner === "stopping"
              ? `Stopping after batch ${batch.seq}`
              : `Batch ${batch.seq} of ≈${totals.batches}`}
          </Badge>
        ) : null}
      </div>

      {totals.total > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="tabular-nums">
              {formatNumber(totals.total)} total
            </Badge>
            {waiting > 0 ? (
              <Badge variant="outline" className="tabular-nums">
                {formatNumber(waiting)} waiting
              </Badge>
            ) : null}
            {inFlight > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {formatNumber(inFlight)} uploading
              </Badge>
            ) : null}
            {totals.completed > 0 ? (
              <Badge variant="outline" className="tabular-nums">
                {formatNumber(totals.completed)} uploaded
              </Badge>
            ) : null}
            {totals.failed > 0 ? (
              <Badge variant="destructive" className="tabular-nums">
                {formatNumber(totals.failed)} failed
              </Badge>
            ) : null}
          </div>

          {running ? (
            <p className="text-xs text-muted-foreground">
              Batches of up to 100 continue automatically. Keep this tab open
              while photos upload.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
