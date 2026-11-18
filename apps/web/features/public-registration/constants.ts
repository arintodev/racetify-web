import type { RegistrationStep } from "./types"

export const STEP_ORDER: RegistrationStep[] = [
  "races",
  "participants",
  "checkout",
  "payment",
]

export const STEP_LABELS: Record<RegistrationStep, string> = {
  races: "Races",
  participants: "Participants",
  checkout: "Checkout",
  payment: "Payment",
}

export const STEP_TITLES: Record<RegistrationStep, string> = {
  races: "Choose your races",
  participants: "Participant details",
  checkout: "Checkout",
  payment: "Payment",
}

export const STEP_DESCRIPTIONS: Record<RegistrationStep, string> = {
  races: "Add a race for each participant. You'll fill in their details next.",
  participants:
    "Add each participant's details. You can edit them before checkout.",
  checkout:
    "Review your order and add the contact details for this registration.",
  payment:
    "Review your order and continue to secure payment.",
}

export const DEFAULT_NATIONALITY = "Indonesian"

/**
 * A short, common list. "Other" lets a participant enter any
 * nationality without forcing a full country picker.
 */
export const NATIONALITIES = [
  "Indonesian",
  "Malaysian",
  "Singaporean",
  "Australian",
  "Japanese",
  "South Korean",
  "Chinese",
  "Indian",
  "Filipino",
  "Thai",
  "Vietnamese",
  "British",
  "American",
  "Canadian",
  "Dutch",
  "German",
  "French",
  "Spanish",
  "Italian",
  "New Zealander",
  "Brazilian",
  "South African",
  "Saudi",
  "Emirati",
  "Other",
] as const

export const CONSENT_STATEMENTS = [
  {
    name: "terms",
    label: "I agree to the race rules and terms.",
    description: "The organizer's terms and race rules apply to every participant.",
  },
  {
    name: "medical",
    label: "I confirm every participant is medically fit to take part.",
    description:
      "The organizer may ask for a medical certificate for long-distance races.",
  },
  {
    name: "privacy",
    label: "I agree to the privacy policy and data processing.",
    description: "Participant details are shared with the organizer for this event.",
  },
] as const
