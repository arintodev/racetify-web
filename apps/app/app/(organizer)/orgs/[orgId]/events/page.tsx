"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowRight,
  CalendarDays,
  Flag,
  Loader2,
  MapPin,
  Plus,
  Search,
} from "lucide-react"
import Link from "next/link"
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { formatDateRange } from "@/lib/format"
import { eventStatuses } from "@/lib/status"

const PAGE_SIZE = 24

const statusFilterItems = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

const eventSchema = z
  .object({
    name: z.string().min(3, "Event name is required."),
    slug: z
      .string()
      .min(2, "Slug is required.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens."
      ),
    startDate: z.string().min(1, "Choose a start date."),
    endDate: z.string().min(1, "Choose an end date."),
    registrationStartAt: z.string().min(1, "Choose when registration opens."),
    registrationEndAt: z.string().min(1, "Choose when registration closes."),
    timezone: z.string().min(1, "Choose a timezone."),
    location: z.string().min(2, "Add the event location."),
    shortDescription: z
      .string()
      .max(160, "Keep the short description under 160 characters.")
      .optional(),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((values) => values.registrationEndAt >= values.registrationStartAt, {
    message: "Registration must close after it opens.",
    path: ["registrationEndAt"],
  })

type EventValues = z.infer<typeof eventSchema>

const timezones = [
  { value: "Asia/Jakarta", label: "Jakarta · WIB (UTC+7)" },
  { value: "Asia/Makassar", label: "Makassar / Bali · WITA (UTC+8)" },
  { value: "Asia/Jayapura", label: "Jayapura · WIT (UTC+9)" },
]

function createError(error: unknown) {
  if (error instanceof ApiError) {
    return (
      error.issues[0]?.message ?? error.detail ?? "Could not create the event."
    )
  }
  return "Could not create the event. Try again."
}

function CreateEventSheet({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const slugTouched = React.useRef(false)
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      slug: "",
      startDate: "",
      endDate: "",
      registrationStartAt: "",
      registrationEndAt: "",
      timezone: "Asia/Jakarta",
      location: "",
      shortDescription: "",
    },
  })
  const errors = form.formState.errors
  const timezone = form.watch("timezone")

  React.useEffect(() => {
    if (!open) {
      slugTouched.current = false
      form.reset()
    }
  }, [form, open])

  const create = useMutation({
    mutationFn: (values: EventValues) =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/orgs/${orgId}/events`, {
        method: "POST",
        body: {
          name: values.name.trim(),
          slug: values.slug.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          registrationStartAt: new Date(
            values.registrationStartAt
          ).toISOString(),
          registrationEndAt: new Date(values.registrationEndAt).toISOString(),
          timezone: values.timezone,
          location: values.location.trim(),
          shortDescription: values.shortDescription?.trim() || null,
        } satisfies Schemas["CreateEventRequest"],
      }),
    onSuccess: (event) => {
      toast.success("Event created", { description: event.name })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orgEvents(orgId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces() })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create an event</SheetTitle>
          <SheetDescription>
            Start with the event identity, dates, and registration window. Races
            and registration fields are configured in the event workspace.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          noValidate
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="event-name">Event name</FieldLabel>
              <Input
                id="event-name"
                placeholder="Borobudur Heritage Run 2028"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name", {
                  onChange: (changeEvent) => {
                    if (!slugTouched.current) {
                      form.setValue("slug", slugify(changeEvent.target.value))
                    }
                  },
                })}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={Boolean(errors.slug)}>
              <FieldLabel htmlFor="event-slug">Slug</FieldLabel>
              <Input
                id="event-slug"
                placeholder="borobudur-heritage-run-2028"
                aria-invalid={Boolean(errors.slug)}
                {...form.register("slug", {
                  onChange: () => {
                    slugTouched.current = true
                  },
                })}
              />
              <FieldError errors={[errors.slug]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <Field data-invalid={Boolean(errors.timezone)}>
              <FieldLabel htmlFor="event-timezone">Timezone</FieldLabel>
              <Select
                items={timezones}
                value={timezone}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    form.setValue("timezone", value, { shouldValidate: true })
                  }
                }}
              >
                <SelectTrigger id="event-timezone" className="w-full">
                  <SelectValue placeholder="Select a timezone">
                    {(value) =>
                      timezones.find((item) => item.value === value)?.label ??
                      "Select a timezone"
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
                placeholder="Venue, city"
                aria-invalid={Boolean(errors.location)}
                {...form.register("location")}
              />
              <FieldError errors={[errors.location]} />
            </Field>
            <Field data-invalid={Boolean(errors.shortDescription)}>
              <FieldLabel htmlFor="event-description">
                Short description
              </FieldLabel>
              <Input
                id="event-description"
                placeholder="A short summary for public pages"
                aria-invalid={Boolean(errors.shortDescription)}
                {...form.register("shortDescription")}
              />
              <FieldError errors={[errors.shortDescription]} />
            </Field>
          </FieldGroup>
          {create.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create the event</AlertTitle>
              <AlertDescription>{createError(create.error)}</AlertDescription>
            </Alert>
          ) : null}
          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              {create.isPending ? "Creating…" : "Create event"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default function OrganizationEventsPage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = React.useState<
    Array<string | undefined>
  >([])
  const [createOpen, setCreateOpen] = React.useState(false)

  React.useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [query, statusFilter])

  const organization = useQuery({
    queryKey: queryKeys.org(orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["OrganizationDto"]>(`/v1/orgs/${orgId}`),
  })

  const events = useQuery({
    queryKey: queryKeys.orgEvents(orgId, {
      q: query.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<Schemas["EventSummaryDto"][]>(
        `/v1/orgs/${orgId}/events`,
        {
          query: {
            q: query.trim() || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: PAGE_SIZE,
            cursor,
          },
        }
      ),
  })

  const rows = events.data?.data ?? []
  const pagination = events.data?.meta.pagination
  const hasFilters = Boolean(query.trim()) || statusFilter !== "all"

  function nextPage() {
    if (!pagination?.nextCursor) return
    setCursorHistory((history) => [...history, cursor])
    setCursor(pagination.nextCursor ?? undefined)
  }

  function previousPage() {
    setCursorHistory((history) => {
      const next = [...history]
      setCursor(next.pop())
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        description={`Every event managed by ${organization.data?.name ?? "this organization"}.`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Create event
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search events or locations"
            className="pl-8"
            aria-label="Search events"
          />
        </div>
        <Select
          items={statusFilterItems}
          value={statusFilter}
          onValueChange={(value) => {
            if (typeof value === "string") setStatusFilter(value)
          }}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue>
              {(value) =>
                statusFilterItems.find((item) => item.value === value)?.label ??
                "All statuses"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusFilterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground lg:ml-auto">
          {events.isPending ? "Loading events…" : `${rows.length} on this page`}
        </p>
      </div>

      {events.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load events</AlertTitle>
          <AlertDescription>
            Check your connection and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {events.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!events.isPending && !events.isError && rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={hasFilters ? "No events match these filters" : "No events yet"}
          description={
            hasFilters
              ? "Try a different search term or status."
              : "Create the first event for this organization."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setStatusFilter("all")
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Create event
              </Button>
            )
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((event) => {
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
                        <CardTitle className="truncate">{event.name}</CardTitle>
                        <CardDescription className="truncate">
                          {event.slug}
                        </CardDescription>
                      </div>
                    </div>
                    {status ? (
                      <StatusBadge label={status.label} tone={status.tone} />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    {formatDateRange(event.startDate, event.endDate)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    {event.location ?? "Location not set"}
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
                    <ArrowRight />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {cursorHistory.length > 0
            ? `Page ${cursorHistory.length + 1}`
            : "Page 1"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousPage}
            disabled={cursorHistory.length === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={!pagination?.hasMore}
          >
            Next
          </Button>
        </div>
      </div>

      <CreateEventSheet
        orgId={orgId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
