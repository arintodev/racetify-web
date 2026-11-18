"use client"

import { ApiError, queryKeys, type Schemas } from "@workspace/api-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUp,
  Flag,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
import { Badge } from "@workspace/ui/components/badge"
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
import { Textarea } from "@workspace/ui/components/textarea"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import {
  formatCurrency,
  formatDateTime,
  formatDistance,
  toDateTimeInput,
} from "@/lib/format"
import { raceStatuses } from "@/lib/status"

type Race = Schemas["RaceDto"]
type RaceCategory = Schemas["RaceCategoryDto"]

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
]

const raceSchema = z.object({
  name: z.string().min(3, "Race name is required."),
  description: z
    .string()
    .max(300, "Keep the description under 300 characters.")
    .optional(),
  distanceKm: z.coerce.number().positive("Distance must be greater than 0."),
  elevationGain: z.coerce.number().min(0, "Elevation cannot be negative."),
  fee: z.coerce.number().int().min(0, "Fee cannot be negative."),
  startTime: z.string().min(1, "Choose a start time."),
  cutOffDurationMinutes: z.coerce
    .number()
    .int()
    .positive("Cut-off duration is required."),
  maxParticipants: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1."),
  status: z.enum(["draft", "published", "closed"]),
})

type RaceInput = z.input<typeof raceSchema>
type RaceValues = z.output<typeof raceSchema>

const categorySchema = z
  .object({
    name: z.string().min(2, "Category name is required."),
    code: z
      .string()
      .min(2, "Code is required.")
      .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens."),
    gender: z.enum(["male", "female", "mixed", "open"]),
    minAge: z.coerce.number().int().min(0),
    maxAge: z.coerce.number().int().min(0),
    quota: z.coerce.number().int().min(1, "Quota must be at least 1."),
  })
  .refine((values) => values.maxAge >= values.minAge, {
    message: "Maximum age must be on or after the minimum.",
    path: ["maxAge"],
  })

type CategoryInput = z.input<typeof categorySchema>
type CategoryValues = z.output<typeof categorySchema>

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.issues[0]?.message ?? error.detail ?? fallback
  }
  return fallback
}

