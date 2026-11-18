"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Download,
  Eye,
  FileUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Ticket,
  UserRound,
  UserX,
} from "lucide-react"
import { useParams } from "next/navigation"
import * as React from "react"
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
import { Separator } from "@workspace/ui/components/separator"
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
import { StatusBadge } from "@/components/status-badge"
import { ImportParticipantsSheet } from "@/features/participants/import"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { useCan } from "@/lib/auth/session-provider"
import { formatDate, formatDateTime, initials } from "@/lib/format"
import { registrationStatuses } from "@/lib/status"

const PAGE_SIZE = 15

const editParticipantSchema = z.object({
  firstName: z.string().min(2, "First name is required."),
  lastName: z.string().min(2, "Last name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(7, "Enter a valid phone number."),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().min(1, "Choose a date of birth."),
  nationality: z.string().min(2, "Enter a nationality."),
})

type EditParticipantValues = z.infer<typeof editParticipantSchema>

const bibSchema = z.object({
  bibNumber: z
    .string()
    .min(1, "Enter a bib number.")
    .max(20, "Keep the bib number under 20 characters.")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens."),
  bibName: z.string().max(20, "Keep the bib name under 20 characters."),
})

type BibValues = z.infer<typeof bibSchema>
type ParticipantRow = Schemas["ParticipantRowDto"]

function participantName(row: ParticipantRow) {
  return `${row.participant.firstName} ${row.participant.lastName}`
}

function registrationStatus(status: string) {
  return registrationStatuses[status as keyof typeof registrationStatuses]
}

function EditParticipantSheet({
  row,
  open,
  onOpenChange,
  onSave,
}: {
  row: ParticipantRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    participantId: string,
    values: EditParticipantValues
  ) => Promise<void>
}) {
  const form = useForm<EditParticipantValues>({
    resolver: zodResolver(editParticipantSchema),
    defaultValues: {
      firstName: row.participant.firstName,
      lastName: row.participant.lastName,
      email: row.participant.email,
      phone: row.participant.phone,
      gender: row.participant.gender as "male" | "female",
      birthDate: row.participant.birthDate,
      nationality: row.participant.nationality,
    },
  })
  const gender = form.watch("gender")
  const errors = form.formState.errors

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit participant</SheetTitle>
          <SheetDescription>
            {participantName(row)} · {row.registration.registrationNumber}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            await onSave(row.participant.id, values)
          })}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.firstName)}>
                <FieldLabel htmlFor="participant-first">First name</FieldLabel>
                <Input
                  id="participant-first"
                  aria-invalid={Boolean(errors.firstName)}
                  {...form.register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field data-invalid={Boolean(errors.lastName)}>
                <FieldLabel htmlFor="participant-last">Last name</FieldLabel>
                <Input
                  id="participant-last"
                  aria-invalid={Boolean(errors.lastName)}
                  {...form.register("lastName")}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="participant-email">Email</FieldLabel>
              <Input
                id="participant-email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...form.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="participant-phone">Phone</FieldLabel>
              <Input
                id="participant-phone"
                type="tel"
                aria-invalid={Boolean(errors.phone)}
                {...form.register("phone")}
              />
              <FieldError errors={[errors.phone]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.gender)}>
                <FieldLabel htmlFor="participant-gender">Gender</FieldLabel>
                <Select
                  items={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                  value={gender}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      form.setValue("gender", value as "male" | "female", {
                        shouldValidate: true,
                      })
                    }
                  }}
                >
                  <SelectTrigger id="participant-gender" className="w-full">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.gender]} />
              </Field>
              <Field data-invalid={Boolean(errors.birthDate)}>
                <FieldLabel htmlFor="participant-birth">
                  Date of birth
                </FieldLabel>
                <Input
                  id="participant-birth"
                  type="date"
                  aria-invalid={Boolean(errors.birthDate)}
                  {...form.register("birthDate")}
                />
                <FieldError errors={[errors.birthDate]} />
              </Field>
              <Field data-invalid={Boolean(errors.nationality)}>
                <FieldLabel htmlFor="participant-nationality">
                  Nationality
                </FieldLabel>
                <Input
                  id="participant-nationality"
                  aria-invalid={Boolean(errors.nationality)}
                  {...form.register("nationality")}
                />
                <FieldError errors={[errors.nationality]} />
              </Field>
            </div>
          </FieldGroup>
          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Pencil />
              )}
              {form.formState.isSubmitting ? "Saving…" : "Save participant"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function AssignBibSheet({
  row,
  open,
  onOpenChange,
  onSave,
}: {
  row: ParticipantRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (registrationId: string, values: BibValues) => Promise<void>
}) {
  const form = useForm<BibValues>({
    resolver: zodResolver(bibSchema),
    defaultValues: {
      bibNumber: row.registration.bibNumber ?? "",
      bibName: row.registration.bibName ?? "",
    },
  })
  const errors = form.formState.errors

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign bib</SheetTitle>
          <SheetDescription>
            {participantName(row)} · {row.race?.name ?? "Race"}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            await onSave(row.registration.id, values)
          })}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.bibNumber)}>
              <FieldLabel htmlFor="bib-number">Bib number</FieldLabel>
              <Input
                id="bib-number"
                placeholder="1042"
                aria-invalid={Boolean(errors.bibNumber)}
                {...form.register("bibNumber")}
              />
              <FieldDescription>
                Letters, numbers, and hyphens are accepted.
              </FieldDescription>
              <FieldError errors={[errors.bibNumber]} />
            </Field>
            <Field data-invalid={Boolean(errors.bibName)}>
              <FieldLabel htmlFor="bib-name">Bib name</FieldLabel>
              <Input
                id="bib-name"
                placeholder="Optional printed name"
                aria-invalid={Boolean(errors.bibName)}
                {...form.register("bibName")}
              />
              <FieldError errors={[errors.bibName]} />
            </Field>
          </FieldGroup>
          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Ticket />
              )}
              {form.formState.isSubmitting ? "Assigning…" : "Assign bib"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ParticipantDetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: ParticipantRow | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  const status = registrationStatus(row.registration.status)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage src="" alt={row.participant.firstName} />
              <AvatarFallback>{initials(participantName(row))}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="truncate">
                {participantName(row)}
              </SheetTitle>
              <SheetDescription className="truncate">
                {row.participant.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-2">
            {status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : null}
            <Badge variant="outline">{row.race?.name ?? "Race"}</Badge>
            {row.category ? (
              <Badge variant="outline">{row.category.name}</Badge>
            ) : null}
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Registration</p>
              <p className="mt-1 font-mono text-xs">
                {row.registration.registrationNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bib</p>
              <p className="mt-1 font-medium">
                {row.registration.bibNumber ?? "Not assigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registered</p>
              <p className="mt-1 font-medium">
                {formatDateTime(row.registration.registeredAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="mt-1 font-medium">
                {row.registration.confirmedAt
                  ? formatDateTime(row.registration.confirmedAt)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="mt-1 font-medium">{row.participant.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gender</p>
              <p className="mt-1 font-medium capitalize">
                {row.participant.gender}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of birth</p>
              <p className="mt-1 font-medium">
                {formatDate(row.participant.birthDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nationality</p>
              <p className="mt-1 font-medium">{row.participant.nationality}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participant ID</p>
              <p className="mt-1 font-mono text-xs">{row.participant.id}</p>
            </div>
          </div>
          <Separator />
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            This participant registered for {row.race?.name ?? "a race"}
            {row.category ? ` in ${row.category.name}` : ""}. Bib OCR and face
            matches are shown in the event gallery.
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function EventParticipantsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const canManage = useCan("event:participants:manage")
  const queryClient = useQueryClient()

  const [query, setQuery] = React.useState("")
  const [raceFilter, setRaceFilter] = React.useState("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = React.useState<
    Array<string | undefined>
  >([])
  const [detailRegistrationId, setDetailRegistrationId] = React.useState<
    string | null
  >(null)
  const [editRegistrationId, setEditRegistrationId] = React.useState<
    string | null
  >(null)
  const [bibRegistrationId, setBibRegistrationId] = React.useState<
    string | null
  >(null)
  const [cancelRegistrationId, setCancelRegistrationId] = React.useState<
    string | null
  >(null)
  const [importOpen, setImportOpen] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  React.useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [query, raceFilter, categoryFilter, statusFilter])

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const races = useQuery({
    queryKey: queryKeys.eventRaces(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["RaceDto"][]>(
        `/v1/events/${eventId}/races`
      ),
  })

  const participants = useQuery({
    queryKey: queryKeys.participants(eventId, {
      q: query.trim() || undefined,
      raceId: raceFilter === "all" ? undefined : raceFilter,
      categoryId: categoryFilter === "all" ? undefined : categoryFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      cursor,
    }),
    queryFn: () =>
      getBrowserApi().requestEnvelope<ParticipantRow[]>(
        `/v1/events/${eventId}/participants`,
        {
          query: {
            q: query.trim() || undefined,
            raceId: raceFilter === "all" ? undefined : raceFilter,
            categoryId: categoryFilter === "all" ? undefined : categoryFilter,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: PAGE_SIZE,
            cursor,
          },
        }
      ),
  })

  const rows = participants.data?.data ?? []
  const pagination = participants.data?.meta.pagination
  const raceRows = races.data ?? []
  const categories = raceRows
    .filter((race) => raceFilter === "all" || race.id === raceFilter)
    .flatMap((race) => race.categories)

  const hasFilters =
    Boolean(query.trim()) ||
    raceFilter !== "all" ||
    categoryFilter !== "all" ||
    statusFilter !== "all"

  const detailRow = rows.find(
    (row) => row.registration.id === detailRegistrationId
  )
  const editRow = rows.find((row) => row.registration.id === editRegistrationId)
  const bibRow = rows.find((row) => row.registration.id === bibRegistrationId)
  const cancelRow = rows.find(
    (row) => row.registration.id === cancelRegistrationId
  )

  function invalidateParticipants() {
    void queryClient.invalidateQueries({
      queryKey: ["event", eventId, "participants"],
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventOverview(eventId),
    })
  }

  async function saveParticipant(
    participantId: string,
    values: EditParticipantValues
  ) {
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/participants/${participantId}`,
        {
          method: "PATCH",
          body: values satisfies Schemas["UpdateParticipantRequest"],
        }
      )
      invalidateParticipants()
      setEditRegistrationId(null)
      toast.success("Participant updated")
    } catch (error) {
      toast.error("Could not update the participant", {
        description:
          error instanceof ApiError
            ? (error.detail ?? error.issues[0]?.message)
            : "Try again.",
      })
      throw error
    }
  }

  async function saveBib(registrationId: string, values: BibValues) {
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/registrations/${registrationId}/bib`,
        {
          method: "POST",
          body: {
            bibNumber: values.bibNumber,
            bibName: values.bibName.trim() || null,
          } satisfies Schemas["AssignBibRequest"],
        }
      )
      invalidateParticipants()
      setBibRegistrationId(null)
      toast.success("Bib assigned", {
        description: `Bib ${values.bibNumber} was assigned.`,
      })
    } catch (error) {
      toast.error("Could not assign the bib", {
        description:
          error instanceof ApiError
            ? (error.detail ?? error.issues[0]?.message)
            : "Try again.",
      })
      throw error
    }
  }

  async function cancelRegistration() {
    if (!cancelRegistrationId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/registrations/${cancelRegistrationId}/cancel`,
        { method: "POST" }
      )
      invalidateParticipants()
      toast.success("Registration cancelled")
    } catch (error) {
      toast.error("Could not cancel the registration", {
        description:
          error instanceof ApiError && error.code === "refund_required"
            ? "Confirmed registrations must be refunded through the order."
            : error instanceof ApiError
              ? error.detail
              : "Try again.",
      })
    } finally {
      setCancelRegistrationId(null)
    }
  }

  async function exportParticipants() {
    setExporting(true)
    try {
      const result = await getBrowserApi().request<
        Schemas["ParticipantExportDto"]
      >(`/v1/events/${eventId}/participant-exports`, {
        method: "POST",
        body: {
          q: query.trim() || undefined,
          raceId: raceFilter === "all" ? undefined : raceFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          format: "csv",
        } satisfies Schemas["CreateParticipantExportRequest"],
      })
      window.location.assign(`/api${result.downloadUrl}`)
    } catch (error) {
      toast.error("Could not export participants", {
        description:
          error instanceof ApiError
            ? (error.detail ?? "Try again.")
            : "Try again.",
      })
    } finally {
      setExporting(false)
    }
  }

  function nextPage() {
    if (!pagination?.nextCursor) return
    setCursorHistory((history) => [...history, cursor])
    setCursor(pagination.nextCursor ?? undefined)
  }

  function previousPage() {
    const history = [...cursorHistory]
    const previous = history.pop()
    setCursorHistory(history)
    setCursor(previous)
  }

  const raceFilterItems = [
    { value: "all", label: "All races" },
    ...raceRows.map((race) => ({ value: race.id, label: race.name })),
  ]
  const categoryFilterItems = [
    { value: "all", label: "All categories" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]
  const statusFilterItems = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
  ]

  return (
    <RequirePermission permission="event:participants:view">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Participants"
          description={`Registrations for ${event.data?.name ?? "this event"}. ${canManage ? "You can edit participants and assign bibs." : "You have read-only access."}`}
          actions={
            <>
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={() => void exportParticipants()}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              ) : null}
              {canManage ? (
                <Button onClick={() => setImportOpen(true)}>
                  <FileUp />
                  Import
                </Button>
              ) : null}
            </>
          }
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {participants.isPending
              ? "Loading…"
              : `${rows.length} on this page`}
          </Badge>
          {hasFilters ? <Badge variant="outline">Filters active</Badge> : null}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1 xl:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Search name, email, bib, or registration"
              className="pl-8"
              aria-label="Search participants"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              items={raceFilterItems}
              value={raceFilter}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setRaceFilter(value)
                  setCategoryFilter("all")
                }
              }}
            >
              <SelectTrigger className="w-[170px]" aria-label="Filter by race">
                <SelectValue>
                  {(value) =>
                    raceFilterItems.find((item) => item.value === value)
                      ?.label ?? "All races"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {raceFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={categoryFilterItems}
              value={categoryFilter}
              onValueChange={(value) => {
                if (typeof value === "string") setCategoryFilter(value)
              }}
            >
              <SelectTrigger
                className="w-[180px]"
                aria-label="Filter by category"
              >
                <SelectValue>
                  {(value) =>
                    categoryFilterItems.find((item) => item.value === value)
                      ?.label ?? "All categories"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={statusFilterItems}
              value={statusFilter}
              onValueChange={(value) => {
                if (typeof value === "string") setStatusFilter(value)
              }}
            >
              <SelectTrigger
                className="w-[160px]"
                aria-label="Filter by status"
              >
                <SelectValue>
                  {(value) =>
                    statusFilterItems.find((item) => item.value === value)
                      ?.label ?? "All statuses"
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
          </div>
          <p className="text-sm text-muted-foreground xl:ml-auto">
            {cursorHistory.length > 0
              ? `Page ${cursorHistory.length + 1}`
              : "Page 1"}
          </p>
        </div>

        {participants.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load participants</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {participants.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {!participants.isPending && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Race</TableHead>
                  <TableHead>Bib</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = registrationStatus(row.registration.status)
                  return (
                    <TableRow key={row.registration.id}>
                      <TableCell>
                        <div className="flex min-w-48 items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src=""
                              alt={row.participant.firstName}
                            />
                            <AvatarFallback>
                              {initials(participantName(row))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {participantName(row)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.participant.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.race?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.category?.name ?? "No category"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-sm">
                          {row.registration.bibNumber ?? "—"}
                        </p>
                        {row.registration.bibName ? (
                          <p className="text-xs text-muted-foreground">
                            {row.registration.bibName}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <StatusBadge
                            label={status.label}
                            tone={status.tone}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.registration.registeredAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${participantName(row)}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() =>
                                setDetailRegistrationId(row.registration.id)
                              }
                            >
                              <Eye />
                              View details
                            </DropdownMenuItem>
                            {canManage ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setEditRegistrationId(row.registration.id)
                                  }
                                >
                                  <Pencil />
                                  Edit participant
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setBibRegistrationId(row.registration.id)
                                  }
                                >
                                  <Ticket />
                                  Assign bib
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {row.registration.status === "pending" ||
                                row.registration.status === "confirmed" ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      setCancelRegistrationId(
                                        row.registration.id
                                      )
                                    }
                                  >
                                    <UserX />
                                    Cancel registration
                                  </DropdownMenuItem>
                                ) : null}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {!participants.isPending && rows.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={
              hasFilters
                ? "No participants match these filters"
                : "No participants yet"
            }
            description={
              hasFilters
                ? "Try a different search term, race, category, or status."
                : "Participants appear here after registration or CSV import."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setRaceFilter("all")
                    setCategoryFilter("all")
                    setStatusFilter("all")
                  }}
                >
                  Reset filters
                </Button>
              ) : canManage ? (
                <Button onClick={() => setImportOpen(true)}>
                  <FileUp />
                  Import participants
                </Button>
              ) : undefined
            }
          />
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

        <ParticipantDetailSheet
          row={detailRow}
          open={Boolean(detailRow)}
          onOpenChange={(open) => {
            if (!open) setDetailRegistrationId(null)
          }}
        />

        {editRow ? (
          <EditParticipantSheet
            key={editRow.participant.id}
            row={editRow}
            open={Boolean(editRow)}
            onOpenChange={(open) => {
              if (!open) setEditRegistrationId(null)
            }}
            onSave={saveParticipant}
          />
        ) : null}

        {bibRow ? (
          <AssignBibSheet
            key={bibRow.registration.id}
            row={bibRow}
            open={Boolean(bibRow)}
            onOpenChange={(open) => {
              if (!open) setBibRegistrationId(null)
            }}
            onSave={saveBib}
          />
        ) : null}

        <ImportParticipantsSheet
          eventId={eventId}
          open={importOpen}
          onOpenChange={setImportOpen}
          onCompleted={invalidateParticipants}
        />

        <AlertDialog
          open={Boolean(cancelRegistrationId)}
          onOpenChange={(open) => {
            if (!open) setCancelRegistrationId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelRow ? participantName(cancelRow) : "This participant"}{" "}
                will be marked as cancelled. The participant profile and payment
                record are not deleted. Confirmed registrations require a refund
                through the order.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep registration</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void cancelRegistration()}
              >
                Cancel registration
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
