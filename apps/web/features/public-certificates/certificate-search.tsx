"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  FileSearch,
  Loader2,
  Search,
  TriangleAlert,
  X,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Badge,
} from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import type { Schemas } from "@workspace/api-client"

import { searchCertificates } from "./actions"

const statusLabel: Record<string, string> = {
  pending: "Pending",
  issued: "Issued",
  revoked: "Revoked",
}

export function CertificateSearch({ eventSlug }: { eventSlug: string }) {
  const [query, setQuery] = React.useState("")
  const [result, setResult] =
    React.useState<Schemas["PublicCertificateSearchDto"] | null>(null)
  const [pending, setPending] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResult(null)
      setPending(false)
      setFailed(false)
      return
    }

    setPending(true)
    setFailed(false)
    let cancelled = false

    const timer = window.setTimeout(async () => {
      try {
        const next = await searchCertificates(eventSlug, trimmed)
        if (!cancelled) setResult(next)
      } catch {
        if (!cancelled) {
          setFailed(true)
          setResult(null)
        }
      } finally {
        if (!cancelled) setPending(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [eventSlug, query])

  const trimmedQuery = query.trim()
  const hasQuery = trimmedQuery.length >= 2

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Certificate number, participant name, or bib"
          className="pr-9 pl-8"
          aria-label="Search certificates"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear certificate search"
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {pending
          ? "Searching certificates…"
          : failed
            ? "Search failed. Try again."
            : result
              ? `${result.candidates.length} ${result.candidates.length === 1 ? "candidate" : "candidates"} found.`
              : ""}
      </p>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
          <FileSearch className="size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Find your certificate</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Enter at least 2 characters. For privacy, only the top 3 matches are
            shown. Certificates can be found by certificate number, participant
            name, or bib number.
          </p>
        </div>
      ) : null}

      {pending && !result ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching…
        </div>
      ) : null}

      {hasQuery && result && result.candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
          <FileSearch className="size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No certificates match</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Check the certificate number on your confirmation, or try the full
            participant name or bib number.
          </p>
        </div>
      ) : null}

      {result && result.candidates.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {result.candidates.map((candidate) => (
            <li
              key={candidate.certificateNumber}
              className="rounded-xl border bg-card p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium">
                    {candidate.participantName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.raceName} · {candidate.categoryName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {candidate.certificateNumber}
                  </p>
                </div>
                <Badge
                  variant={
                    candidate.status === "issued" ? "secondary" : "outline"
                  }
                >
                  {statusLabel[candidate.status] ?? candidate.status}
                </Badge>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/cert/${candidate.certificateNumber}`} />
                  }
                >
                  View certificate
                  <ArrowRight />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {result?.hasMore ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Narrow your search</AlertTitle>
          <AlertDescription>
            More certificates match than can be shown. Add the full participant
            name, bib number, or certificate number to narrow the results.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
