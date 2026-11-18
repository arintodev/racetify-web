export type RegistrationStep = "races" | "participants" | "checkout" | "payment"

export type RegistrationPhase = "upcoming" | "open" | "closed"

/** The subset of a public race the registration wizard renders. */
export type RegistrationRace = {
  id: string
  name: string
  slug: string
  distanceKm: number
  startTime: string
  maxParticipants: number
}

export type RegistrationCategory = {
  id: string
  name: string
  code: string
  gender: string
  minAge: number
  maxAge: number
}

export type PublicRaceConfig = {
  race: RegistrationRace
  categories: RegistrationCategory[]
  fee: number
}

export type RegistrationEvent = {
  slug: string
  name: string
  startDate: string
  endDate: string
  timezone: string
  location: string | null
  coverUrl: string | null
  registrationStartAt: string
  registrationEndAt: string
  phase: RegistrationPhase
}

/** Normalized shape of `PublicRegistrationConfigDto` used by the wizard. */
export type PublicRegistrationConfig = {
  event: RegistrationEvent
  races: PublicRaceConfig[]
  registrationOpen: boolean
  maxParticipantsPerOrder: number
  identityNumberRequired: boolean
  emergencyContactRequired: boolean
}

export type ParticipantValues = {
  raceId: string
  firstName: string
  lastName: string
  gender: "" | "male" | "female"
  birthDate: string
  nationality: string
  categoryId: string
  identityNumber: string
  bibName: string
  emergencyContactName: string
  emergencyContactPhone: string
}

export type ContactValues = {
  email: string
  phone: string
}

export type ConsentValues = {
  terms: boolean
  medical: boolean
  privacy: boolean
  updates: boolean
}

export type RegistrationValues = {
  participants: ParticipantValues[]
  contact: ContactValues
  consents: ConsentValues
}

export type OrderLine = {
  participantNumber: number
  name: string
  raceName: string
  categoryName: string
  fee: number
}

export type RegistrationWizardProps = {
  config: PublicRegistrationConfig
  eventSlug: string
  initialRaceId?: string
  initialCategoryId?: string
}
