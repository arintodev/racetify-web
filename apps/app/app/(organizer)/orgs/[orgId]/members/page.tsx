"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail, MoreHorizontal, Search, Trash2, UserPlus, Users } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDate, initials } from "@/lib/format"

type Member = Schemas["MemberRowDto"]
type Role = Schemas["OrganizationRoleDto"]

export default function OrganizationMembersPage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId
  const queryClient = useQueryClient()
  const [query, setQuery] = React.useState("")
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [roleId, setRoleId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [removeId, setRemoveId] = React.useState<string | null>(null)

  const members = useQuery({
    queryKey: queryKeys.orgMembers(orgId, { q: query.trim() }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<Member[]>(`/v1/orgs/${orgId}/members`, {
        query: { q: query.trim() || undefined, limit: 50 },
      }),
  })

  const roles = useQuery({
    queryKey: queryKeys.orgRoles(orgId),
    queryFn: () =>
      getBrowserApi().request<Role[]>(`/v1/orgs/${orgId}/roles`),
    retry: false,
  })

  const rows = members.data?.data ?? []
  const roleRows = roles.data ?? []
  const removeMember = rows.find((member) => member.id === removeId)

  React.useEffect(() => {
    if (!roleId && roleRows.length > 0) setRoleId(roleRows[0]?.id ?? "")
  }, [roleId, roleRows])

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["org", orgId, "members"],
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.orgOverview(orgId),
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
      await getBrowserApi().request(`/v1/orgs/${orgId}/invitations`, {
        method: "POST",
        body: {
          email: email.trim(),
          roleId,
        } satisfies Schemas["CreateInvitationRequest"],
      })
      toast.success("Invitation sent", { description: email.trim() })
      setInviteOpen(false)
      setEmail("")
      invalidate()
    } catch {
      setError("Could not send the invitation.")
    } finally {
      setPending(false)
    }
  }

  async function changeRole(member: Member, nextRoleId: string) {
    try {
      await getBrowserApi().request(
        `/v1/orgs/${orgId}/members/${member.id}`,
        {
          method: "PATCH",
          body: { roleId: nextRoleId } satisfies Schemas["UpdateMemberRequest"],
        }
      )
      toast.success("Member role updated")
      invalidate()
    } catch {
      toast.error("Could not update the member role")
    }
  }

  async function removeConfirmed() {
    if (!removeId) return
    try {
      await getBrowserApi().request(
        `/v1/orgs/${orgId}/members/${removeId}`,
        { method: "DELETE" }
      )
      toast.success("Member removed")
      invalidate()
    } catch {
      toast.error("Could not remove the member")
    } finally {
      setRemoveId(null)
    }
  }

  return (
    <RequirePermission permission="org:members:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Members"
          description="People with access to this organization."
          actions={
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite member
            </Button>
          }
        />

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search name or email"
            className="pl-8"
            aria-label="Search members"
          />
        </div>

        {members.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load members</AlertTitle>
            <AlertDescription>
              Check your access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {members.isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {!members.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members match this search"
            description="Invite a teammate or try a different search."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={member.user.avatarUrl ?? ""}
                            alt={member.user.name}
                          />
                          <AvatarFallback>
                            {initials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {member.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.joinedAt ? formatDate(member.joinedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
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
                          {roleRows.map((role) => (
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
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Invite a member</SheetTitle>
              <SheetDescription>
                The invitation is sent by email.
              </SheetDescription>
            </SheetHeader>
            <form className="flex flex-1 flex-col gap-5 px-4" onSubmit={invite}>
              <div className="space-y-2">
                <p className="text-sm font-medium">Email</p>
                <Input
                  type="email"
                  value={email}
                  onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                  placeholder="teammate@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Role</p>
                <Select
                  items={roleRows.map((role) => ({
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
                    {roleRows.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeMember?.user.name ?? "This member"} will lose access to
                the organization. Their account is not deleted.
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
