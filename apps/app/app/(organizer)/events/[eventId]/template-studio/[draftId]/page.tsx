"use client"

import { TemplateStudioLoader } from "@/features/template-studio"
import { RequirePermission } from "@/lib/auth/require-permission"

export default function TemplateStudioEditorPage() {
  return (
    <RequirePermission permission="event:generators:manage">
      <TemplateStudioLoader />
    </RequirePermission>
  )
}
