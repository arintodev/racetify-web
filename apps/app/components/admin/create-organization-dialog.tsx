"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ApiError, type Schemas } from "@workspace/api-client"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { getBrowserApi } from "@/lib/api/browser"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter an organization name.")
    .max(255, "Use 255 characters or fewer."),
  slug: z
    .string()
    .trim()
    .max(100, "Use 100 characters or fewer.")
    .refine(
      (value) => value === "" || SLUG_PATTERN.test(value),
      "Use lowercase letters, numbers, and single hyphens."
    ),
  ownerEmail: z
    .string()
    .trim()
    .min(1, "Enter the owner's email address.")
    .email("Enter a valid email address.")
    .max(254, "Use 254 characters or fewer."),
  timezone: z.string().trim().min(1, "Enter an IANA time zone.").max(50),
})

type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "")
}

function defaultTimezone(): string {
  if (typeof Intl === "undefined") return "Asia/Jakarta"
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
}

function issueFieldPath(pointer: string): keyof CreateOrganizationValues | null {
  const field = pointer.replace(/^\//, "")
  if (
    field === "name" ||
    field === "slug" ||
    field === "ownerEmail" ||
    field === "timezone"
  ) {
    return field
  }
  return null
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (response: Schemas["CreateOrganizationResponseDto"]) => void
}) {
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<CreateOrganizationValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      ownerEmail: "",
      timezone: defaultTimezone(),
    },
  })

  const name = form.watch("name")

  React.useEffect(() => {
    if (open) return
    setSlugEdited(false)
    setFormError(null)
    form.reset({
      name: "",
      slug: "",
      ownerEmail: "",
      timezone: defaultTimezone(),
    })
  }, [form, open])

  React.useEffect(() => {
    if (!open || slugEdited) return
    form.setValue("slug", slugify(name), { shouldValidate: false })
  }, [form, name, open, slugEdited])

  const errors = form.formState.errors

  async function onSubmit(values: CreateOrganizationValues) {
    setFormError(null)

    try {
      const response = await getBrowserApi().request<
        Schemas["CreateOrganizationResponseDto"]
      >("/v1/admin/orgs", {
        method: "POST",
        body: {
          name: values.name.trim(),
          slug: values.slug.trim() || undefined,
          ownerEmail: values.ownerEmail.trim(),
          timezone: values.timezone.trim(),
        } satisfies Schemas["CreateOrganizationRequest"],
      })

      onCreated(response)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "organization_slug_taken") {
          form.setError("slug", { message: "This slug is already in use." })
          return
        }
        if (error.code === "owner_inactive") {
          form.setError("ownerEmail", {
            message: "This account is not active and cannot own the organization.",
          })
          return
        }
        if (error.isValidationFailed) {
          let mapped = 0
          for (const issue of error.issues) {
            const field = issueFieldPath(issue.pointer)
            if (!field) continue
            form.setError(field, { message: issue.message })
            mapped += 1
          }
          if (mapped > 0) return
        }
        setFormError(error.detail ?? "Could not create the organization.")
        return
      }
      setFormError("Could not create the organization. Try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            The organization starts as pending. Activate it from the list when
            it is ready to use. If the owner has no account yet, they receive an
            invitation.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="organization-name">Name</FieldLabel>
              <Input
                id="organization-name"
                placeholder="Nusantara Run"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name")}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="organization-slug">Slug</FieldLabel>
              <Input
                id="organization-slug"
                placeholder="nusantara-run"
                aria-invalid={Boolean(errors.slug)}
                {...form.register("slug", {
                  onChange: () => setSlugEdited(true),
                })}
              />
              <FieldDescription>
                Used in public URLs. Derived from the name until you edit it.
              </FieldDescription>
              <FieldError>{errors.slug?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.ownerEmail ? true : undefined}>
              <FieldLabel htmlFor="organization-owner">
                Owner email
              </FieldLabel>
              <Input
                id="organization-owner"
                type="email"
                placeholder="owner@example.com"
                aria-invalid={Boolean(errors.ownerEmail)}
                {...form.register("ownerEmail")}
              />
              <FieldDescription>
                An existing active user becomes the owner immediately.
                Otherwise an invitation is sent.
              </FieldDescription>
              <FieldError>{errors.ownerEmail?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.timezone ? true : undefined}>
              <FieldLabel htmlFor="organization-timezone">Time zone</FieldLabel>
              <Input
                id="organization-timezone"
                placeholder="Asia/Jakarta"
                aria-invalid={Boolean(errors.timezone)}
                {...form.register("timezone")}
              />
              <FieldDescription>IANA time zone, e.g. Asia/Jakarta.</FieldDescription>
              <FieldError>{errors.timezone?.message}</FieldError>
            </Field>
          </FieldGroup>

          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create the organization</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create organization"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
