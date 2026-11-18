"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

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
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"
import { formatDateTime } from "@/lib/format"

export default function EventRegistrationPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const queryClient = useQueryClient()

  const event = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["EventDto"]>(`/v1/events/${eventId}`),
  })

  const config = useQuery({
    queryKey: queryKeys.eventRegistrationConfig(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["RegistrationConfigDto"]>(
        `/v1/events/${eventId}/registration-config`
      ),
  })

  const [draft, setDraft] =
    React.useState<Schemas["RegistrationConfigDto"] | null>(null)

  React.useEffect(() => {
    if (config.data) setDraft(config.data)
  }, [config.data])

  if (config.isPending || event.isPending || !draft) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (config.isError || event.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load registration settings</AlertTitle>
        <AlertDescription>
          Check your connection and try again.
        </AlertDescription>
      </Alert>
    )
  }

  async function save() {
    if (!draft) return
    try {
      const updated = await getBrowserApi().request<
        Schemas["RegistrationConfigDto"]
      >(`/v1/events/${eventId}/registration-config`, {
        method: "PUT",
        body: draft,
      })
      queryClient.setQueryData(
        queryKeys.eventRegistrationConfig(eventId),
        updated
      )
      setDraft(updated)
      toast.success("Registration settings saved")
    } catch {
      toast.error("Could not save registration settings")
    }
  }

  return (
    <RequirePermission permission="event:registration:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Registration"
          description={`Participant fields and checkout rules for ${event.data?.name ?? "this event"}.`}
        />

        <Card>
          <CardHeader>
            <CardTitle>Registration window</CardTitle>
            <CardDescription>
              The registration window and race fees are configured on the event
              settings and races screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Opens {formatDateTime(event.data!.registrationStartAt)} · closes{" "}
              {formatDateTime(event.data!.registrationEndAt)}
            </span>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href={`/events/${eventId}/settings`} />}
            >
              Event settings
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href={`/events/${eventId}/races`} />}
            >
              Races and fees
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participant rules</CardTitle>
            <CardDescription>
              These flags drive the public registration form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={draft.allowMultipleParticipants}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      allowMultipleParticipants: checked === true,
                    })
                  }
                  aria-label="Allow multiple participants"
                />
                <div>
                  <FieldLabel htmlFor="allow-multiple">
                    Allow multiple participants per order
                  </FieldLabel>
                  <FieldDescription>
                    Buyers can register several people at checkout.
                  </FieldDescription>
                </div>
              </div>
              <Field>
                <FieldLabel htmlFor="max-participants">
                  Max participants per order
                </FieldLabel>
                <Input
                  id="max-participants"
                  type="number"
                  min={1}
                  value={draft.maxParticipantsPerOrder}
                  onChange={(changeEvent) =>
                    setDraft({
                      ...draft,
                      maxParticipantsPerOrder: Number(changeEvent.target.value),
                    })
                  }
                />
              </Field>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={draft.identityNumberRequired}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      identityNumberRequired: checked === true,
                    })
                  }
                  aria-label="Require identity number"
                />
                <div>
                  <FieldLabel htmlFor="identity-required">
                    Identity number required
                  </FieldLabel>
                  <FieldDescription>
                    Ask participants for an identity document number.
                  </FieldDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={draft.emergencyContactRequired}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      emergencyContactRequired: checked === true,
                    })
                  }
                  aria-label="Require emergency contact"
                />
                <div>
                  <FieldLabel htmlFor="emergency-required">
                    Emergency contact required
                  </FieldLabel>
                  <FieldDescription>
                    Require an emergency contact name and phone.
                  </FieldDescription>
                </div>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public preview copy</CardTitle>
            <CardDescription>
              Headline and description shown on the public registration page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="preview-headline">Headline</FieldLabel>
                <Input
                  id="preview-headline"
                  value={draft.preview.headline}
                  onChange={(changeEvent) =>
                    setDraft({
                      ...draft,
                      preview: {
                        ...draft.preview,
                        headline: changeEvent.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="preview-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="preview-description"
                  value={draft.preview.description}
                  onChange={(changeEvent) =>
                    setDraft({
                      ...draft,
                      preview: {
                        ...draft.preview,
                        description: changeEvent.target.value,
                      },
                    })
                  }
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => void save()}>
            <Save />
            Save registration settings
          </Button>
        </div>
      </div>
    </RequirePermission>
  )
}
