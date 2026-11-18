import { z } from "zod"

import { DEFAULT_NATIONALITY } from "./constants"
import type {
  OrderLine,
  ParticipantValues,
  PublicRaceConfig,
  PublicRegistrationConfig,
  RegistrationCategory,
  RegistrationRace,
  RegistrationValues,
} from "./types"

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function getAgeOnDate(birthDate: string, date: string): number | null {
  const birth = parseDateOnly(birthDate)
  const target = parseDateOnly(date)
  if (!birth || !target) return null

  let age = target.getUTCFullYear() - birth.getUTCFullYear()
  const monthDifference = target.getUTCMonth() - birth.getUTCMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && target.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1
  }

  return age
}

export function getRaceConfig(
  config: PublicRegistrationConfig,
  raceId: string
): PublicRaceConfig | undefined {
  return config.races.find((entry) => entry.race.id === raceId)
}

export function getCategory(
  config: PublicRegistrationConfig,
  raceId: string,
  categoryId: string
): RegistrationCategory | undefined {
  return getRaceConfig(config, raceId)?.categories.find(
    (category) => category.id === categoryId
  )
}

export function isCategoryEligible(
  gender: ParticipantValues["gender"],
  age: number,
  category: RegistrationCategory
): boolean {
  if (gender !== "male" && gender !== "female") return false

  const genderMatches =
    category.gender === "mixed" ||
    category.gender === "open" ||
    category.gender === gender

  return genderMatches && age >= category.minAge && age <= category.maxAge
}

export function getEligibleCategories(
  gender: ParticipantValues["gender"],
  age: number | null,
  categories: RegistrationCategory[]
): RegistrationCategory[] {
  if (age === null) return []
  return categories.filter((category) =>
    isCategoryEligible(gender, age, category)
  )
}

export function getRaceDate(race: RegistrationRace): string {
  return race.startTime.slice(0, 10)
}

export function formatCategoryRule(category: RegistrationCategory): string {
  const gender =
    category.gender === "male"
      ? "Male"
      : category.gender === "female"
        ? "Female"
        : "Open"

  return `${gender} · age ${category.minAge}–${category.maxAge} on race day`
}

export function createEmptyParticipant(
  raceId: string,
  categoryId = ""
): ParticipantValues {
  return {
    raceId,
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    nationality: DEFAULT_NATIONALITY,
    categoryId,
    identityNumber: "",
    bibName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  }
}

