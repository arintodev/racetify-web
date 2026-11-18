"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, MoreHorizontal, Plus, RotateCw, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { CopyButton } from "@/components/copy-button"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { formatDate } from "@/lib/format"

import { OAUTH_CLIENT_STATUSES, scopeLabel, statusConfig } from "../constants"
import { OAuthClientForm } from "./oauth-client-form"
import { SecretDialog } from "./secret-dialog"

type Client = Schemas["OAuthClientDto"]

type SecretState = {
  title: string
  description: string
  secret: string
  clientId: string
}

export function OAuthClientsPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [secret, setSecret] = React.useState<SecretState | null>(null)
  const [rotateId, setRotateId] = React.useState<string | null>(null)
  const [revokeId, setRevokeId] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const clients = useQuery({
    queryKey: queryKeys.orgOAuthClients(orgId),
    queryFn: () =>
      getBrowserApi().request<Client[]>(`/v1/orgs/${orgId}/oauth-clients`),
    retry: false,
  })

  const rows = clients.data ?? []
  const rotateClient = rows.find((client) => client.id === rotateId)
  const revokeClient = rows.find((client) => client.id === revokeId)

  function invalidateClients() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.orgOAuthClients(orgId),
    })
  }

  async function rotateConfirmed() {
    if (!rotateId) return
    setPending(true)
    try {
      const rotated = await getBrowserApi().request<
        Schemas["OAuthClientSecretDto"]
      >(`/v1/orgs/${orgId}/oauth-clients/${rotateId}/rotate-secret`, {
        method: "POST",
      })
      setRotateId(null)
      setSecret({
        title: "New client secret",
        description:
          "The previous secret stays valid for 24 hours while the partner switches over.",
        secret: rotated.clientSecret,
        clientId: rotated.client.clientId,
      })
      invalidateClients()
    } catch (error) {
      toast.error("Could not rotate the client secret", {
        description:
          error instanceof ApiError ? error.detail : "Try again shortly.",
      })
    } finally {
      setPending(false)
    }
  }

  async function revokeConfirmed() {
    if (!revokeId) return
    setPending(true)
    try {
      await getBrowserApi().request(
        `/v1/orgs/${orgId}/oauth-clients/${revokeId}`,
        { method: "DELETE" }
      )
      setRevokeId(null)
      toast.success("OAuth client revoked", {
        description: "Its tokens were invalidated.",
      })
      invalidateClients()
    } catch (error) {
      toast.error("Could not revoke the OAuth client", {
        description:
          error instanceof ApiError ? error.detail : "Try again shortly.",
      })
    } finally {
      setPending(false)
    }
  }

  if (clients.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load OAuth clients</AlertTitle>
        <AlertDescription>
          {clients.error instanceof ApiError
            ? (clients.error.detail ?? clients.error.message)
            : "Check your access and connection."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Server-to-server credentials for partner backends. Each client is
          scoped to this organization.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Create client
        </Button>
      </div>

      {clients.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : null}

      {!clients.isPending && rows.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No OAuth clients"
          description="Create a client for each partner that needs server-to-server access."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Create client
            </Button>
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((client) => {
            const status = statusConfig(OAUTH_CLIENT_STATUSES, client.status)
            return (
              <Card key={client.id} className="min-w-0">
                <CardHeader>
                  <CardTitle className="min-w-0 truncate">
                    {client.name}
                  </CardTitle>
                  <CardDescription>
                    Created {formatDate(client.createdAt)}
                  </CardDescription>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${client.name}`}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => setRotateId(client.id)}
                        >
                          <RotateCw />
                          Rotate secret
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setRevokeId(client.id)}
                        >
                          <Trash2 />
                          Revoke client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Client ID
                    </p>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs">
                        {client.clientId}
                      </code>
                      <CopyButton
                        value={client.clientId}
                        label="Copy client ID"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={status.label} tone={status.tone} />
                    <span className="text-xs text-muted-foreground">
                      Secret ends ••••{client.secretLastFour}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {client.scopes.map((scope) => (
                      <Badge key={scope} variant="outline">
                        {scopeLabel(scope)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      <OAuthClientForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId}
        onCreated={(created) =>
          setSecret({
            title: "Client secret",
            description:
              "Use this client ID and secret in the partner backend. The secret is shown only once.",
            secret: created.clientSecret,
            clientId: created.client.clientId,
          })
        }
      />

      <SecretDialog
        open={Boolean(secret)}
        onOpenChange={(open) => {
          if (!open) setSecret(null)
        }}
        title={secret?.title ?? "Client secret"}
        description={secret?.description ?? ""}
        secret={secret?.secret ?? ""}
        contextLabel="Client ID"
        contextValue={secret?.clientId}
      />

      <AlertDialog
        open={Boolean(rotateId)}
        onOpenChange={(open) => {
          if (!open && !pending) setRotateId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the client secret?</AlertDialogTitle>
            <AlertDialogDescription>
              {rotateClient?.name ?? "This client"} will receive a new secret.
              The previous secret stays valid for 24 hours while the partner
              updates its configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => void rotateConfirmed()}
            >
              {pending ? "Rotating…" : "Rotate secret"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(revokeId)}
        onOpenChange={(open) => {
          if (!open && !pending) setRevokeId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this OAuth client?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeClient?.name ?? "This client"} loses access immediately:
              all of its tokens are invalidated. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => void revokeConfirmed()}
            >
              {pending ? "Revoking…" : "Revoke client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
