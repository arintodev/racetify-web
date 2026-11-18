"use client"

import { FileText } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"

import { ensureFontsLoaded } from "../engine/font-registry"
import type { TemplateDocument } from "../model/template-document"
import { getTemplateRepository } from "../repository"

import { TemplateStudio } from "./template-studio"

type LoadStatus = "loading" | "missing" | "error" | "ready"

export function TemplateStudioLoader() {
  const params = useParams<{ eventId: string; draftId: string }>()
  const [status, setStatus] = React.useState<LoadStatus>("loading")
  const [document, setDocument] = React.useState<TemplateDocument | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setStatus("loading")
    setDocument(null)
    const { repository } = getTemplateRepository()

    repository
      .get(params.eventId, params.draftId)
      .then(async (draft) => {
        if (cancelled) return
        if (!draft) {
          setStatus("missing")
          return
        }
        // Custom fonts must be available before Fabric measures any text.
        const failures = await ensureFontsLoaded(draft.document.fonts)
        if (cancelled) return
        if (failures.length > 0) {
          toast.warning("Some fonts could not be loaded", {
            description: failures.map((failure) => failure.message).join(" "),
          })
        }
        setDocument(draft.document)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [params.draftId, params.eventId])

  if (status === "loading") {
    return (
      <div className="flex h-[calc(100svh-4rem)] flex-col gap-3 p-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (status === "missing") {
    return (
      <EmptyState
        icon={FileText}
        title="Draft not found"
        description="This draft may have been deleted, or it lives in a different browser."
        action={
          <Button
            nativeButton={false}
            render={
              <Link href={`/events/${params.eventId}/template-studio`} />
            }
          >
            Back to templates
          </Button>
        }
      />
    )
  }

  if (status === "error" || !document) {
    return (
      <EmptyState
        icon={FileText}
        title="Could not open the draft"
        description="Browser storage could not be read. Try again from the template list."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/events/${params.eventId}/template-studio`} />
            }
          >
            Back to templates
          </Button>
        }
      />
    )
  }

  return (
    <TemplateStudio
      key={document.id}
      eventId={params.eventId}
      document={document}
    />
  )
}
