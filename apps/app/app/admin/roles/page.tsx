"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

type Role = Schemas["SystemRoleDto"]
type Permission = Schemas["AdminPermissionDto"]

function permissionName(permission: Permission) {
  return `${permission.scope}:${permission.resource}:${permission.action}`
}

export default function AdminRolesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [editing, setEditing] = React.useState<Role | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const roles = useQuery({
    queryKey: queryKeys.adminRoles(),
    queryFn: () =>
      getBrowserApi().request<Role[]>("/v1/admin/roles"),
  })

  const permissions = useQuery({
    queryKey: queryKeys.adminPermissions(),
    queryFn: () =>
      getBrowserApi().request<Permission[]>("/v1/admin/permissions"),
  })

  const roleRows = roles.data ?? []
  const permissionRows = permissions.data ?? []
  const deleteRole = roleRows.find((role) => role.id === deleteId)

  function openCreate() {
    setEditing(null)
    setName("")
    setDescription("")
    setSelected(new Set())
    setDialogOpen(true)
  }

  function openEdit(role: Role) {
    setEditing(role)
    setName(role.name)
    setDescription(role.description ?? "")
    setSelected(new Set(role.permissions))
    setDialogOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Role name is required")
      return
    }
    setPending(true)
    try {
      if (editing) {
        await getBrowserApi().request(`/v1/admin/roles/${editing.id}`, {
          method: "PATCH",
          body: {
            name: name.trim(),
            description: description.trim() || null,
          } satisfies Schemas["UpdateSystemRoleRequest"],
        })
        await getBrowserApi().request(
          `/v1/admin/roles/${editing.id}/permissions`,
          {
            method: "PUT",
            body: { permissions: [...selected] } satisfies Schemas["ReplacePermissionsRequest"],
          }
        )
      } else {
        await getBrowserApi().request("/v1/admin/roles", {
          method: "POST",
          body: {
            name: name.trim(),
            description: description.trim() || null,
            permissions: [...selected],
          } satisfies Schemas["CreateSystemRoleRequest"],
        })
      }
      toast.success(editing ? "Role updated" : "Role created")
      setDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles() })
    } catch {
      toast.error("Could not save the role")
    } finally {
      setPending(false)
    }
  }

  async function deleteConfirmed() {
    if (!deleteId) return
    try {
      await getBrowserApi().request(`/v1/admin/roles/${deleteId}`, {
        method: "DELETE",
      })
      toast.success("Role deleted")
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles() })
    } catch {
      toast.error("Could not delete the role")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <RequirePermission permission="system:roles:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="System roles"
          description="Platform roles control access to tenants, users, webhooks, jobs, and audit logs."
          actions={
            <Button onClick={openCreate}>
              <Plus />
              New role
            </Button>
          }
        />

        {roles.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load roles</AlertTitle>
            <AlertDescription>
              Check your administrator access and connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {roles.isPending ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}

        {!roles.isPending && roleRows.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No system roles"
            description="Create a custom platform role."
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roleRows.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{role.name}</CardTitle>
                    <CardDescription className="truncate">
                      {role.slug} · {role.userCount} users
                    </CardDescription>
                  </div>
                  <Badge variant={role.isSystem ? "secondary" : "outline"}>
                    {role.isSystem ? "Seeded" : "Custom"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {role.description || "No description"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="gap-1">
                    <KeyRound />
                    {role.permissions.length} permissions
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                    Manage
                  </Button>
                  {!role.isSystem ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${role.name}`}
                      onClick={() => setDeleteId(role.id)}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit role" : "New system role"}</DialogTitle>
              <DialogDescription>
                Roles bundle platform permissions. Seeded roles cannot be
                deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="role-name">Name</FieldLabel>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(changeEvent) => setName(changeEvent.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-description">Description</FieldLabel>
                <Textarea
                  id="role-description"
                  value={description}
                  onChange={(changeEvent) =>
                    setDescription(changeEvent.target.value)
                  }
                />
              </Field>
              <div className="space-y-3">
                <p className="text-sm font-medium">Permissions</p>
                {permissionRows.map((permission) => {
                  const key = permissionName(permission)
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 rounded-md border p-2"
                    >
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={(checked) =>
                          setSelected((current) => {
                            const next = new Set(current)
                            if (checked === true) next.add(key)
                            else next.delete(key)
                            return next
                          })
                        }
                        aria-label={key}
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-xs">{key}</p>
                        <p className="text-xs text-muted-foreground">
                          {permission.description || permission.module}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? "Saving…" : "Save role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete role?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRole?.name ?? "This role"} will be deleted. Roles with
                assigned users may be protected by the API.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void deleteConfirmed()}
              >
                Delete role
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
