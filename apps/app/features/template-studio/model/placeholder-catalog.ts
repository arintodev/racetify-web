import type { PlaceholderKey } from "./template-document"

export type PlaceholderCategory = "identity" | "race" | "result"

export type PlaceholderMeta = {
  key: PlaceholderKey
  label: string
  description: string
  sample: string
  category: PlaceholderCategory
  maxLength: number
}

export const PLACEHOLDER_CATEGORY_LABELS: Record<PlaceholderCategory, string> = {
  identity: "Participant",
  race: "Race",
  result: "Result",
}

export const PLACEHOLDER_CATALOG: readonly PlaceholderMeta[] = [
  {
    key: "FULL_NAME",
    label: "Full name",
    description: "First and last name together.",
    sample: "Ayu Lestari",
    category: "identity",
    maxLength: 120,
  },
  {
    key: "FIRST_NAME",
    label: "First name",
    description: "Participant first name.",
    sample: "Ayu",
    category: "identity",
    maxLength: 80,
  },
  {
    key: "LAST_NAME",
    label: "Last name",
    description: "Participant last name.",
    sample: "Lestari",
    category: "identity",
    maxLength: 80,
  },
  {
    key: "BIB",
    label: "Bib number",
    description: "Assigned bib number, as entered.",
    sample: "1234",
    category: "identity",
    maxLength: 24,
  },
  {
    key: "GENDER",
    label: "Gender",
    description: "Participant gender.",
    sample: "Female",
    category: "identity",
    maxLength: 32,
  },
  {
    key: "COUNTRY",
    label: "Country",
    description: "Participant country or nationality.",
    sample: "Indonesia",
    category: "identity",
    maxLength: 80,
  },
  {
    key: "CATEGORY",
    label: "Category",
    description: "Race category name.",
    sample: "Women Open",
    category: "race",
    maxLength: 80,
  },
  {
    key: "DISTANCE",
    label: "Distance",
    description: "Race distance, for example 21.0975 km.",
    sample: "21.0975 km",
    category: "race",
    maxLength: 32,
  },
  {
    key: "FINISH_TIME",
    label: "Finish time",
    description: "Chip or gun time for the finish.",
    sample: "02:14:35",
    category: "result",
    maxLength: 32,
  },
  {
    key: "OVERALL_RANK",
    label: "Overall rank",
    description: "Rank across all participants.",
    sample: "128",
    category: "result",
    maxLength: 16,
  },
  {
    key: "GENDER_RANK",
    label: "Gender rank",
    description: "Rank within the participant gender.",
    sample: "12",
    category: "result",
    maxLength: 16,
  },
  {
    key: "CATEGORY_RANK",
    label: "Category rank",
    description: "Rank within the race category.",
    sample: "5",
    category: "result",
    maxLength: 16,
  },
] as const

const CATALOG_BY_KEY = new Map<string, PlaceholderMeta>(
  PLACEHOLDER_CATALOG.map((entry) => [entry.key, entry])
)

export function findPlaceholder(key: string): PlaceholderMeta | undefined {
  return CATALOG_BY_KEY.get(key)
}

export function isKnownPlaceholder(key: string): boolean {
  return CATALOG_BY_KEY.has(key)
}

export function placeholderSample(key: string): string {
  return CATALOG_BY_KEY.get(key)?.sample ?? ""
}

export function defaultExampleData(): Record<string, string> {
  return Object.fromEntries(
    PLACEHOLDER_CATALOG.map((entry) => [entry.key, entry.sample])
  )
}
