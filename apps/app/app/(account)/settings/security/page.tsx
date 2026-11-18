"use client"

import * as React from "react"
import { queryKeys, type Schemas } from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"

import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { useSession } from "@/lib/auth/session-provider"
import { formatDateTime } from "@/lib/format"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(12, "Use at least 12 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type PasswordValues = z.infer<typeof passwordSchema>

export default function SecuritySettingsPage() {
  const { session } = useSession()
  const queryClient = useQueryClient()

  const sessions = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () =>
      getBrowserApi().request<Schemas["SessionListDto"]>("/v1/auth/sessions"),
  })

  const hasOtherSessions = (sessions.data?.items ?? []).some(
    (item) => !item.current
  )

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const errors = form.formState.errors

  if (!session) return null

  async function onSubmit(values: PasswordValues) {
    try {
      await getBrowserApi().request("/v1/auth/password/change", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        } satisfies Schemas["ChangePasswordRequest"],
      })
      form.reset()
      toast.success("Password updated")
    } catch {
      toast.error("Could not update the password", {
        description: "Check the current password and try again.",
      })
    }
  }

  async function handleSignOutOtherSessions() {
    try {
      await getBrowserApi().request("/v1/auth/sessions", {
        method: "DELETE",
        query: { keepCurrent: true },
      })
      void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] })
      toast.success("Other sessions signed out")
    } catch {
      toast.error("Could not sign out other sessions")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security"
        description="Manage your password and active sessions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Use a strong password you do not reuse elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="grid gap-5 md:grid-cols-3">
              <Field data-invalid={Boolean(errors.currentPassword)}>
                <FieldLabel htmlFor="current-password">
                  Current password
                </FieldLabel>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.currentPassword)}
                  {...form.register("currentPassword")}
                />
                <FieldError errors={[errors.currentPassword]} />
              </Field>
              <Field data-invalid={Boolean(errors.newPassword)}>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.newPassword)}
                  {...form.register("newPassword")}
                />
                <FieldError errors={[errors.newPassword]} />
              </Field>
              <Field data-invalid={Boolean(errors.confirmPassword)}>
                <FieldLabel htmlFor="confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  {...form.register("confirmPassword")}
                />
                <FieldError errors={[errors.confirmPassword]} />
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}
                {form.formState.isSubmitting ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Devices currently signed in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(sessions.data?.items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {item.current ? (
                  <MonitorSmartphone className="size-5" />
                ) : (
                  <Smartphone className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {item.userAgent || "Unknown device"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.ipAddress ?? "Unknown IP"} · last active{" "}
                  {formatDateTime(item.lastSeenAt)}
                </p>
              </div>
              {item.current ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 />
                  This device
                </Badge>
              ) : null}
            </div>
          ))}
          {sessions.isPending ? (
            <p className="text-sm text-muted-foreground">Loading sessions…</p>
          ) : null}
          {sessions.data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Signing out other sessions keeps this browser signed in.
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" disabled={!hasOtherSessions} />}
            >
              <LogOut />
              Sign out other sessions
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out other sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  Any other device signed in to this account will be signed out.
                  The current browser stays signed in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogCancel
                  variant="destructive"
                  onClick={handleSignOutOtherSessions}
                >
                  Sign out
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        User ID: <span className="font-mono">{session.user.id}</span>
      </p>
    </div>
  )
}
