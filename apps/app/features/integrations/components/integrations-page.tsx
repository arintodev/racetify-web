"use client"

import { KeyRound, Webhook } from "lucide-react"
import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { PageHeader } from "@/components/page-header"
import { useCan } from "@/lib/auth/session-provider"

import { OAuthClientsPanel } from "./oauth-clients-panel"
import { WebhookPanel } from "./webhook-panel"

export function IntegrationsPage({ orgId }: { orgId: string }) {
  const canManageClients = useCan("org:face-enrollments:manage")
  const [tab, setTab] = React.useState<string>(
    canManageClients ? "clients" : "webhooks"
  )

  React.useEffect(() => {
    if (!canManageClients && tab === "clients") setTab("webhooks")
  }, [canManageClients, tab])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="OAuth clients and signed webhook subscriptions for partner access."
        actions={<Badge variant="outline">Owner only</Badge>}
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value === "string") setTab(value)
        }}
      >
        <TabsList>
          {canManageClients ? (
            <TabsTrigger value="clients">
              <KeyRound />
              OAuth clients
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="webhooks">
            <Webhook />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {canManageClients ? (
          <TabsContent value="clients" className="pt-2">
            <OAuthClientsPanel orgId={orgId} />
          </TabsContent>
        ) : null}

        <TabsContent value="webhooks" className="pt-2">
          <WebhookPanel orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