export function getParticipantName(
  participant: ParticipantValues | undefined,
  index: number
): string {
  const name = [participant?.firstName, participant?.lastName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ")

  return name || `Participant ${index + 1}`
}

export function isParticipantFilled(
  participant: ParticipantValues | undefined
): boolean {
  if (!participant) return false

  return Boolean(
    participant.firstName.trim() ||
    participant.lastName.trim() ||
    participant.gender ||
    participant.birthDate ||
    participant.categoryId ||
    participant.identityNumber.trim() ||
    participant.bibName.trim() ||
    participant.emergencyContactName.trim() ||
    participant.emergencyContactPhone.trim() ||
    (participant.nationality && participant.nationality !== DEFAULT_NATIONALITY)
  )
}

export function isParticipantComplete(
  participant: ParticipantValues,
  config: PublicRegistrationConfig
): boolean {
  const raceConfig = getRaceConfig(config, participant.raceId)
  if (!raceConfig) return false
  if (!participant.firstName.trim() || !participant.lastName.trim())
    return false
  if (!participant.nationality.trim()) return false
  if (participant.gender !== "male" && participant.gender !== "female")
    return false

  const age = getAgeOnDate(participant.birthDate, getRaceDate(raceConfig.race))
  if (age === null) return false

  const category = raceConfig.categories.find(
    (entry) => entry.id === participant.categoryId
  )
  if (!category || !isCategoryEligible(participant.gender, age, category)) {
    return false
  }

  const identityNumber = participant.identityNumber.trim()
  if (identityNumber.length > 0 && identityNumber.length < 6) return false
  if (config.identityNumberRequired && identityNumber.length < 6) return false
  if (identityNumber.length > 24) return false
  if (participant.bibName.trim().length > 16) return false

  const emergencyName = participant.emergencyContactName.trim()
  const emergencyPhone = participant.emergencyContactPhone.trim()
  if (emergencyName.length > 80 || emergencyPhone.length > 30) return false
  if (config.emergencyContactRequired) {
    if (!emergencyName || !isValidPhone(emergencyPhone)) return false
  } else if (emergencyPhone && !isValidPhone(emergencyPhone)) {
    return false
  }

  return true
}

export function buildOrderLines(
  participants: ParticipantValues[],
  config: PublicRegistrationConfig
): OrderLine[] {
  return participants.map((participant, index) => {
    const raceConfig = getRaceConfig(config, participant.raceId)
    const category = raceConfig?.categories.find(
      (entry) => entry.id === participant.categoryId
    )

    return {
      participantNumber: index + 1,
      name: getParticipantName(participant, index),
      raceName: raceConfig?.race.name ?? "Race",
      categoryName: category?.name ?? "Category pending",
      fee: raceConfig?.fee ?? 0,
    }
  })
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 20
}

export function createRegistrationSchema(config: PublicRegistrationConfig) {
  const participantSchema = z
    .object({
      raceId: z.string().min(1, "Choose a race."),
      firstName: z
        .string()
        .trim()
        .min(1, "Enter a first name.")
        .max(80, "Use 80 characters or fewer."),
      lastName: z
        .string()
        .trim()
        .min(1, "Enter a last name.")
        .max(80, "Use 80 characters or fewer."),
      gender: z
        .union([z.literal(""), z.literal("male"), z.literal("female")])
        .refine((value) => value !== "", "Choose a gender."),
      birthDate: z.string().min(1, "Enter a date of birth."),
      nationality: z
        .string()
        .trim()
        .min(1, "Enter a nationality.")
        .max(56, "Use 56 characters or fewer."),
      categoryId: z.string().min(1, "Choose a category."),
      identityNumber: z.string().trim().max(24, "Use 24 characters or fewer."),
      bibName: z.string().trim().max(16, "Use 16 characters or fewer."),
      emergencyContactName: z
        .string()
        .trim()
        .max(80, "Use 80 characters or fewer."),
      emergencyContactPhone: z
        .string()
        .trim()
        .max(30, "Use 30 characters or fewer."),
    })
    .superRefine((participant, context) => {
      const raceConfig = getRaceConfig(config, participant.raceId)

      if (!raceConfig) {
        context.addIssue({
          code: "custom",
          message: "Choose a race.",
          path: ["raceId"],
        })
        return
      }

      if (!participant.birthDate) return

      const birthDate = parseDateOnly(participant.birthDate)
      if (!birthDate) {
        context.addIssue({
          code: "custom",
          message: "Enter a valid date of birth.",
          path: ["birthDate"],
        })
        return
      }

      const today = parseDateOnly(todayDateString())
      if (today && birthDate > today) {
        context.addIssue({
          code: "custom",
          message: "Date of birth cannot be in the future.",
          path: ["birthDate"],
        })
        return
      }

      const age = getAgeOnDate(
        participant.birthDate,
        getRaceDate(raceConfig.race)
      )
      if (age === null) {
        context.addIssue({
          code: "custom",
          message: "Enter a valid date of birth.",
          path: ["birthDate"],
        })
        return
      }

      if (participant.gender !== "male" && participant.gender !== "female") {
        return
      }

      const category = raceConfig.categories.find(
        (entry) => entry.id === participant.categoryId
      )
      if (!category) {
        context.addIssue({
          code: "custom",
          message: "Choose a category.",
          path: ["categoryId"],
        })
        return
      }

      if (!isCategoryEligible(participant.gender, age, category)) {
        context.addIssue({
          code: "custom",
          message:
            "This category is not available for this participant's age and gender.",
          path: ["categoryId"],
        })
      }

      const identityNumber = participant.identityNumber.trim()
      if (config.identityNumberRequired && identityNumber.length < 6) {
        context.addIssue({
          code: "custom",
          message: "Enter an identity number.",
          path: ["identityNumber"],
        })
      } else if (identityNumber.length > 0 && identityNumber.length < 6) {
        context.addIssue({
          code: "custom",
          message: "Use at least 6 characters.",
          path: ["identityNumber"],
        })
      }

      if (config.emergencyContactRequired) {
        if (!participant.emergencyContactName.trim()) {
          context.addIssue({
            code: "custom",
            message: "Enter an emergency contact name.",
            path: ["emergencyContactName"],
          })
        }

        const emergencyPhone = participant.emergencyContactPhone.trim()
        if (!emergencyPhone) {
          context.addIssue({
            code: "custom",
            message: "Enter an emergency contact phone number.",
            path: ["emergencyContactPhone"],
          })
        } else if (!isValidPhone(emergencyPhone)) {
          context.addIssue({
            code: "custom",
            message: "Enter a valid phone number.",
            path: ["emergencyContactPhone"],
          })
        }
      } else if (
        participant.emergencyContactPhone.trim() &&
        !isValidPhone(participant.emergencyContactPhone)
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter a valid phone number.",
          path: ["emergencyContactPhone"],
        })
      }
    })

  const requiredConsent = z
    .boolean()
    .refine((value) => value === true, "Please accept to continue.")

  return z.object({
    participants: z
      .array(participantSchema)
      .min(1, "Choose at least one race to continue.")
      .max(
        config.maxParticipantsPerOrder,
        `Up to ${config.maxParticipantsPerOrder} ${
          config.maxParticipantsPerOrder === 1 ? "participant" : "participants"
        } per order.`
      ),
    contact: z.object({
      email: z
        .string()
        .trim()
        .min(1, "Enter an email address.")
        .email("Enter a valid email address.")
        .max(254, "Use 254 characters or fewer."),
      phone: z
        .string()
        .trim()
        .min(1, "Enter a phone number.")
        .max(30, "Use 30 characters or fewer.")
        .refine(isValidPhone, "Enter a valid phone number."),
    }),
    consents: z.object({
      terms: requiredConsent,
      medical: requiredConsent,
      privacy: requiredConsent,
      updates: z.boolean(),
    }),
  })
}

export type RegistrationSchema = ReturnType<typeof createRegistrationSchema>

/**
 * Used by the wizard to seed the form and by tests to keep the shape in one
 * place.
 */
export function createDefaultValues(
  participants: ParticipantValues[]
): RegistrationValues {
  return {
    participants,
    contact: { email: "", phone: "" },
    consents: {
      terms: false,
      medical: false,
      privacy: false,
      updates: false,
    },
  }
}
