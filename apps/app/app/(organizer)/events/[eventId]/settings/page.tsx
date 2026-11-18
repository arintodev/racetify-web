"use client"

import * as React from "react"
import {
  ApiError,
  queryKeys,
  uploadToPresignedUrl,
  type Schemas,
} from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, Loader2, Save, Trash2 } from "lucide-react"
import { useParams } from "next/navigation"
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
import { Textarea } from "@workspace/ui/components/textarea"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateRange, initials, toDateTimeInput } from "@/lib/format"
import { eventStatuses } from "@/lib/status"

const timezones = [
  { value: "Asia/Jakarta", label: "Jakarta · WIB (UTC+7)" },
  { value: "Asia/Makassar", label: "Makassar / Bali · WITA (UTC+8)" },
  { value: "Asia/Jayapura", label: "Jayapura · WIT (UTC+9)" },
] as const

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

const eventSettingsSchema = z
  .object({
    name: z.string().min(3, "Event name is required."),
    slug: z
      .string()
      .min(2, "Slug is required.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens."
      ),
    shortDescription: z
      .string()
      .min(10, "Add a short description.")
      .max(160, "Keep the short description under 160 characters."),
    description: z
      .string()
      .min(20, "Add a fuller event description.")
      .max(1000, "Keep the description under 1000 characters."),
    startDate: z.string().min(1, "Choose a start date."),
    endDate: z.string().min(1, "Choose an end date."),
    registrationStartAt: z.string().min(1, "Choose when registration opens."),
    registrationEndAt: z.string().min(1, "Choose when registration closes."),
    timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
    location: z.string().min(2, "Add the event location."),
    status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((values) => values.registrationEndAt >= values.registrationStartAt, {
    message: "Registration must close after it opens.",
    path: ["registrationEndAt"],
  })

type EventSettingsValues = z.infer<typeof eventSettingsSchema>

function eventValues(event?: Schemas["EventDto"]): EventSettingsValues {
  return {
    name: event?.name ?? "",
    slug: event?.slug ?? "",
    shortDescription: event?.shortDescription ?? "",
    description: event?.description ?? "",
    startDate: event?.startDate ?? "",
    endDate: event?.endDate ?? "",
    registrationStartAt: event
      ? toDateTimeInput(event.registrationStartAt)
      : "",
    registrationEndAt: event ? toDateTimeInput(event.registrationEndAt) : "",
    timezone:
      (event?.timezone as EventSettingsValues["timezone"]) ?? "Asia/Jakarta",
    location: event?.location ?? "",
    status: (event?.status as EventSettingsValues["status"]) ?? "draft",
  }
}

export default function EventSettingsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()

  const eventQuery = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })
  const event = eventQuery.data

  const form = useForm<EventSettingsValues>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: eventValues(undefined),
  })

  const timezone = form.watch("timezone")
  const status = form.watch("status")
  const errors = form.formState.errors
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl)
      if (coverUrl) URL.revokeObjectURL(coverUrl)
    }
  }, [logoUrl, coverUrl])

  React.useEffect(() => {
    if (!event) return
    form.reset(eventValues(event))
    setLogoFile(null)
    setCoverFile(null)
    setLogoUrl(event?.logoUrl ?? null)
    setCoverUrl(event?.coverUrl ?? null)
  }, [event?.updatedAt, form])

  if (eventQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (eventQuery.isError || !event) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load event settings</AlertTitle>
        <AlertDescription>
          Check your connection and try again.
        </AlertDescription>
      </Alert>
    )
  }

  const eventStatus = eventStatuses[event.status as keyof typeof eventStatuses]

  function pickFile(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "cover"
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    if (kind === "logo") {
      if (logoUrl) URL.revokeObjectURL(logoUrl)
      setLogoFile(file)
      setLogoUrl(URL.createObjectURL(file))
    } else {
      if (coverUrl) URL.revokeObjectURL(coverUrl)
      setCoverFile(file)
      setCoverUrl(URL.createObjectURL(file))
    }
    toast.info(`${kind === "logo" ? "Logo" : "Cover"} ready to upload`, {
      description: "Save changes to upload it.",
    })
  }

  function clearMedia(kind: "logo" | "cover") {
    if (kind === "logo") {
      if (logoUrl) URL.revokeObjectURL(logoUrl)
      setLogoFile(null)
      setLogoUrl(event?.logoUrl ?? null)
      if (logoInputRef.current) logoInputRef.current.value = ""
    } else {
      if (coverUrl) URL.revokeObjectURL(coverUrl)
      setCoverFile(null)
      setCoverUrl(event?.coverUrl ?? null)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }

  async function uploadAsset(file: File, purpose: "logo" | "cover") {
    const upload = await getBrowserApi().request<Schemas["BrandingUploadDto"]>(
      `/v1/events/${eventId}/assets`,
      {
        method: "POST",
        body: {
          purpose,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        } satisfies Schemas["EventAssetUploadRequest"],
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

  async function onSubmit(values: EventSettingsValues) {
    try {
      const logoUploadId = logoFile
        ? await uploadAsset(logoFile, "logo")
        : undefined
      const coverUploadId = coverFile
        ? await uploadAsset(coverFile, "cover")
        : undefined

      const updated = await getBrowserApi().request<Schemas["EventDto"]>(
        `/v1/events/${eventId}`,
        {
          method: "PATCH",
          body: {
            name: values.name.trim(),
            slug: values.slug.trim(),
            shortDescription: values.shortDescription.trim(),
            description: values.description.trim(),
            startDate: values.startDate,
            endDate: values.endDate,
            registrationStartAt: new Date(
              values.registrationStartAt
            ).toISOString(),
            registrationEndAt: new Date(values.registrationEndAt).toISOString(),
            timezone: values.timezone,
            location: values.location.trim(),
            status: values.status,
            logoUploadId,
            coverUploadId,
          } satisfies Schemas["UpdateEventRequest"],
        }
      )

      queryClient.setQueryData(queryKeys.event(eventId), updated)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventOverview(eventId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces() })
      setLogoFile(null)
      setCoverFile(null)
      setLogoUrl(updated.logoUrl ?? null)
      setCoverUrl(updated.coverUrl ?? null)
      toast.success("Event settings saved", { description: updated.name })
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? (submitError.issues[0]?.message ??
            submitError.detail ??
            "Could not save the event.")
          : "Could not save the event. Try again."
      toast.error("Could not save event settings", { description: message })
    }
  }

  return (
    <RequirePermission permission="event:settings:update">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Event settings"
          description={`${event.name} · ${formatDateRange(event.startDate, event.endDate)} · ${event.organization.name}`}
          actions={
            eventStatus ? (
              <StatusBadge label={eventStatus.label} tone={eventStatus.tone} />
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
              <CardTitle>Media</CardTitle>
              <CardDescription>
                The cover appears on the event workspace and public pages. The
                logo is used in generated documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative flex aspect-[3/1] items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="Event cover preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Event cover preview
                  </p>
                )}
                <div className="absolute right-2 bottom-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera />
                    Change cover
                  </Button>
                  {coverUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => clearMedia("cover")}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(changeEvent) => pickFile(changeEvent, "cover")}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Event logo preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {initials(event.name)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera />
                    Change logo
                  </Button>
                  {logoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => clearMedia("logo")}
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(changeEvent) => pickFile(changeEvent, "logo")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event profile</CardTitle>
              <CardDescription>
                Identity and copy shown in the workspace and public pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="event-name">Name</FieldLabel>
                  <Input
                    id="event-name"
                    aria-invalid={Boolean(errors.name)}
                    {...form.register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={Boolean(errors.slug)}>
                  <FieldLabel htmlFor="event-slug">Slug</FieldLabel>
                  <Input
                    id="event-slug"
                    aria-invalid={Boolean(errors.slug)}
                    {...form.register("slug")}
                  />
                  <FieldError errors={[errors.slug]} />
                </Field>
                <Field
                  className="md:col-span-2"
                  data-invalid={Boolean(errors.shortDescription)}
                >
                  <FieldLabel htmlFor="event-short">
                    Short description
                  </FieldLabel>
                  <Input
                    id="event-short"
                    aria-invalid={Boolean(errors.shortDescription)}
                    {...form.register("shortDescription")}
                  />
                  <FieldDescription>
                    One sentence for cards and listings.
                  </FieldDescription>
                  <FieldError errors={[errors.shortDescription]} />
                </Field>
                <Field
                  className="md:col-span-2"
                  data-invalid={Boolean(errors.description)}
                >
                  <FieldLabel htmlFor="event-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="event-description"
                    rows={5}
                    aria-invalid={Boolean(errors.description)}
                    {...form.register("description")}
                  />
                  <FieldError errors={[errors.description]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates and place</CardTitle>
              <CardDescription>
                Event dates, registration window, timezone, and venue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.startDate)}>
                  <FieldLabel htmlFor="event-start">Start date</FieldLabel>
                  <Input
                    id="event-start"
                    type="date"
                    aria-invalid={Boolean(errors.startDate)}
                    {...form.register("startDate")}
                  />
                  <FieldError errors={[errors.startDate]} />
                </Field>
                <Field data-invalid={Boolean(errors.endDate)}>
                  <FieldLabel htmlFor="event-end">End date</FieldLabel>
                  <Input
                    id="event-end"
                    type="date"
                    aria-invalid={Boolean(errors.endDate)}
                    {...form.register("endDate")}
                  />
                  <FieldError errors={[errors.endDate]} />
                </Field>
                <Field data-invalid={Boolean(errors.registrationStartAt)}>
                  <FieldLabel htmlFor="registration-open">
                    Registration opens
                  </FieldLabel>
                  <Input
                    id="registration-open"
                    type="datetime-local"
                    aria-invalid={Boolean(errors.registrationStartAt)}
                    {...form.register("registrationStartAt")}
                  />
                  <FieldError errors={[errors.registrationStartAt]} />
                </Field>
                <Field data-invalid={Boolean(errors.registrationEndAt)}>
                  <FieldLabel htmlFor="registration-close">
                    Registration closes
                  </FieldLabel>
                  <Input
                    id="registration-close"
                    type="datetime-local"
                    aria-invalid={Boolean(errors.registrationEndAt)}
                    {...form.register("registrationEndAt")}
                  />
                  <FieldError errors={[errors.registrationEndAt]} />
                </Field>
                <Field data-invalid={Boolean(errors.timezone)}>
                  <FieldLabel htmlFor="event-timezone">Timezone</FieldLabel>
                  <Select
                    items={timezones}
                    value={timezone}
                    onValueChange={(value) => {
                      if (typeof value === "string") {
                        form.setValue(
                          "timezone",
                          value as EventSettingsValues["timezone"],
                          { shouldValidate: true }
                        )
                      }
                    }}
                  >
                    <SelectTrigger id="event-timezone" className="w-full">
                      <SelectValue placeholder="Select a timezone">
                        {(value) =>
                          timezones.find((item) => item.value === value)
                            ?.label ?? "Select a timezone"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.timezone]} />
                </Field>
                <Field data-invalid={Boolean(errors.location)}>
                  <FieldLabel htmlFor="event-location">Location</FieldLabel>
                  <Input
                    id="event-location"
                    aria-invalid={Boolean(errors.location)}
                    {...form.register("location")}
                  />
                  <FieldError errors={[errors.location]} />
                </Field>
                <Field data-invalid={Boolean(errors.status)}>
                  <FieldLabel htmlFor="event-status">Status</FieldLabel>
                  <Select
                    items={statusOptions}
                    value={status}
                    onValueChange={(value) => {
                      if (typeof value === "string") {
                        form.setValue(
                          "status",
                          value as EventSettingsValues["status"],
                          { shouldValidate: true }
                        )
                      }
                    }}
                  >
                    <SelectTrigger id="event-status" className="w-full">
                      <SelectValue placeholder="Choose a status">
                        {(value) =>
                          statusOptions.find((item) => item.value === value)
                            ?.label ?? "Choose a status"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.status]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset(eventValues(event))
                clearMedia("logo")
                clearMedia("cover")
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
