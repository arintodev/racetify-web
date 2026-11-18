import type { Schemas } from "@workspace/api-client"

import type {
  PublicRegistrationConfig,
  RegistrationPhase,
  RegistrationValues,
} from "./types"

function normalizePhase(value: string): RegistrationPhase {
  return value === "upcoming" || value === "closed" ? value : "open"
}

/** Converts the API registration config into the shape the wizard renders. */
export function toRegistrationConfig(
  dto: Schemas["PublicRegistrationConfigDto"]
): PublicRegistrationConfig {
  return {
    event: {
      slug: dto.event.slug,
      name: dto.event.name,
      startDate: dto.event.startDate,
      endDate: dto.event.endDate,
      timezone: dto.event.timezone,
      location: dto.event.location ?? null,
      coverUrl: dto.event.coverUrl ?? null,
      registrationStartAt: dto.registrationStartAt,
      registrationEndAt: dto.registrationEndAt,
      phase: normalizePhase(dto.phase),
    },
    races: dto.races.map((race) => ({
      race: {
        id: race.id,
        name: race.name,
        slug: race.slug,
        distanceKm: race.distanceKm,
        startTime: race.startTime,
        maxParticipants: race.capacity,
      },
      categories: race.categories.map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code,
        gender: category.gender,
        minAge: category.minAge,
        maxAge: category.maxAge,
      })),
      fee: race.fee,
    })),
    registrationOpen: dto.registrationOpen,
    maxParticipantsPerOrder: Math.max(1, dto.maxParticipantsPerOrder),
    identityNumberRequired: dto.identityNumberRequired,
    emergencyContactRequired: dto.emergencyContactRequired,
  }
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** Builds the `CreateOrderRequest` body from validated wizard values. */
export function toCreateOrderRequest(
  values: RegistrationValues
): Schemas["CreateOrderRequest"] {
  return {
    participants: values.participants.map((participant) => ({
      raceId: participant.raceId,
      categoryId: participant.categoryId || null,
      firstName: participant.firstName.trim(),
      lastName: participant.lastName.trim(),
      gender: participant.gender,
      birthDate: participant.birthDate,
      nationality: trimmedOrNull(participant.nationality),
      identityNumber: trimmedOrNull(participant.identityNumber),
      bibName: trimmedOrNull(participant.bibName),
      emergencyContactName: trimmedOrNull(participant.emergencyContactName),
      emergencyContactPhone: trimmedOrNull(participant.emergencyContactPhone),
    })),
    contact: {
      email: values.contact.email.trim(),
      phone: values.contact.phone.trim(),
    },
    consents: {
      terms: values.consents.terms,
      medical: values.consents.medical,
      privacy: values.consents.privacy,
      updates: values.consents.updates,
    },
  }
}
