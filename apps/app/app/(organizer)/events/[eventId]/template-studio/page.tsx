"use client"

import { useParams } from "next/navigation"

import { TemplateLibrary } from "@/features/template-studio"
import { RequirePermission } from "@/lib/auth/require-permission"

export default function TemplateStudioPage() {
  const params = useParams<{ eventId: string }>()

  return (
    <RequirePermission permission="event:generators:manage">
      <TemplateLibrary eventId={params.eventId} />
    </RequirePermission>
  )
}
