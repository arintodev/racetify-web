import type { UploadItem, UploadItemStatus } from "./types"

export type UploadStatusConfig = {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
}

/** Status language for the client-side upload run; there is no server processing poll. */
export const UPLOAD_STATUS: Record<UploadItemStatus, UploadStatusConfig> = {
  queued: { label: "Queued", variant: "outline" },
  preparing: { label: "Optimizing", variant: "secondary" },
  ready: { label: "Ready", variant: "outline" },
  uploading: { label: "Uploading", variant: "default" },
  uploaded: { label: "Finishing", variant: "secondary" },
  completed: { label: "Uploaded", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  canceled: { label: "Removed", variant: "outline" },
}

export function uploadStatusLabel(item: UploadItem): string {
  if (item.status === "uploading") {
    return `Uploading ${item.progress}%`
  }
  return UPLOAD_STATUS[item.status].label
}

/** Case-insensitive name and folder search over the queue. */
export function filterUploadItems(
  items: UploadItem[],
  query: string
): UploadItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items

  return items.filter((item) => {
    if (item.displayName.toLowerCase().includes(needle)) return true
    return item.relativePath?.toLowerCase().includes(needle) ?? false
  })
}
