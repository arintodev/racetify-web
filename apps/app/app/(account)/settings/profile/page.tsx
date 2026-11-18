"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, Loader2, Save, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
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

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { uploadToPresignedUrl, type Schemas } from "@workspace/api-client"
import { useRouter } from "next/navigation"

import { getBrowserApi } from "@/lib/api/browser"
import { useSession } from "@/lib/auth/session-provider"
import { formatDate, formatDateTime, initials } from "@/lib/format"

const profileSchema = z.object({
  firstName: z.string().min(1, "Enter your first name."),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

export default function ProfileSettingsPage() {
  const { session } = useSession()
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: session?.user.firstName ?? "",
      lastName: session?.user.lastName ?? "",
      phone: session?.user.phone ?? "",
    },
  })

  const errors = form.formState.errors

  React.useEffect(() => {
    if (session) {
      form.reset({
        firstName: session.user.firstName,
        lastName: session.user.lastName ?? "",
        phone: session.user.phone ?? "",
      })
      setAvatarUrl(session.user.avatarUrl ?? null)
    }
  }, [form, session?.user.id, session?.user.avatarUrl])

  React.useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    }
  }, [avatarUrl])

  if (!session) return null

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    setAvatarFile(file)
    setAvatarUrl(URL.createObjectURL(file))
    toast.info("Photo selected", {
      description: "Save changes to upload it.",
    })
  }

  function removeAvatar() {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    setAvatarFile(null)
    setAvatarUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function uploadAvatar(file: File) {
    const upload = await getBrowserApi().request<Schemas["AvatarUploadDto"]>(
      "/v1/me/avatar",
      {
        method: "POST",
        body: {
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        } satisfies Schemas["AvatarUploadRequest"],
      }
    )

    await uploadToPresignedUrl({
      upload: {
        uploadUrl: upload.uploadUrl,
        method: upload.method,
        headers: upload.headers,
        expiresAt: upload.expiresAt,
      },
      body: file,
    })

    return upload.uploadId
  }

  async function onSubmit(values: ProfileValues) {
    try {
      const avatarUploadId = avatarFile
        ? await uploadAvatar(avatarFile)
        : undefined
      await getBrowserApi().request("/v1/me", {
        method: "PATCH",
        body: {
          firstName: values.firstName.trim(),
          lastName: values.lastName?.trim() ?? "",
          phone: values.phone?.trim() || null,
          avatarUploadId,
          ...(avatarUrl === null ? { avatarUrl: "" } : {}),
        } satisfies Schemas["UpdateProfileRequest"],
      })
      setAvatarFile(null)
      toast.success("Profile updated")
      router.refresh()
    } catch {
      toast.error("Could not update the profile", {
        description: "Check the fields and try again.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Manage the name, contact details, and profile photo used across your workspaces."
        actions={
          <StatusBadge
            label={session.user.status === "active" ? "Active" : "Suspended"}
            tone={session.user.status === "active" ? "success" : "warning"}
          />
        }
      />

      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>
              A square image works best. The new photo uploads when you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={session.user.name} />
              ) : null}
              <AvatarFallback className="text-lg">
                {initials(session.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera />
                Change photo
              </Button>
              {avatarUrl ? (
                <Button type="button" variant="ghost" onClick={removeAvatar}>
                  <Trash2 />
                  Remove
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              This information appears on invitations and team listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.firstName)}>
                <FieldLabel htmlFor="first-name">First name</FieldLabel>
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  aria-invalid={Boolean(errors.firstName)}
                  {...form.register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field data-invalid={Boolean(errors.lastName)}>
                <FieldLabel htmlFor="last-name">Last name (optional)</FieldLabel>
                <Input
                  id="last-name"
                  autoComplete="family-name"
                  aria-invalid={Boolean(errors.lastName)}
                  {...form.register("lastName")}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
              <div className="space-y-2">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email changes are not available yet.
                </p>
              </div>
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  {...form.register("phone")}
                />
                <FieldError errors={[errors.phone]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Read-only account details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="mt-1 font-medium">
                {formatDate(session.user.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last login</p>
              <p className="mt-1 font-medium">
                {session.user.lastLoginAt
                  ? formatDateTime(session.user.lastLoginAt)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="mt-1 font-mono text-xs">{session.user.id}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset()
              removeAvatar()
            }}
            disabled={form.formState.isSubmitting}
          >
            Reset
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
