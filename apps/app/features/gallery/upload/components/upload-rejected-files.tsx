"use client"

import { TriangleAlert } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { formatNumber } from "@/lib/format"

import type { RejectedFile } from "../lib/types"

type UploadRejectedFilesProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rejected: RejectedFile[]
  total: number
  onClear: () => void
}

/** Validation failures (unsupported types, oversized files, duplicates, etc.). */
export function UploadRejectedFiles({
  open,
  onOpenChange,
  rejected,
  total,
  onClear,
}: UploadRejectedFilesProps) {
  if (total === 0) return null

  const hidden = total - rejected.length

  return (
    <>
      <Alert>
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>
          {formatNumber(total)} file{total === 1 ? "" : "s"} skipped
        </AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>These files were not added to the queue.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(true)}
          >
            Review
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Skipped files ({formatNumber(total)})</DialogTitle>
            <DialogDescription>
              Unsupported, oversized, or duplicate files are not uploaded.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-1 overflow-auto rounded-lg border p-2">
            {rejected.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex flex-col rounded-md px-2 py-1"
              >
                <span
                  className="truncate text-sm font-medium"
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {file.reason}
                </span>
              </div>
            ))}
            {hidden > 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                …and {formatNumber(hidden)} more. Add smaller groups to review
                them.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClear}>
              Clear list
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
