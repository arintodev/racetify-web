import { downloadBlob } from "@/lib/download"

import type { UploadItem } from "./types"

const HEADER = [
  "file_name",
  "folder_path",
  "original_size_bytes",
  "uploaded_size_bytes",
  "error_stage",
  "error_message",
  "retryable",
  "attempts",
  "server_file_id",
] as const

/** RFC 4180 cell escaping: quote values containing commas, quotes, or line breaks. */
function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildFailedCsv(items: UploadItem[]): string {
  const rows = items
    .filter((item) => item.status === "failed")
    .map((item) => [
      item.displayName,
      item.relativePath ?? "",
      item.originalSize,
      item.declaredSize,
      item.error?.stage ?? "",
      item.error?.message ?? "",
      item.error?.retryable ?? "",
      item.attempts,
      item.serverFileId ?? "",
    ])

  return [HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
}

function fileNameTimestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("-")
}

/** Downloads a CSV of every failed row. Returns how many rows were written. */
export function exportFailedUploads(items: UploadItem[]): number {
  const failed = items.filter((item) => item.status === "failed")
  if (failed.length === 0) return 0

  // The BOM keeps Excel from mangling non-ASCII file names.
  const csv = `﻿${buildFailedCsv(failed)}`
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `failed-uploads-${fileNameTimestamp()}.csv`
  )
  return failed.length
}
