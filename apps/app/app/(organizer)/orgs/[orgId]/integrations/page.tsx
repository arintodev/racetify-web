"use client"

import { useParams } from "next/navigation"

import { IntegrationsPage } from "@/features/integrations/components/integrations-page"
import { RequirePermission } from "@/lib/auth/require-permission"

export default function OrganizationIntegrationsPage() {
  const params = useParams<{ orgId: string }>()

  return (
    <RequirePermission permission="org:webhooks:manage">
      <IntegrationsPage orgId={params.orgId} />
    </RequirePermission>
  )
}
