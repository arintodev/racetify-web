"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Building2,
  CalendarDays,
  Flag,
  LogOut,
  Mail,
  Users,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { BrandMark } from "@/components/brand-mark"
import { StatusBadge } from "@/components/status-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { getBrowserApi } from "@/lib/api/browser"
import { useSession } from "@/lib/auth/session-provider"
import { formatDateRange } from "@/lib/format"
import { eventStatuses, organizationStatuses } from "@/lib/status"

export default function WorkspacesPage() {
  const { session, signOut } = useSession()

  const workspaces = useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: () =>
      getBrowserApi().request<Schemas["WorkspacesDto"]>("/v1/me/workspaces"),
  })

  if (!session) return null

  const organizations = workspaces.data?.organizations ?? []
  const events = workspaces.data?.events ?? []
  const organizationNames = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  )

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandMark showSubtitle />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Choose a workspace
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Organizations and events are separate workspaces. Open an
            organization to manage its events and members, or jump straight into
            an event to run its operations.
          </p>
        </div>

        {workspaces.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {workspaces.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Could not load workspaces</CardTitle>
              <CardDescription>
                Check your connection and try again.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={() => workspaces.refetch()}>
                Retry
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {!workspaces.isPending &&
        !workspaces.isError &&
        organizations.length === 0 &&
        events.length === 0 ? (
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Mail className="size-5" />
              </div>
              <CardTitle>No workspaces yet</CardTitle>
              <CardDescription>
                Organizations are created and activated by a Racetify platform
                administrator. If you expect access, ask your organization owner
                to invite {session.user.email}; invitations arrive by email.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {organizations.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Organizations</h2>
              <p className="text-sm text-muted-foreground">
                {organizations.length} workspaces available
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => {
                const status =
                  organizationStatuses[
                    organization.status as keyof typeof organizationStatuses
                  ]
                const usable = organization.status === "active"

                return (
                <Card key={organization.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate">
                            {organization.name}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {organization.role.name}
                          </CardDescription>
                        </div>
                      </div>
                      {status ? (
                        <StatusBadge label={status.label} tone={status.tone} />
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">Events</p>
                      <p className="font-medium tabular-nums">
                        {organization.eventCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="truncate font-medium">
                        {organization.role.name}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-2">
                    {usable ? (
                      <Button
                        nativeButton={false}
                        className="w-full"
                        render={
                          <Link href={`/orgs/${organization.id}/overview`} />
                        }
                      >
                        Open organization
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        {organization.status === "pending"
                          ? "Awaiting activation"
                          : "Unavailable"}
                      </Button>
                    )}
                    {usable ? null : (
                      <p className="text-xs text-muted-foreground">
                        {organization.status === "pending"
                          ? "A Racetify platform administrator must activate this organization before it can be used."
                          : "This organization is suspended or archived. Contact a Racetify administrator."}
                      </p>
                    )}
                  </CardFooter>
                </Card>
                )
              })}
            </div>
          </section>
        ) : null}

        {events.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Events</h2>
              <p className="text-sm text-muted-foreground">
                Event workspaces you can access
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => {
                const status =
                  eventStatuses[event.status as keyof typeof eventStatuses]
                return (
                  <Card key={event.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Flag className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate">
                              {event.name}
                            </CardTitle>
                            <CardDescription className="truncate">
                              {organizationNames.get(event.orgId) ??
                                "Organization"}
                            </CardDescription>
                          </div>
                        </div>
                        {status ? (
                          <StatusBadge
                            label={status.label}
                            tone={status.tone}
                          />
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="size-4" />
                        {formatDateRange(event.startDate, event.endDate)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-4" />
                        {event.accessSource === "event"
                          ? "Event team access"
                          : "Organization access"}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        nativeButton={false}
                        className="w-full"
                        variant="outline"
                        render={<Link href={`/events/${event.id}/overview`} />}
                      >
                        Open event
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
