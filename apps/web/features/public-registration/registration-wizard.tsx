"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import {
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form"

import { ApiError, type Schemas } from "@workspace/api-client"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

import { getBrowserApi } from "@/lib/api/browser"

import { toCreateOrderRequest } from "./api"
import { CheckoutStep } from "./checkout-step"
import { STEP_DESCRIPTIONS, STEP_ORDER, STEP_TITLES } from "./constants"
import { PaymentStep } from "./payment-step"
import { OrderSummarySheet, StickyOrderBar } from "./order-summary"
import {
  buildOrderLines,
  createDefaultValues,
  createEmptyParticipant,
  createRegistrationSchema,
  getParticipantName,
  isParticipantComplete,
  isParticipantFilled,
} from "./schema"
import type { RegistrationValues, ParticipantValues } from "./types"
import { ParticipantStep } from "./participant-step"
import { StepIndicator } from "./step-indicator"
import { RaceStep } from "./race-step"
import type { RegistrationStep, RegistrationWizardProps } from "./types"

const PARTICIPANT_FIELD_LABELS: Record<string, string> = {
  raceId: "Race",
  firstName: "First name",
  lastName: "Last name",
  gender: "Gender",
  birthDate: "Date of birth",
  nationality: "Nationality",
  categoryId: "Category",
  identityNumber: "Identity number",
  bibName: "Bib name",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
}

/** API validation pointers look like `/participants/0/firstName`. */
function issuePointerToFieldPath(
  pointer: string
): FieldPath<RegistrationValues> | null {
  const segments = pointer.split("/").filter(Boolean)
  if (segments.length === 0) return null
  if (!["participants", "contact", "consents"].includes(segments[0]!)) {
    return null
  }
  return segments.join(".") as FieldPath<RegistrationValues>
}

function findLastParticipantIndex(
  participants: ParticipantValues[],
  raceId: string
): number {
  for (let index = participants.length - 1; index >= 0; index -= 1) {
    if (participants[index]?.raceId === raceId) return index
  }
  return -1
}

type SummaryItem = {
  key: string
  label: string
  fieldId?: string
  participantIndex?: number
}

