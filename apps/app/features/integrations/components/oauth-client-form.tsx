"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ApiError, type Schemas } from "@workspace/api-client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { getBrowserApi } from "@/lib/api/browser"

import { OAUTH_SCOPES } from "../constants"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a client name.")
    .max(100, "Use 100 characters or fewer."),
  scopes: z.array(z.string()).min(1, "Choose at least one scope."),
})

type FormValues = z.infer<typeof schema>

export function OAuthClientForm({
  open,
  onOpenChange,
  orgId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  onCreated: (created: Schemas["OAuthClientSecretDto"]) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", scopes: ["event:gallery:view"] },
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scopes = form.watch("scopes")

  React.useEffect(() => {
    if (!open) return
    form.reset({ name: "", scopes: ["event:gallery:view"] })
    setError(null)
  }, [form, open])

  function toggleScope(scope: string, checked: boolean) {
    const next = checked
      ? [...scopes, scope]
      : scopes.filter((value) => value !== scope)
    form.setValue("scopes", next, { shouldValidate: true })
  }

  async function submit(values: FormValues) {
    setPending(true)
    setError(null)
    try {
      const created = await getBrowserApi().request<
        Schemas["OAuthClientSecretDto"]
      >(`/v1/orgs/${orgId}/oauth-clients`, {
        method: "POST",
        body: {
          name: values.name,
          scopes: values.scopes,
        } satisfies Schemas["CreateOAuthClientRequest"],
      })
      onCreated(created)
      form.reset()
      onOpenChange(false)
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? (requestError.detail ?? requestError.message)
          : "Could not create the OAuth client."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create OAuth client</DialogTitle>
          <DialogDescription>
            Credentials for a partner backend. Scopes cannot be changed later;
            create a new client to change them.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="oauth-client-name">Name</FieldLabel>
              <Input
                id="oauth-client-name"
                placeholder="Partner gallery integration"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.scopes)}>
              <FieldLabel>Scopes</FieldLabel>
              <div className="flex flex-col gap-2">
                {OAUTH_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={scopes.includes(scope.value)}
                      onCheckedChange={(checked) =>
                        toggleScope(scope.value, checked === true)
                      }
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        {scope.label}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {scope.description}
                      </span>
                      <code className="block pt-1 text-xs text-muted-foreground">
                        {scope.value}
                      </code>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError errors={[form.formState.errors.scopes]} />
            </Field>
          </FieldGroup>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create the client</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
