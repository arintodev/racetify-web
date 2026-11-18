"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Mail, MoreHorizontal, Trash2, UserPlus, Users } from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDate, initials } from "@/lib/format"

type TeamMember = Schemas["EventTeamRowDto"]
type TeamRole = Schemas["TeamRoleOptionDto"]

export default function EventTeamPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [roleId, setRoleId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [removeId, setRemoveId] = React.useState<string | null>(null)

  const team = useQuery({
    queryKey: queryKeys.eventTeam(eventId),
    queryFn: () =>
      getBrowserApi().request<TeamMember[]>(`/v1/events/${eventId}/team`),
  })

  const roles = useQuery({
    queryKey: [...queryKeys.eventTeam(eventId), "roles"],
    queryFn: () =>
      getBrowserApi().request<TeamRole[]>(
        `/v1/events/${eventId}/team/roles`
      ),
  })

  const members = team.data ?? []
  const roleOptions = roles.data ?? []
  const removeMember = members.find((member) => member.id === removeId)

  React.useEffect(() => {
    if (!roleId && roleOptions.length > 0) {
      setRoleId(roleOptions[0]?.id ?? "")
    }
  }, [roleId, roleOptions])

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventTeam(eventId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventOverview(eventId),
    })
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !roleId) {
      setError("Enter an email and choose a role.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await getBrowserApi().request(`/v1/events/${eventId}/invitations`, {
        method: "POST",
        body: {
          email: email.trim(),
          roleId,
        } satisfies Schemas["CreateTeamInvitationRequest"],
      })
      toast.success("Invitation sent", { description: email.trim() })
      setInviteOpen(false)
      setEmail("")
      invalidate()
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Could not send the invitation."
      )
    } finally {
      setPending(false)
    }
  }

  async function changeRole(member: TeamMember, nextRoleId: string) {
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/team/${member.id}`,
        {
          method: "PATCH",
          body: {
            roleId: nextRoleId,
          } satisfies Schemas["UpdateTeamMemberRequest"],
        }
      )
      toast.success("Role updated")
      invalidate()
    } catch {
      toast.error("Could not update the member role")
    }
  }

  async function removeConfirmed() {
    if (!removeId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/team/${removeId}`,
        { method: "DELETE" }
      )
      toast.success("Team member removed")
      invalidate()
    } catch {
      toast.error("Could not remove the team member")
    } finally {
      setRemoveId(null)
    }
  }

  return (
    <RequirePermission permission="event:team:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Event team"
          description="People who can operate this event and the role assigned to each."
          actions={
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite member
            </Button>
          }
        />

        {team.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load the team</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {team.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {!team.isPending && members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite teammates to help run this event."
            action={
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus />
                Invite member
              </Button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            >
              <Avatar>
                <AvatarImage
                  src={member.user.avatarUrl ?? ""}
                  alt={member.user.name}
                />
                <AvatarFallback>{initials(member.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.user.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Badge variant={member.status === "active" ? "secondary" : "outline"}>
                {member.status}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Joined{" "}
                {member.joinedAt ? formatDate(member.joinedAt) : "—"}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${member.user.name}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {roleOptions.map((role) => (
                    <DropdownMenuItem
                      key={role.id}
                      disabled={role.id === member.role.id}
                      onClick={() => void changeRole(member, role.id)}
                    >
                      Set role: {role.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setRemoveId(member.id)}
                  >
                    <Trash2 />
                    Remove from event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Invite a team member</SheetTitle>
              <SheetDescription>
                The invitation is sent by email and grants access to this event.
              </SheetDescription>
            </SheetHeader>
            <form
              className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
              onSubmit={invite}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="team-email">Email</FieldLabel>
                  <Input
                    id="team-email"
                    type="email"
                    value={email}
                    onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                    placeholder="teammate@example.com"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <Select
                    items={roleOptions.map((role) => ({
                      value: role.id,
                      label: role.name,
                    }))}
                    value={roleId}
                    onValueChange={(value) => {
                      if (typeof value === "string") setRoleId(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not send the invitation</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <SheetFooter className="px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <Mail />}
                  {pending ? "Sending…" : "Send invitation"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <AlertDialog
          open={Boolean(removeId)}
          onOpenChange={(open) => {
            if (!open) setRemoveId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeMember?.user.name ?? "This member"} will lose access to
                the event. Their account is not deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void removeConfirmed()}
              >
                Remove member
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
