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

const changeOwnerSchema = z.object({
  ownerEmail: z
    .string()
    .trim()
    .min(1, "Enter the owner's email address.")
    .email("Enter a valid email address.")
    .max(254, "Use 254 characters or fewer."),
})

type ChangeOwnerValues = z.infer<typeof changeOwnerSchema>

export function ChangeOwnerDialog({
  organization,
  open,
  onOpenChange,
  onAssigned,
}: {
  organization: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}) {
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<ChangeOwnerValues>({
    resolver: zodResolver(changeOwnerSchema),
    defaultValues: { ownerEmail: "" },
  })

  React.useEffect(() => {
    if (open) return
    setFormError(null)
    form.reset({ ownerEmail: "" })
  }, [form, open])

  const errors = form.formState.errors

  async function onSubmit(values: ChangeOwnerValues) {
    if (!organization) return
    setFormError(null)

    try {
      await getBrowserApi().request<Schemas["AdminOrganizationRowDto"]>(
        `/v1/admin/orgs/${organization.id}/owner`,
        {
          method: "POST",
          body: {
            ownerEmail: values.ownerEmail.trim(),
          } satisfies Schemas["AssignOrganizationOwnerRequest"],
        }
      )

      onAssigned()
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "owner_not_found") {
          form.setError("ownerEmail", {
            message:
              "No account uses that email. The owner must register first.",
          })
          return
        }
        if (error.code === "owner_inactive") {
          form.setError("ownerEmail", {
            message: "This account is not active and cannot own the organization.",
          })
          return
        }
        if (error.isValidationFailed) {
          for (const issue of error.issues) {
            if (issue.pointer === "/ownerEmail") {
              form.setError("ownerEmail", { message: issue.message })
              return
            }
          }
        }
        setFormError(error.detail ?? "Could not assign the owner.")
        return
      }
      setFormError("Could not assign the owner. Try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign an owner</DialogTitle>
          <DialogDescription>
            {organization
              ? `Add an existing active account as an owner of ${organization.name}.`
              : "Add an existing active account as an organization owner."}{" "}
            No email is sent. Existing owners stay owners.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={errors.ownerEmail ? true : undefined}>
              <FieldLabel htmlFor="organization-owner-email">
                Owner email
              </FieldLabel>
              <Input
                id="organization-owner-email"
                type="email"
                placeholder="owner@example.com"
                aria-invalid={Boolean(errors.ownerEmail)}
                {...form.register("ownerEmail")}
              />
              <FieldDescription>
                The account must already be registered and active.
              </FieldDescription>
              <FieldError>{errors.ownerEmail?.message}</FieldError>
            </Field>
          </FieldGroup>

          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not assign the owner</AlertTitle>
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
                  Assigning…
                </>
              ) : (
                "Assign owner"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
