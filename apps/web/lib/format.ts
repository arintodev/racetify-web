const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

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

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatDate(value: string): string {
  return dayFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

export function formatDateTime(
  value: string,
  timeZone = "Asia/Jakarta"
): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(value))
}

export function formatTime(value: string, timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(value))
}

export function timeZoneLabel(timeZone: string): string {
  switch (timeZone) {
    case "Asia/Makassar":
      return "WITA"
    case "Asia/Jayapura":
      return "WIT"
    default:
      return "WIB"
  }
}

export function formatRaceStart(
  value: string,
  timeZone = "Asia/Jakarta"
): string {
  return `${formatDate(value)} · ${formatTime(value, timeZone)} ${timeZoneLabel(timeZone)}`
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value)
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

export function formatDistance(distanceKm: number): string {
  const value = Number.isInteger(distanceKm)
    ? distanceKm.toString()
    : distanceKm.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  return `${value} km`
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "—"

  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const minutesAndSeconds = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`

  return hours > 0 ? `${hours}:${minutesAndSeconds}` : minutesAndSeconds
}
