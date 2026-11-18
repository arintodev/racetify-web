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

import { WEBHOOK_EVENTS } from "../constants"

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter the endpoint URL.")
    .max(2048, "Use 2048 characters or fewer.")
    .refine((value) => {
      try {
        const url = new URL(value)
        return url.protocol === "https:"
      } catch {
        return false
      }
    }, "Use a valid HTTPS URL."),
  events: z.array(z.string()).min(1, "Choose at least one event."),
})

type FormValues = z.infer<typeof schema>

export function WebhookForm({
  open,
  onOpenChange,
  orgId,
  webhook,
  onCreated,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  webhook?: Schemas["WebhookConfigDto"] | null
  onCreated?: (created: Schemas["WebhookCreatedDto"]) => void
  onSaved?: () => void
}) {
  const editing = Boolean(webhook)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", events: ["face_enrollment.activated"] },
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const events = form.watch("events")

  React.useEffect(() => {
    if (!open) return
    form.reset({
      url: webhook?.url ?? "",
      events: webhook?.events ?? ["face_enrollment.activated"],
    })
    setError(null)
  }, [form, open, webhook])

  function toggleEvent(event: string, checked: boolean) {
    const next = checked
      ? [...events, event]
      : events.filter((value) => value !== event)
    form.setValue("events", next, { shouldValidate: true })
  }

  async function submit(values: FormValues) {
    setPending(true)
    setError(null)
    try {
      if (webhook) {
        await getBrowserApi().request<Schemas["WebhookConfigDto"]>(
          `/v1/orgs/${orgId}/webhooks/${webhook.id}`,
          {
            method: "PATCH",
            body: {
              url: values.url,
              events: values.events,
            } satisfies Schemas["UpdateWebhookRequest"],
          }
        )
      } else {
        const created = await getBrowserApi().request<
          Schemas["WebhookCreatedDto"]
        >(`/v1/orgs/${orgId}/webhooks`, {
          method: "POST",
          body: {
            url: values.url,
            events: values.events,
          } satisfies Schemas["CreateWebhookRequest"],
        })
        onCreated?.(created)
      }
      onSaved?.()
      form.reset()
      onOpenChange(false)
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? (requestError.detail ?? requestError.message)
          : "Could not save the webhook endpoint."
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
          <DialogTitle>
            {editing ? "Edit webhook endpoint" : "Add webhook endpoint"}
          </DialogTitle>
          <DialogDescription>
            Every endpoint receives each subscribed event for this organization,
            whichever OAuth client created the enrollment.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.url)}>
              <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
              <Input
                id="webhook-url"
                placeholder="https://partner.example.com/webhooks/racetify"
                aria-invalid={Boolean(form.formState.errors.url)}
                {...form.register("url")}
              />
              <p className="text-sm text-muted-foreground">
                Public HTTPS only. Private, loopback, and non-default-port
                destinations are rejected.
              </p>
              <FieldError errors={[form.formState.errors.url]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.events)}>
              <FieldLabel>Events</FieldLabel>
              <div className="flex flex-col gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={events.includes(event.value)}
                      onCheckedChange={(checked) =>
                        toggleEvent(event.value, checked === true)
                      }
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        {event.label}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {event.description}
                      </span>
                      <code className="block pt-1 text-xs text-muted-foreground">
                        {event.value}
                      </code>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError errors={[form.formState.errors.events]} />
            </Field>
          </FieldGroup>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save the endpoint</AlertTitle>
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
              {pending ? "Saving…" : editing ? "Save changes" : "Add endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