export function RegistrationWizard({
  config,
  eventSlug,
  initialRaceId,
  initialCategoryId,
}: RegistrationWizardProps) {
  const router = useRouter()

  const initialParticipants = React.useMemo(() => {
    if (!initialRaceId) return []
    const raceConfig = config.races.find(
      (entry) => entry.race.id === initialRaceId
    )
    if (!raceConfig) return []

    const category = initialCategoryId
      ? raceConfig.categories.find((entry) => entry.id === initialCategoryId)
      : undefined

    return [createEmptyParticipant(initialRaceId, category?.id ?? "")]
  }, [config, initialCategoryId, initialRaceId])

  const schema = React.useMemo(() => createRegistrationSchema(config), [config])

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(schema),
    defaultValues: createDefaultValues(initialParticipants),
    mode: "onTouched",
  })

  const { control, getValues, handleSubmit, trigger } = form
  const { fields, append, remove } = useFieldArray({
    control,
    name: "participants",
  })
  const watchedParticipants = useWatch({ control, name: "participants" })
  const currentParticipants = (watchedParticipants ?? []) as ParticipantValues[]

  const [step, setStep] = React.useState<RegistrationStep>(
    initialParticipants.length > 0 ? "participants" : "races"
  )
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(
    initialParticipants.length > 0 ? 0 : null
  )
  const [viewOrderOpen, setViewOrderOpen] = React.useState(false)
  const [showErrorSummary, setShowErrorSummary] = React.useState(false)
  const [stepError, setStepError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [pendingRaceRemoval, setPendingRaceRemoval] = React.useState<
    string | null
  >(null)

  const idempotencyKeyRef = React.useRef<string | null>(null)

  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const wizardRef = React.useRef<HTMLDivElement>(null)
  const errorSummaryRef = React.useRef<HTMLDivElement>(null)
  const hasNavigated = React.useRef(false)

  React.useEffect(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true
      return
    }

    headingRef.current?.focus()

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    wizardRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }, [step])

  const counts = React.useMemo(() => {
    return currentParticipants.reduce<Record<string, number>>(
      (accumulator, participant) => {
        accumulator[participant.raceId] =
          (accumulator[participant.raceId] ?? 0) + 1
        return accumulator
      },
      {}
    )
  }, [currentParticipants])

  const lines = React.useMemo(
    () => buildOrderLines(currentParticipants, config),
    [config, currentParticipants]
  )
  const total = lines.reduce((sum, line) => sum + line.fee, 0)

  function focusParticipantHeader(index: number) {
    window.requestAnimationFrame(() => {
      const header = document.getElementById(`participant-${index}-header`)
      if (!header) return

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      header.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      })
      header.focus()
    })
  }

  function addParticipant(raceId: string) {
    const current = getValues("participants")
    if (current.length >= config.maxParticipantsPerOrder) return

    append(createEmptyParticipant(raceId))
    setExpandedIndex(current.length)
    setStepError(null)

    if (step === "races" && config.maxParticipantsPerOrder === 1) {
      setStep("participants")
      return
    }

    if (step === "participants") {
      focusParticipantHeader(current.length)
    }
  }

  function removeParticipantAt(index: number) {
    const current = getValues("participants")
    remove(index)

    setExpandedIndex((expanded) => {
      if (expanded === null) return null
      if (expanded === index) {
        const next = Math.min(index, current.length - 2)
        return next >= 0 ? next : null
      }
      if (expanded > index) return expanded - 1
      return expanded
    })
  }

  function removeRace(raceId: string) {
    const current = getValues("participants")
    const index = findLastParticipantIndex(current, raceId)
    if (index === -1) return

    const participant = current[index]
    if (participant && isParticipantFilled(participant)) {
      setPendingRaceRemoval(raceId)
      return
    }

    removeParticipantAt(index)
  }

  function confirmRaceRemoval() {
    if (!pendingRaceRemoval) return

    const current = getValues("participants")
    const index = findLastParticipantIndex(current, pendingRaceRemoval)
    setPendingRaceRemoval(null)

    if (index === -1) return
    removeParticipantAt(index)
  }

  async function saveParticipant(index: number) {
    const valid = await trigger(`participants.${index}`)
    if (!valid) return

    const current = getValues("participants")
    const nextIncomplete = current.findIndex(
      (participant, participantIndex) =>
        participantIndex > index && !isParticipantComplete(participant, config)
    )

    if (nextIncomplete === -1) {
      setExpandedIndex(null)
      return
    }

    setExpandedIndex(nextIncomplete)
    focusParticipantHeader(nextIncomplete)
  }

  function continueFromRaces() {
    const current = getValues("participants")
    if (current.length === 0) {
      setStepError("Choose at least one race to continue.")
      return
    }

    setStepError(null)
    const firstIncomplete = current.findIndex(
      (participant) => !isParticipantComplete(participant, config)
    )
    setExpandedIndex(firstIncomplete === -1 ? null : firstIncomplete)
    setStep("participants")
  }

  async function continueFromParticipants() {
    const valid = await trigger("participants")
    if (!valid) {
      const current = getValues("participants")
      const firstIncomplete = current.findIndex(
        (participant) => !isParticipantComplete(participant, config)
      )
      setExpandedIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
      setShowErrorSummary(true)
      setStep("participants")
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }

    setShowErrorSummary(false)
    setStep("checkout")
  }

  async function continueFromCheckout() {
    const valid = await trigger(["contact", "consents"])
    if (!valid) {
      setShowErrorSummary(true)
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }

    setShowErrorSummary(false)
    setStep("payment")
  }

  function editParticipant(index: number) {
    setShowErrorSummary(false)
    setStep("participants")
    setExpandedIndex(index)
  }

  function handleBack() {
    setShowErrorSummary(false)
    setStep(
      step === "payment"
        ? "checkout"
        : step === "checkout"
          ? "participants"
          : "races"
    )
  }

  function handleStepClick(target: RegistrationStep) {
    const targetIndex = STEP_ORDER.indexOf(target)
    const currentIndex = STEP_ORDER.indexOf(step)
    if (targetIndex >= currentIndex) return

    setShowErrorSummary(false)
    setStep(target)

    if (target === "participants") {
      const current = getValues("participants")
      const firstIncomplete = current.findIndex(
        (participant) => !isParticipantComplete(participant, config)
      )
      setExpandedIndex(firstIncomplete === -1 ? null : firstIncomplete)
    }
  }

  async function onSubmit(values: RegistrationValues) {
    setSubmitError(null)

    // Reuse one idempotency key for this checkout attempt so a retried request
    // replays the same order instead of creating a duplicate.
    idempotencyKeyRef.current ??= crypto.randomUUID()

    try {
      const api = getBrowserApi()
      const order = await api.request<Schemas["PublicOrderDto"]>(
        `/v1/public/events/${eventSlug}/orders`,
        {
          method: "POST",
          body: toCreateOrderRequest(values),
          idempotencyKey: idempotencyKeyRef.current,
        }
      )

      try {
        const payment = await api.request<Schemas["PublicPaymentDto"]>(
          `/v1/public/orders/${order.orderNumber}/payments`,
          { method: "POST", idempotencyKey: crypto.randomUUID() }
        )
        window.location.assign(payment.redirectUrl)
        return
      } catch {
        // Online payment may be disabled; the receipt still explains the pending state.
      }

      router.push(`/e/${eventSlug}/register/success/${order.orderNumber}`)
    } catch (error) {
      // A rejected attempt created nothing, so the next submit is a new attempt.
      if (error instanceof ApiError && error.status < 500) {
        idempotencyKeyRef.current = null
      }

      if (error instanceof ApiError && error.isValidationFailed) {
        const fields = applyValidationIssues(error.issues)
        setSubmitError(
          fields > 0
            ? "Some details need attention. Check the highlighted fields."
            : "The organizer could not accept this order. Review your details and try again."
        )
        return
      }

      setSubmitError(
        error instanceof ApiError
          ? (error.detail ??
              "The order could not be completed. Please try again.")
          : "Something went wrong while completing the order. Please try again."
      )
    }
  }

  /** Maps `422 errors[]` onto the form and focuses the first affected step. */
  function applyValidationIssues(issues: ApiError["issues"]): number {
    let applied = 0
    let firstParticipantIndex: number | null = null

    for (const issue of issues) {
      const path = issuePointerToFieldPath(issue.pointer)
      if (!path) continue

      form.setError(path, { type: issue.code, message: issue.message })
      applied += 1

      if (issue.pointer.startsWith("/participants/") && firstParticipantIndex === null) {
        const index = Number(issue.pointer.split("/")[2])
        if (Number.isInteger(index)) firstParticipantIndex = index
      }
    }

    if (applied > 0) {
      setShowErrorSummary(true)
      if (firstParticipantIndex !== null) {
        setStep("participants")
        setExpandedIndex(firstParticipantIndex)
      } else {
        setStep("checkout")
      }
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
    }

    return applied
  }

  function onInvalid(invalidErrors: FieldErrors<RegistrationValues>) {
    setShowErrorSummary(true)

    if (invalidErrors.participants) {
      const current = getValues("participants")
      const firstIncomplete = current.findIndex(
        (participant) => !isParticipantComplete(participant, config)
      )
      setStep("participants")
      setExpandedIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
    } else if (invalidErrors.contact || invalidErrors.consents) {
      setStep("checkout")
    }

    window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
  }

  function buildSummaryItems(): SummaryItem[] {
    const items: SummaryItem[] = []
    const errors = form.formState.errors

    if (step === "participants") {
      currentParticipants.forEach((participant, index) => {
        const participantErrors = errors.participants?.[index]
        if (!participantErrors && isParticipantComplete(participant, config))
          return

        const fieldKey = participantErrors
          ? Object.keys(participantErrors)[0]
          : undefined
        const fieldLabel = fieldKey
          ? (PARTICIPANT_FIELD_LABELS[fieldKey] ?? "Details")
          : "Details"

        items.push({
          key: `participant-${index}`,
          label: `Participant ${index + 1} · ${getParticipantName(participant, index)} · ${fieldLabel}`,
          participantIndex: index,
        })
      })

      return items
    }

    const checkoutFields: SummaryItem[] = [
      {
        key: "contact-email",
        label: "Contact email",
        fieldId: "contact-email",
      },
      {
        key: "contact-phone",
        label: "Contact phone",
        fieldId: "contact-phone",
      },
      {
        key: "consent-terms",
        label: "Race rules consent",
        fieldId: "consent-terms",
      },
      {
        key: "consent-medical",
        label: "Medical fitness consent",
        fieldId: "consent-medical",
      },
      {
        key: "consent-privacy",
        label: "Privacy consent",
        fieldId: "consent-privacy",
      },
    ]

    if (errors.contact?.email) items.push(checkoutFields[0]!)
    if (errors.contact?.phone) items.push(checkoutFields[1]!)
    if (errors.consents?.terms) items.push(checkoutFields[2]!)
    if (errors.consents?.medical) items.push(checkoutFields[3]!)
    if (errors.consents?.privacy) items.push(checkoutFields[4]!)

    return items
  }

  function handleSummaryItem(item: SummaryItem) {
    if (item.participantIndex !== undefined) {
      setStep("participants")
      setExpandedIndex(item.participantIndex)
      window.requestAnimationFrame(() =>
        document
          .getElementById(`participant-${item.participantIndex}-header`)
          ?.focus()
      )
      return
    }

    if (item.fieldId) {
      window.requestAnimationFrame(() =>
        document.getElementById(item.fieldId ?? "")?.focus()
      )
    }
  }

  const summaryItems = showErrorSummary ? buildSummaryItems() : []
  const visibleSummaryItems = summaryItems.slice(0, 5)
  const remainingSummaryItems = summaryItems.length - visibleSummaryItems.length

  const pendingRaceName = pendingRaceRemoval
    ? config.races.find((entry) => entry.race.id === pendingRaceRemoval)?.race
        .name
    : undefined

  const participantCountLabel =
    currentParticipants.length === 1
      ? "1 participant"
      : `${currentParticipants.length} participants`

  const ctaLabel =
    step === "races"
      ? currentParticipants.length === 0
        ? "Choose a race"
        : `Continue with ${participantCountLabel}`
      : step === "participants"
        ? "Continue to checkout"
        : step === "checkout"
          ? "Continue to payment"
          : "Complete registration"

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="w-full"
      >
        <div ref={wizardRef} className="scroll-mt-20">
          <StepIndicator step={step} onStepClick={handleStepClick} />

          <div className="mt-6 flex flex-col gap-1">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold tracking-tight outline-none"
            >
              {STEP_TITLES[step]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {STEP_DESCRIPTIONS[step]}
            </p>
          </div>

          {step !== "races" ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
              >
                <ArrowLeft />
                Back to{" "}
                {step === "payment"
                  ? "checkout"
                  : step === "checkout"
                    ? "participant details"
                    : "races"}
              </Button>
            </div>
          ) : null}

          {stepError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Choose a race first</AlertTitle>
              <AlertDescription>{stepError}</AlertDescription>
            </Alert>
          ) : null}

          {showErrorSummary && summaryItems.length > 0 ? (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              className="mt-4 outline-none"
            >
              <Alert variant="destructive">
                <AlertTitle>
                  Check {summaryItems.length}{" "}
                  {summaryItems.length === 1 ? "detail" : "details"} before
                  continuing
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 flex flex-col items-start gap-1">
                    {visibleSummaryItems.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={() => handleSummaryItem(item)}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                    {remainingSummaryItems > 0 ? (
                      <li>and {remainingSummaryItems} more</li>
                    ) : null}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="mt-4">
            {step === "races" ? (
              <RaceStep
                config={config}
                counts={counts}
                onAdd={addParticipant}
                onRemove={removeRace}
              />
            ) : null}

            {step === "participants" ? (
              <ParticipantStep
                config={config}
                fields={fields}
                expandedIndex={expandedIndex}
                onExpand={setExpandedIndex}
                onSave={saveParticipant}
                onRemove={removeParticipantAt}
                onAddParticipant={addParticipant}
                onBackToRaces={() => setStep("races")}
              />
            ) : null}

            {step === "checkout" ? (
              <CheckoutStep
                config={config}
                onEditParticipant={editParticipant}
                onContinue={continueFromCheckout}
              />
            ) : null}

            {step === "payment" ? (
              <PaymentStep
                lines={lines}
                total={total}
                isSubmitting={form.formState.isSubmitting}
                submitError={submitError}
              />
            ) : null}
          </div>

          <StickyOrderBar
            participantCount={currentParticipants.length}
            total={total}
            ctaLabel={ctaLabel}
            ctaType={step === "payment" ? "submit" : "button"}
            onCta={
              step === "races"
                ? continueFromRaces
                : step === "participants"
                  ? continueFromParticipants
                  : step === "checkout"
                    ? continueFromCheckout
                    : undefined
            }
            ctaDisabled={step === "races" && currentParticipants.length === 0}
            isSubmitting={form.formState.isSubmitting}
            showViewOrder={
              currentParticipants.length > 0 &&
              step !== "checkout" &&
              step !== "payment"
            }
            onViewOrder={() => setViewOrderOpen(true)}
          />

          <OrderSummarySheet
            open={viewOrderOpen}
            onOpenChange={setViewOrderOpen}
            lines={lines}
            total={total}
          />

          <AlertDialog
            open={pendingRaceRemoval !== null}
            onOpenChange={(open) => {
              if (!open) setPendingRaceRemoval(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this participant?</AlertDialogTitle>
                <AlertDialogDescription>
                  The last participant for {pendingRaceName ?? "this race"} has
                  details entered. Removing them will lose those details.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11 sm:h-9">
                  Keep participant
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  className="h-11 sm:h-9"
                  onClick={confirmRaceRemoval}
                >
                  Remove participant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </FormProvider>
  )
}
