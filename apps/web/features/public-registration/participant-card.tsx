"use client"

import * as React from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Check, ChevronDown, CircleAlert, Trash2 } from "lucide-react"

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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { cn } from "@workspace/ui/lib/utils"

import type { PublicRegistrationConfig } from "./types"

import { formatCurrency } from "@/lib/format"

import { NATIONALITIES } from "./constants"
import {
  formatCategoryRule,
  getAgeOnDate,
  getCategory,
  getEligibleCategories,
  getRaceConfig,
  getRaceDate,
  getParticipantName,
  isCategoryEligible,
  isParticipantComplete,
  isParticipantFilled,
  todayDateString,
} from "./schema"
import type { RegistrationValues, ParticipantValues } from "./types"

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const

const NATIONALITY_VALUES: readonly string[] = NATIONALITIES

export function ParticipantCard({
  index,
  fieldId,
  config,
  isExpanded,
  isLast,
  onExpand,
  onSave,
  onRemove,
}: {
  index: number
  fieldId: string
  config: PublicRegistrationConfig
  isExpanded: boolean
  isLast: boolean
  onExpand: () => void
  onSave: () => void
  onRemove: () => void
}) {
  const {
    control,
    register,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<RegistrationValues>()

  const participant = useWatch({
    control,
    name: `participants.${index}`,
  }) as ParticipantValues | undefined

  const participantErrors = errors.participants?.[index]
  const raceConfig = participant
    ? getRaceConfig(config, participant.raceId)
    : undefined
  const raceDate = raceConfig ? getRaceDate(raceConfig.race) : ""
  const age =
    participant?.birthDate && raceDate
      ? getAgeOnDate(participant.birthDate, raceDate)
      : null
  const eligibleCategories = getEligibleCategories(
    participant?.gender ?? "",
    age,
    raceConfig?.categories ?? []
  )
  const suggestedCategory = eligibleCategories[0]
  const selectedCategory =
    participant && raceConfig
      ? getCategory(config, participant.raceId, participant.categoryId)
      : undefined
  const selectedIsEligible =
    Boolean(participant) &&
    Boolean(selectedCategory) &&
    age !== null &&
    Boolean(
      participant &&
      selectedCategory &&
      isCategoryEligible(participant.gender, age, selectedCategory)
    )
  const complete = participant
    ? isParticipantComplete(participant, config)
    : false
  const participantName = getParticipantName(participant, index)
  const raceName = raceConfig?.race.name ?? "Race"
  const categoryName = selectedCategory?.name ?? "Category pending"

  const headerId = `participant-${index}-header`
  const panelId = `participant-${fieldId}-panel`
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otherNationality, setOtherNationality] = React.useState(false)

  React.useEffect(() => {
    if (!participant?.gender || age === null) return
    if (participant.categoryId) return
    if (!suggestedCategory) return

    setValue(`participants.${index}.categoryId`, suggestedCategory.id, {
      shouldValidate: false,
      shouldTouch: false,
    })
  }, [
    age,
    index,
    participant?.categoryId,
    participant?.gender,
    setValue,
    suggestedCategory,
  ])

  function handleRemoveClick() {
    if (isParticipantFilled(participant)) {
      setConfirmOpen(true)
      return
    }

    onRemove()
  }

  function fillBibName() {
    const firstName = getValues(`participants.${index}.firstName`) ?? ""
    setValue(
      `participants.${index}.bibName`,
      firstName.trim().toUpperCase().slice(0, 16),
      { shouldValidate: true, shouldTouch: true }
    )
  }

  const firstNameErrorId = `participant-${index}-firstName-error`
  const lastNameErrorId = `participant-${index}-lastName-error`
  const genderErrorId = `participant-${index}-gender-error`
  const birthDateErrorId = `participant-${index}-birthDate-error`
  const nationalityErrorId = `participant-${index}-nationality-error`
  const categoryErrorId = `participant-${index}-category-error`
  const identityErrorId = `participant-${index}-identityNumber-error`
  const bibNameErrorId = `participant-${index}-bibName-error`
  const emergencyNameErrorId = `participant-${index}-emergencyContactName-error`
  const emergencyPhoneErrorId = `participant-${index}-emergencyContactPhone-error`

  return (
    <Card
      size="sm"
      className={cn("gap-0 py-0", isExpanded && "ring-primary/20")}
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onExpand}
        className="flex w-full items-center gap-3 p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums">
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {participantName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {raceName} · {categoryName}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <Badge variant={complete ? "secondary" : "outline"}>
            {complete ? <Check /> : <CircleAlert />}
            {complete ? "Complete" : "Needs info"}
          </Badge>
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(raceConfig?.fee ?? 0)}
          </span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t px-3 pt-4 pb-3"
        >
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                data-invalid={participantErrors?.firstName ? true : undefined}
              >
                <FieldLabel htmlFor={`participant-${index}-firstName`}>
                  First name
                </FieldLabel>
                <Input
                  id={`participant-${index}-firstName`}
                  className="h-11 scroll-mb-32 sm:h-8"
                  maxLength={80}
                  autoComplete={index === 0 ? "given-name" : "off"}
                  aria-invalid={Boolean(participantErrors?.firstName)}
                  aria-describedby={
                    participantErrors?.firstName ? firstNameErrorId : undefined
                  }
                  {...register(`participants.${index}.firstName`)}
                />
                <FieldError
                  id={firstNameErrorId}
                  errors={[participantErrors?.firstName]}
                />
              </Field>

              <Field
                data-invalid={participantErrors?.lastName ? true : undefined}
              >
                <FieldLabel htmlFor={`participant-${index}-lastName`}>
                  Last name
                </FieldLabel>
                <Input
                  id={`participant-${index}-lastName`}
                  className="h-11 scroll-mb-32 sm:h-8"
                  maxLength={80}
                  autoComplete={index === 0 ? "family-name" : "off"}
                  aria-invalid={Boolean(participantErrors?.lastName)}
                  aria-describedby={
                    participantErrors?.lastName ? lastNameErrorId : undefined
                  }
                  {...register(`participants.${index}.lastName`)}
                />
                <FieldError
                  id={lastNameErrorId}
                  errors={[participantErrors?.lastName]}
                />
              </Field>
            </div>

            <FieldSet
              data-invalid={participantErrors?.gender ? true : undefined}
            >
              <FieldLegend variant="label">Gender</FieldLegend>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((gender) => (
                  <label
                    key={gender.value}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                      "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
                      "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      participantErrors?.gender && "border-destructive"
                    )}
                  >
                    <input
                      type="radio"
                      value={gender.value}
                      className="sr-only"
                      aria-invalid={Boolean(participantErrors?.gender)}
                      aria-describedby={
                        participantErrors?.gender ? genderErrorId : undefined
                      }
                      {...register(`participants.${index}.gender`)}
                    />
                    {gender.label}
                  </label>
                ))}
              </div>
              <FieldDescription>Used for race categories.</FieldDescription>
              <FieldError
                id={genderErrorId}
                errors={[participantErrors?.gender]}
              />
            </FieldSet>

            <Field
              data-invalid={participantErrors?.birthDate ? true : undefined}
            >
              <FieldLabel htmlFor={`participant-${index}-birthDate`}>
                Date of birth
              </FieldLabel>
              <Input
                id={`participant-${index}-birthDate`}
                className="h-11 scroll-mb-32 sm:h-8"
                type="date"
                max={todayDateString()}
                min="1900-01-01"
                autoComplete={index === 0 ? "bday" : "off"}
                aria-invalid={Boolean(participantErrors?.birthDate)}
                aria-describedby={
                  participantErrors?.birthDate ? birthDateErrorId : undefined
                }
                {...register(`participants.${index}.birthDate`)}
              />
              {age !== null ? (
                <FieldDescription>Age on race day: {age}</FieldDescription>
              ) : (
                <FieldDescription>
                  Used for the race category and eligibility.
                </FieldDescription>
              )}
              <FieldError
                id={birthDateErrorId}
                errors={[participantErrors?.birthDate]}
              />
            </Field>

            <Controller
              control={control}
              name={`participants.${index}.nationality`}
              render={({ field }) => {
                const isOther =
                  otherNationality ||
                  (field.value !== "" &&
                    !NATIONALITY_VALUES.includes(field.value))
                const selectValue = otherNationality
                  ? "Other"
                  : field.value === ""
                    ? ""
                    : isOther
                      ? "Other"
                      : field.value

                return (
                  <Field
                    data-invalid={
                      participantErrors?.nationality ? true : undefined
                    }
                  >
                    <FieldLabel htmlFor={`participant-${index}-nationality`}>
                      Nationality
                    </FieldLabel>
                    <Select
                      items={NATIONALITIES.map((nationality) => ({
                        value: nationality,
                        label: nationality,
                      }))}
                      value={selectValue === "" ? null : selectValue}
                      onValueChange={(value) => {
                        if (typeof value !== "string") return
                        if (value === "Other") {
                          setOtherNationality(true)
                          field.onChange("")
                          return
                        }
                        setOtherNationality(false)
                        field.onChange(value)
                      }}
                    >
                      <SelectTrigger
                        id={`participant-${index}-nationality`}
                        className="h-11 w-full scroll-mb-32 sm:h-8"
                        aria-invalid={Boolean(participantErrors?.nationality)}
                        aria-describedby={
                          participantErrors?.nationality
                            ? nationalityErrorId
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Select nationality">
                          {(value) =>
                            value === "Other"
                              ? "Other"
                              : typeof value === "string" && value
                                ? value
                                : "Select nationality"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((nationality) => (
                          <SelectItem key={nationality} value={nationality}>
                            {nationality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isOther ? (
                      <>
                        <Input
                          className="h-11 scroll-mb-32 sm:h-8"
                          aria-label="Enter nationality"
                          aria-invalid={Boolean(participantErrors?.nationality)}
                          aria-describedby={
                            participantErrors?.nationality
                              ? nationalityErrorId
                              : undefined
                          }
                          autoComplete="country-name"
                          maxLength={56}
                          placeholder="Enter nationality"
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                          onBlur={field.onBlur}
                        />
                        <FieldDescription>
                          Enter the nationality as it appears on the
                          participant's ID.
                        </FieldDescription>
                      </>
                    ) : null}

                    <FieldError
                      id={nationalityErrorId}
                      errors={[participantErrors?.nationality]}
                    />
                  </Field>
                )
              }}
            />

            <Controller
              control={control}
              name={`participants.${index}.categoryId`}
              render={({ field }) => {
                if (!raceConfig) {
                  return (
                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <FieldDescription className="text-destructive">
                        This race is no longer available. Go back and choose
                        another race.
                      </FieldDescription>
                    </Field>
                  )
                }

                if (!participant?.gender || age === null) {
                  return (
                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <FieldDescription>
                        {selectedCategory
                          ? `Preset category: ${selectedCategory.name}. Choose a gender and date of birth to confirm it.`
                          : "Choose a gender and date of birth to see the category."}
                      </FieldDescription>
                    </Field>
                  )
                }

                if (eligibleCategories.length === 0) {
                  return (
                    <Field data-invalid={true}>
                      <FieldLabel>Category</FieldLabel>
                      <FieldDescription className="text-destructive">
                        No category matches this age and gender. Check the date
                        of birth or contact the organizer.
                      </FieldDescription>
                    </Field>
                  )
                }

                return (
                  <Field
                    data-invalid={
                      participantErrors?.categoryId ? true : undefined
                    }
                  >
                    <FieldLabel htmlFor={`participant-${index}-category`}>
                      Category
                    </FieldLabel>
                    <Select
                      items={raceConfig.categories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      value={field.value === "" ? null : field.value}
                      onValueChange={(value) => {
                        if (typeof value !== "string") return
                        field.onChange(value)
                        void trigger(`participants.${index}.categoryId`)
                      }}
                    >
                      <SelectTrigger
                        id={`participant-${index}-category`}
                        className="h-11 w-full scroll-mb-32 sm:h-8"
                        aria-invalid={Boolean(participantErrors?.categoryId)}
                        aria-describedby={
                          participantErrors?.categoryId
                            ? categoryErrorId
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Choose a category">
                          {(value) =>
                            raceConfig.categories.find(
                              (category) => category.id === value
                            )?.name ?? "Choose a category"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {raceConfig.categories.map((category) => {
                          const eligible =
                            participant.gender === "male" ||
                            participant.gender === "female"
                              ? isCategoryEligible(
                                  participant.gender,
                                  age,
                                  category
                                )
                              : false

                          return (
                            <SelectItem
                              key={category.id}
                              value={category.id}
                              disabled={!eligible}
                            >
                              {category.name} ({category.minAge}–
                              {category.maxAge})
                              {eligible ? "" : " — not eligible"}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>

                    <FieldDescription>
                      {selectedCategory
                        ? formatCategoryRule(selectedCategory)
                        : "Set from gender and age."}
                    </FieldDescription>

                    {selectedCategory && !selectedIsEligible ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex flex-wrap items-center gap-2 text-sm text-destructive"
                      >
                        <span>
                          This category isn't available for this participant.
                        </span>
                        {suggestedCategory ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setValue(
                                `participants.${index}.categoryId`,
                                suggestedCategory.id,
                                {
                                  shouldValidate: true,
                                  shouldTouch: true,
                                }
                              )
                            }}
                          >
                            Use {suggestedCategory.name}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    <FieldError
                      id={categoryErrorId}
                      errors={[participantErrors?.categoryId]}
                    />
                  </Field>
                )
              }}
            />

            {config.identityNumberRequired ? (
              <Field
                data-invalid={
                  participantErrors?.identityNumber ? true : undefined
                }
              >
                <FieldLabel htmlFor={`participant-${index}-identityNumber`}>
                  Identity number
                </FieldLabel>
                <Input
                  id={`participant-${index}-identityNumber`}
                  className="h-11 scroll-mb-32 sm:h-8"
                  maxLength={24}
                  autoComplete="off"
                  aria-invalid={Boolean(participantErrors?.identityNumber)}
                  aria-describedby={
                    participantErrors?.identityNumber
                      ? identityErrorId
                      : undefined
                  }
                  {...register(`participants.${index}.identityNumber`)}
                />
                <FieldDescription>
                  Required by the organizer. KTP or passport.
                </FieldDescription>
                <FieldError
                  id={identityErrorId}
                  errors={[participantErrors?.identityNumber]}
                />
              </Field>
            ) : null}

            <Field data-invalid={participantErrors?.bibName ? true : undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={`participant-${index}-bibName`}>
                  Bib name (optional)
                </FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={fillBibName}
                >
                  Use first name
                </Button>
              </div>
              <Input
                id={`participant-${index}-bibName`}
                className="h-11 scroll-mb-32 sm:h-8"
                maxLength={16}
                autoComplete="off"
                aria-invalid={Boolean(participantErrors?.bibName)}
                aria-describedby={
                  participantErrors?.bibName ? bibNameErrorId : undefined
                }
                {...register(`participants.${index}.bibName`)}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Printed on the bib.</span>
                <span className="tabular-nums">
                  {(participant?.bibName ?? "").length}/16
                </span>
              </div>
              <FieldError
                id={bibNameErrorId}
                errors={[participantErrors?.bibName]}
              />
            </Field>

            {config.emergencyContactRequired ? (
              <FieldSet>
                <FieldLegend variant="label">Emergency contact</FieldLegend>
                <FieldDescription>
                  Used by race medical staff only. Required for this event.
                </FieldDescription>

                <Field
                  data-invalid={
                    participantErrors?.emergencyContactName ? true : undefined
                  }
                >
                  <FieldLabel htmlFor={`participant-${index}-emergencyName`}>
                    Name
                  </FieldLabel>
                  <Input
                    id={`participant-${index}-emergencyName`}
                    className="h-11 scroll-mb-32 sm:h-8"
                    maxLength={80}
                    autoComplete="off"
                    aria-invalid={Boolean(
                      participantErrors?.emergencyContactName
                    )}
                    aria-describedby={
                      participantErrors?.emergencyContactName
                        ? emergencyNameErrorId
                        : undefined
                    }
                    {...register(`participants.${index}.emergencyContactName`)}
                  />
                  <FieldError
                    id={emergencyNameErrorId}
                    errors={[participantErrors?.emergencyContactName]}
                  />
                </Field>

                <Field
                  data-invalid={
                    participantErrors?.emergencyContactPhone ? true : undefined
                  }
                >
                  <FieldLabel htmlFor={`participant-${index}-emergencyPhone`}>
                    Phone
                  </FieldLabel>
                  <Input
                    id={`participant-${index}-emergencyPhone`}
                    className="h-11 scroll-mb-32 sm:h-8"
                    type="tel"
                    inputMode="tel"
                    maxLength={30}
                    autoComplete="off"
                    aria-invalid={Boolean(
                      participantErrors?.emergencyContactPhone
                    )}
                    aria-describedby={
                      participantErrors?.emergencyContactPhone
                        ? emergencyPhoneErrorId
                        : undefined
                    }
                    {...register(`participants.${index}.emergencyContactPhone`)}
                  />
                  <FieldError
                    id={emergencyPhoneErrorId}
                    errors={[participantErrors?.emergencyContactPhone]}
                  />
                </Field>
              </FieldSet>
            ) : null}
          </FieldGroup>

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 sm:h-7"
              aria-label={`Remove participant ${index + 1}`}
              onClick={handleRemoveClick}
            >
              <Trash2 />
              Remove
            </Button>
            <Button type="button" className="h-11 sm:h-9" onClick={onSave}>
              {isLast ? "Save participant" : "Save and next participant"}
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove participant {index + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              The details entered for this participant will be lost. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 sm:h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11 sm:h-9"
              onClick={() => {
                setConfirmOpen(false)
                onRemove()
              }}
            >
              Remove participant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
