"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { ScrollText } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

export default function EventAuditLogsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  return (
    <RequirePermission permission="event:audit:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit logs"
          description="Event activity is recorded in the organization audit log."
        />
        <EmptyState
          icon={ScrollText}
          title="Use the organization audit log"
          description="The API does not expose a separate event audit endpoint. Filter the organization audit log by this event's resources."
          action={
            event.data ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link href={`/orgs/${event.data.orgId}/audit-logs`} />
                }
              >
                Open organization audit log
              </Button>
            ) : undefined
          }
        />
      </div>
    </RequirePermission>
  )
}
