"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"

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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import type { PublicRegistrationConfig } from "./types"

import { CONSENT_STATEMENTS } from "./constants"
import { OrderSummaryLines, OrderTotal } from "./order-summary"
import { buildOrderLines } from "./schema"
import type { RegistrationValues, ParticipantValues } from "./types"

function ConsentField({
  name,
  label,
  description,
}: {
  name: "terms" | "medical" | "privacy"
  label: string
  description: string
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<RegistrationValues>()
  const error = errors.consents?.[name]

  return (
    <Controller
      control={control}
      name={`consents.${name}`}
      render={({ field }) => (
        <Field orientation="horizontal" data-invalid={error ? true : undefined}>
          <Checkbox
            id={`consent-${name}`}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `consent-${name}-error` : undefined}
          />
          <FieldContent>
            <FieldLabel
              htmlFor={`consent-${name}`}
              className="leading-snug font-normal"
            >
              {label}
            </FieldLabel>
            <FieldDescription>{description}</FieldDescription>
            <FieldError id={`consent-${name}-error`} errors={[error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}

export function CheckoutStep({
  config,
  onEditParticipant,
  onContinue,
}: {
  config: PublicRegistrationConfig
  onEditParticipant: (index: number) => void
  onContinue: () => void
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RegistrationValues>()

  const participants = useWatch({
    control,
    name: "participants",
  }) as ParticipantValues[] | undefined

  const lines = buildOrderLines(participants ?? [], config)
  const total = lines.reduce((sum, line) => sum + line.fee, 0)

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Your order</CardTitle>
          <CardDescription>
            {lines.length} {lines.length === 1 ? "participant" : "participants"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <OrderSummaryLines lines={lines} onEdit={onEditParticipant} />
          <OrderTotal total={total} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>
            We'll use this for the confirmation and race-day updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.contact?.email ? true : undefined}>
              <FieldLabel htmlFor="contact-email">Email</FieldLabel>
              <Input
                id="contact-email"
                className="h-11 scroll-mb-32 sm:h-8"
                type="email"
                maxLength={254}
                autoComplete="email"
                aria-invalid={Boolean(errors.contact?.email)}
                aria-describedby={
                  errors.contact?.email ? "contact-email-error" : undefined
                }
                {...register("contact.email")}
              />
              <FieldError
                id="contact-email-error"
                errors={[errors.contact?.email]}
              />
            </Field>

            <Field data-invalid={errors.contact?.phone ? true : undefined}>
              <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
              <Input
                id="contact-phone"
                className="h-11 scroll-mb-32 sm:h-8"
                type="tel"
                inputMode="tel"
                maxLength={30}
                autoComplete="tel"
                aria-invalid={Boolean(errors.contact?.phone)}
                aria-describedby={
                  errors.contact?.phone ? "contact-phone-error" : undefined
                }
                {...register("contact.phone")}
              />
              <FieldDescription>Include your country code.</FieldDescription>
              <FieldError
                id="contact-phone-error"
                errors={[errors.contact?.phone]}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Consent</CardTitle>
          <CardDescription>
            Everyone in this order is covered by these confirmations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {CONSENT_STATEMENTS.map((statement) => (
              <ConsentField
                key={statement.name}
                name={statement.name}
                label={statement.label}
                description={statement.description}
              />
            ))}

            <Controller
              control={control}
              name="consents.updates"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id="consent-updates"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                  <FieldContent>
                    <FieldLabel
                      htmlFor="consent-updates"
                      className="leading-snug font-normal"
                    >
                      Send me event updates and photos (optional).
                    </FieldLabel>
                  </FieldContent>
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Button type="button" className="h-11 w-full" onClick={onContinue}>
        Continue to payment
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You'll review the payment step next.
      </p>
    </div>
  )
}
