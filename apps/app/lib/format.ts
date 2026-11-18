const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("id-ID")

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

const zoneLabels: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDate(value: string): string {
  return dayFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

export function formatDateTime(
  value: string,
  timeZone = "Asia/Jakarta"
): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  })
  const label = zoneLabels[timeZone] ?? timeZone
  return `${formatter.format(new Date(value))} ${label}`
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!endDate || startDate === endDate) {
    return formatDate(startDate)
  }

  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()

  if (sameMonth) {
    return `${dayMonthFormatter.format(start)}–${dayFormatter.format(end)}`
  }

  return `${dayMonthFormatter.format(start)} – ${dayFormatter.format(end)}`
}

export function toDateTimeInput(value: string): string {
  return value.slice(0, 16)
}

export function formatDistance(distanceKm: number): string {
  const value = Number.isInteger(distanceKm)
    ? distanceKm.toString()
    : distanceKm.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  return `${value} km`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return `${first}${last}`.toUpperCase()
}
