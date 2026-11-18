"use client"

import {
  queryKeys,
  uploadToPresignedUrl,
  type Schemas,
} from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, Loader2, Save, Trash2 } from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
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
  FieldDescription,
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { initials } from "@/lib/format"
import { organizationStatuses } from "@/lib/status"

const timezones = [
  { value: "Asia/Jakarta", label: "Jakarta · WIB (UTC+7)" },
  { value: "Asia/Makassar", label: "Makassar / Bali · WITA (UTC+8)" },
  { value: "Asia/Jayapura", label: "Jayapura · WIT (UTC+9)" },
]

const schema = z.object({
  name: z.string().min(2, "Organization name is required."),
  description: z.string().max(500).optional(),
  email: z.string().email("Enter a valid email address.").or(z.literal("")),
  phone: z.string().max(30).optional(),
  website: z
    .string()
    .url("Enter a valid URL.")
    .or(z.literal(""))
    .optional(),
  timezone: z.string().min(1),
  publicContact: z.boolean(),
})

type Values = z.infer<typeof schema>

export default function OrganizationSettingsPage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)

  const organization = useQuery({
    queryKey: queryKeys.org(orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["OrganizationDto"]>(
        `/v1/orgs/${orgId}`
      ),
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      timezone: "Asia/Jakarta",
      publicContact: true,
    },
  })
  const errors = form.formState.errors
  const timezone = form.watch("timezone")
  const publicContact = form.watch("publicContact")

  React.useEffect(() => {
    if (!organization.data) return
    const data = organization.data
    form.reset({
      name: data.name,
      description: data.description ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      timezone: data.timezone,
      publicContact: true,
    })
    setLogoFile(null)
    setLogoUrl(data.logoUrl ?? null)
  }, [form, organization.data])

  React.useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl)
    }
  }, [logoUrl])

  if (organization.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (organization.isError || !organization.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load organization settings</AlertTitle>
        <AlertDescription>
          Check your connection and try again.
        </AlertDescription>
      </Alert>
    )
  }

  const data = organization.data
  const status = organizationStatuses[data.status as keyof typeof organizationStatuses]

  function pickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (logoUrl) URL.revokeObjectURL(logoUrl)
    setLogoFile(file)
    setLogoUrl(URL.createObjectURL(file))
  }

  function clearLogo() {
    if (logoUrl) URL.revokeObjectURL(logoUrl)
    setLogoFile(null)
    setLogoUrl(data.logoUrl ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function uploadLogo(file: File) {
    const upload = await getBrowserApi().request<Schemas["BrandingUploadDto"]>(
      `/v1/orgs/${orgId}/logo-upload`,
      {
        method: "POST",
        body: {
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        } satisfies Schemas["OrganizationLogoUploadRequest"],
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

  async function onSubmit(values: Values) {
    try {
      const logoUploadId = logoFile ? await uploadLogo(logoFile) : undefined
      const updated = await getBrowserApi().request<Schemas["OrganizationDto"]>(
        `/v1/orgs/${orgId}`,
        {
          method: "PATCH",
          body: {
            name: values.name.trim(),
            description: values.description?.trim() || null,
            email: values.email?.trim() || null,
            phone: values.phone?.trim() || null,
            website: values.website?.trim() || null,
            timezone: values.timezone,
            publicContact: values.publicContact,
            logoUploadId,
          } satisfies Schemas["UpdateOrganizationRequest"],
        }
      )
      queryClient.setQueryData(queryKeys.org(orgId), updated)
      setLogoFile(null)
      setLogoUrl(updated.logoUrl ?? null)
      toast.success("Organization settings saved")
    } catch {
      toast.error("Could not save organization settings", {
        description: "Check the fields and try again.",
      })
    }
  }

  return (
    <RequirePermission permission="org:settings:update">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Organization settings"
          description="Profile, contact details, and public branding."
          actions={
            status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null
          }
        />

        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                The logo appears on organizer screens, public event pages, and
                generated documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Organization logo"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">
                    {initials(valuesName(form.getValues("name")))}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml"
                  className="hidden"
                  onChange={pickLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera />
                  Change logo
                </Button>
                {logoFile ? (
                  <Button type="button" variant="ghost" onClick={clearLogo}>
                    <Trash2 />
                    Undo
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Organization identity and public contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="org-name">Name</FieldLabel>
                  <Input
                    id="org-name"
                    aria-invalid={Boolean(errors.name)}
                    {...form.register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="org-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="org-description"
                    aria-invalid={Boolean(errors.description)}
                    {...form.register("description")}
                  />
                  <FieldError errors={[errors.description]} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(errors.email)}>
                    <FieldLabel htmlFor="org-email">Email</FieldLabel>
                    <Input
                      id="org-email"
                      type="email"
                      aria-invalid={Boolean(errors.email)}
                      {...form.register("email")}
                    />
                    <FieldError errors={[errors.email]} />
                  </Field>
                  <Field data-invalid={Boolean(errors.phone)}>
                    <FieldLabel htmlFor="org-phone">Phone</FieldLabel>
                    <Input
                      id="org-phone"
                      type="tel"
                      aria-invalid={Boolean(errors.phone)}
                      {...form.register("phone")}
                    />
                    <FieldError errors={[errors.phone]} />
                  </Field>
                </div>
                <Field data-invalid={Boolean(errors.website)}>
                  <FieldLabel htmlFor="org-website">Website</FieldLabel>
                  <Input
                    id="org-website"
                    placeholder="https://example.com"
                    aria-invalid={Boolean(errors.website)}
                    {...form.register("website")}
                  />
                  <FieldError errors={[errors.website]} />
                </Field>
                <Field>
                  <FieldLabel>Timezone</FieldLabel>
                  <Select
                    items={timezones}
                    value={timezone}
                    onValueChange={(value) => {
                      if (typeof value === "string") {
                        form.setValue("timezone", value, {
                          shouldValidate: true,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:max-w-sm">
                      <SelectValue placeholder="Select a timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={publicContact}
                      onCheckedChange={(checked) =>
                        form.setValue("publicContact", checked === true)
                      }
                      aria-label="Show contact details publicly"
                    />
                    <div>
                      <FieldLabel htmlFor="org-public">
                        Show contact details publicly
                      </FieldLabel>
                      <FieldDescription>
                        Adds the organization contact to public event pages.
                      </FieldDescription>
                    </div>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset()
                clearLogo()
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
    </RequirePermission>
  )
}

function valuesName(name: string) {
  return name.trim() || "Organization"
}