function RaceSheet({
  eventId,
  race,
  open,
  onOpenChange,
  onSaved,
}: {
  eventId: string
  race: Race | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const form = useForm<RaceInput, unknown, RaceValues>({
    resolver: zodResolver(raceSchema),
    defaultValues: {
      name: "",
      description: "",
      distanceKm: 10,
      elevationGain: 0,
      fee: 0,
      startTime: "",
      cutOffDurationMinutes: 360,
      maxParticipants: 1000,
      status: "draft",
    },
  })
  const status = form.watch("status")
  const errors = form.formState.errors

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: race?.name ?? "",
      description: race?.description ?? "",
      distanceKm: race?.distanceKm ?? 10,
      elevationGain: race?.elevationGain ?? 0,
      fee: race?.fee ?? 0,
      startTime: race ? toDateTimeInput(race.startTime) : "",
      cutOffDurationMinutes: race?.cutOffDurationMinutes ?? 360,
      maxParticipants: race?.maxParticipants ?? 1000,
      status: (race?.status as RaceValues["status"] | undefined) ?? "draft",
    })
  }, [form, open, race])

  async function onSubmit(values: RaceValues) {
    try {
      const body = {
        name: values.name.trim(),
        slug: slugify(values.name),
        description: values.description?.trim() || null,
        distanceKm: values.distanceKm,
        elevationGain: values.elevationGain,
        fee: values.fee,
        startTime: new Date(values.startTime).toISOString(),
        cutOffDurationMinutes: values.cutOffDurationMinutes,
        maxParticipants: values.maxParticipants,
        status: values.status,
      }

      if (race) {
        await getBrowserApi().request(
          `/v1/events/${eventId}/races/${race.id}`,
          {
            method: "PATCH",
            body: body satisfies Schemas["UpdateRaceRequest"],
          }
        )
      } else {
        await getBrowserApi().request(`/v1/events/${eventId}/races`, {
          method: "POST",
          body: body satisfies Schemas["CreateRaceRequest"],
        })
      }

      toast.success(race ? "Race updated" : "Race added")
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        race ? "Could not update the race" : "Could not add the race",
        {
          description: errorMessage(error, "Try again."),
        }
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{race ? "Edit race" : "Add a race"}</SheetTitle>
          <SheetDescription>
            Distances and categories define what participants can register for.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="race-name">Race name</FieldLabel>
              <Input
                id="race-name"
                placeholder="Full Marathon"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="race-description">Description</FieldLabel>
              <Textarea
                id="race-description"
                aria-invalid={Boolean(errors.description)}
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.distanceKm)}>
                <FieldLabel htmlFor="race-distance">Distance (km)</FieldLabel>
                <Input
                  id="race-distance"
                  type="number"
                  step="0.1"
                  aria-invalid={Boolean(errors.distanceKm)}
                  {...form.register("distanceKm")}
                />
                <FieldError errors={[errors.distanceKm]} />
              </Field>
              <Field data-invalid={Boolean(errors.elevationGain)}>
                <FieldLabel htmlFor="race-elevation">
                  Elevation gain (m)
                </FieldLabel>
                <Input
                  id="race-elevation"
                  type="number"
                  aria-invalid={Boolean(errors.elevationGain)}
                  {...form.register("elevationGain")}
                />
                <FieldError errors={[errors.elevationGain]} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.fee)}>
                <FieldLabel htmlFor="race-fee">Fee (IDR)</FieldLabel>
                <Input
                  id="race-fee"
                  type="number"
                  aria-invalid={Boolean(errors.fee)}
                  {...form.register("fee")}
                />
                <FieldError errors={[errors.fee]} />
              </Field>
              <Field data-invalid={Boolean(errors.maxParticipants)}>
                <FieldLabel htmlFor="race-capacity">Capacity</FieldLabel>
                <Input
                  id="race-capacity"
                  type="number"
                  aria-invalid={Boolean(errors.maxParticipants)}
                  {...form.register("maxParticipants")}
                />
                <FieldError errors={[errors.maxParticipants]} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.startTime)}>
                <FieldLabel htmlFor="race-start">Start time</FieldLabel>
                <Input
                  id="race-start"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.startTime)}
                  {...form.register("startTime")}
                />
                <FieldError errors={[errors.startTime]} />
              </Field>
              <Field data-invalid={Boolean(errors.cutOffDurationMinutes)}>
                <FieldLabel htmlFor="race-cutoff">
                  Cut-off duration (minutes)
                </FieldLabel>
                <Input
                  id="race-cutoff"
                  type="number"
                  aria-invalid={Boolean(errors.cutOffDurationMinutes)}
                  {...form.register("cutOffDurationMinutes")}
                />
                <FieldError errors={[errors.cutOffDurationMinutes]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel htmlFor="race-status">Status</FieldLabel>
              <Select
                items={statusOptions}
                value={status}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    form.setValue("status", value as RaceValues["status"], {
                      shouldValidate: true,
                    })
                  }
                }}
              >
                <SelectTrigger id="race-status" className="w-full">
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.status]} />
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
                <Flag />
              )}
              {form.formState.isSubmitting ? "Saving…" : "Save race"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CategoriesSheet({
  eventId,
  race,
  open,
  onOpenChange,
  onChanged,
}: {
  eventId: string
  race: Race | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const form = useForm<CategoryInput, unknown, CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      code: "",
      gender: "open",
      minAge: 18,
      maxAge: 99,
      quota: 500,
    },
  })
  const gender = form.watch("gender")
  const errors = form.formState.errors
  const [deleting, setDeleting] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        code: "",
        gender: "open",
        minAge: 18,
        maxAge: 99,
        quota: 500,
      })
    }
  }, [form, open])

  async function addCategory(values: CategoryValues) {
    if (!race) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/races/${race.id}/categories`,
        {
          method: "POST",
          body: values satisfies Schemas["CreateCategoryRequest"],
        }
      )
      toast.success("Category added")
      form.reset()
      onChanged()
    } catch (error) {
      toast.error("Could not add the category", {
        description: errorMessage(error, "Try again."),
      })
    }
  }

  async function removeCategory(categoryId: string) {
    if (!race) return
    setDeleting(categoryId)
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/races/${race.id}/categories/${categoryId}`,
        { method: "DELETE" }
      )
      toast.success("Category removed")
      onChanged()
    } catch (error) {
      toast.error("Could not remove the category", {
        description: errorMessage(error, "Try again."),
      })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Categories · {race?.name ?? "Race"}</SheetTitle>
          <SheetDescription>
            Categories split a race by gender and age. Quotas are optional
            capacity limits within the race.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          <div className="flex flex-col gap-2">
            {race?.categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {category.code} · {category.gender} · {category.minAge}–
                    {category.maxAge} · quota {category.quota}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${category.name}`}
                  onClick={() => void removeCategory(category.id)}
                  disabled={deleting === category.id}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {race?.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet. Add the first one below.
              </p>
            ) : null}
          </div>
          <form
            className="flex flex-col gap-4 border-t pt-4"
            noValidate
            onSubmit={form.handleSubmit(addCategory)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="category-name">Name</FieldLabel>
                <Input
                  id="category-name"
                  aria-invalid={Boolean(errors.name)}
                  {...form.register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={Boolean(errors.code)}>
                <FieldLabel htmlFor="category-code">Code</FieldLabel>
                <Input
                  id="category-code"
                  placeholder="M18-39"
                  aria-invalid={Boolean(errors.code)}
                  {...form.register("code")}
                />
                <FieldError errors={[errors.code]} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.gender)}>
                <FieldLabel htmlFor="category-gender">Gender</FieldLabel>
                <Select
                  items={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "mixed", label: "Mixed" },
                    { value: "open", label: "Open" },
                  ]}
                  value={gender}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      form.setValue(
                        "gender",
                        value as CategoryValues["gender"],
                        { shouldValidate: true }
                      )
                    }
                  }}
                >
                  <SelectTrigger id="category-gender" className="w-full">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.gender]} />
              </Field>
              <Field data-invalid={Boolean(errors.quota)}>
                <FieldLabel htmlFor="category-quota">Quota</FieldLabel>
                <Input
                  id="category-quota"
                  type="number"
                  aria-invalid={Boolean(errors.quota)}
                  {...form.register("quota")}
                />
                <FieldError errors={[errors.quota]} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.minAge)}>
                <FieldLabel htmlFor="category-min">Minimum age</FieldLabel>
                <Input
                  id="category-min"
                  type="number"
                  aria-invalid={Boolean(errors.minAge)}
                  {...form.register("minAge")}
                />
                <FieldError errors={[errors.minAge]} />
              </Field>
              <Field data-invalid={Boolean(errors.maxAge)}>
                <FieldLabel htmlFor="category-max">Maximum age</FieldLabel>
                <Input
                  id="category-max"
                  type="number"
                  aria-invalid={Boolean(errors.maxAge)}
                  {...form.register("maxAge")}
                />
                <FieldError errors={[errors.maxAge]} />
              </Field>
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              Add category
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function EventRacesPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()
  const [raceSheetOpen, setRaceSheetOpen] = React.useState(false)
  const [editingRace, setEditingRace] = React.useState<Race | null>(null)
  const [categoriesRaceId, setCategoriesRaceId] = React.useState<string | null>(
    null
  )
  const [deleteRaceId, setDeleteRaceId] = React.useState<string | null>(null)

  const races = useQuery({
    queryKey: queryKeys.eventRaces(eventId),
    queryFn: () =>
      getBrowserApi().request<Race[]>(`/v1/events/${eventId}/races`),
  })

  const rows = races.data ?? []
  const categoriesRace = rows.find((race) => race.id === categoriesRaceId)
  const deleteRace = rows.find((race) => race.id === deleteRaceId)

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventRaces(eventId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.eventOverview(eventId),
    })
  }

  function openCreate() {
    setEditingRace(null)
    setRaceSheetOpen(true)
  }

  function openEdit(race: Race) {
    setEditingRace(race)
    setRaceSheetOpen(true)
  }

  async function deleteRaceConfirmed() {
    if (!deleteRaceId) return
    try {
      await getBrowserApi().request(
        `/v1/events/${eventId}/races/${deleteRaceId}`,
        { method: "DELETE" }
      )
      toast.success("Race removed")
      invalidate()
    } catch (error) {
      toast.error("Could not remove the race", {
        description: errorMessage(error, "Try again."),
      })
    } finally {
      setDeleteRaceId(null)
    }
  }

  async function moveRace(race: Race, direction: -1 | 1) {
    const current = rows.map((row) => row.id)
    const index = current.indexOf(race.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= current.length) return
    const ids = [...current]
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(target, 0, moved)
    try {
      await getBrowserApi().request(`/v1/events/${eventId}/races/order`, {
        method: "PUT",
        body: { ids } satisfies Schemas["ReorderRequest"],
      })
      invalidate()
    } catch (error) {
      toast.error("Could not reorder races", {
        description: errorMessage(error, "Try again."),
      })
    }
  }

  return (
    <RequirePermission permission="event:races:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Races"
          description="Distances, categories, and capacity for this event."
          actions={
            <Button onClick={openCreate}>
              <Plus />
              Add race
            </Button>
          }
        />

        {races.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load races</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        {races.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        ) : null}

        {!races.isPending && rows.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No races yet"
            description="Add a race so participants can register."
            action={
              <Button onClick={openCreate}>
                <Plus />
                Add race
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((race, index) => {
            const status =
              raceStatuses[race.status as keyof typeof raceStatuses]
            return (
              <Card key={race.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{race.name}</CardTitle>
                      <CardDescription>
                        {formatDistance(race.distanceKm)} ·{" "}
                        {formatCurrency(race.fee)} ·{" "}
                        {formatDateTime(race.startTime)}
                      </CardDescription>
                    </div>
                    {status ? (
                      <StatusBadge label={status.label} tone={status.tone} />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {race.categories.length} categories
                    </Badge>
                    <Badge variant="outline">
                      Capacity {race.maxParticipants}
                    </Badge>
                    <Badge variant="outline">
                      Cut-off {race.cutOffDurationMinutes} min
                    </Badge>
                  </div>
                  {race.description ? (
                    <p className="text-sm text-muted-foreground">
                      {race.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoriesRaceId(race.id)}
                    >
                      <Layers />
                      Categories
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(race)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move race up"
                      onClick={() => void moveRace(race, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move race down"
                      onClick={() => void moveRace(race, 1)}
                      disabled={index === rows.length - 1}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete race"
                      onClick={() => setDeleteRaceId(race.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <RaceSheet
          eventId={eventId}
          race={editingRace}
          open={raceSheetOpen}
          onOpenChange={setRaceSheetOpen}
          onSaved={invalidate}
        />

        <CategoriesSheet
          eventId={eventId}
          race={categoriesRace}
          open={Boolean(categoriesRace)}
          onOpenChange={(open) => {
            if (!open) setCategoriesRaceId(null)
          }}
          onChanged={invalidate}
        />

        <AlertDialog
          open={Boolean(deleteRaceId)}
          onOpenChange={(open) => {
            if (!open) setDeleteRaceId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete race?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRace?.name ?? "This race"} and its categories will be
                removed. Registrations that reference it may prevent deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep race</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => void deleteRaceConfirmed()}
              >
                Delete race
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
