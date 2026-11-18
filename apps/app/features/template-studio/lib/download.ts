import { downloadBlob } from "@/lib/download"

export { downloadBlob }

export function downloadJson(value: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  })
  downloadBlob(blob, fileName)
}

export function safeFileBaseName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return cleaned || "template"
}
