import {
  PLACEHOLDER_CATALOG,
  findPlaceholder,
  placeholderSample,
} from "./placeholder-catalog"
import type { TemplateDocument, TextObject } from "./template-document"

/** Tokens are uppercase keys wrapped in single braces, for example `{FULL_NAME}`. */
export const TOKEN_PATTERN = /\{([A-Z][A-Z0-9_]*)\}/g

export type PlaceholderSegment =
  | { type: "text"; value: string }
  | { type: "token"; raw: string; key: string; known: boolean }

export type PlaceholderIssue = {
  objectId: string | null
  objectName: string | null
  key: string
  message: string
}

export function parsePlaceholderText(text: string): PlaceholderSegment[] {
  const segments: PlaceholderSegment[] = []
  const pattern = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags)
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0]
    const key = match[1] ?? ""
    if (match.index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, match.index) })
    }
    segments.push({ type: "token", raw, key, known: findPlaceholder(key) != null })
    cursor = match.index + raw.length
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) })
  }

  return segments
}

export function extractPlaceholderKeys(text: string): string[] {
  const keys: string[] = []
  for (const segment of parsePlaceholderText(text)) {
    if (segment.type === "token" && !keys.includes(segment.key)) {
      keys.push(segment.key)
    }
  }
  return keys
}

export function findUnknownPlaceholderKeys(text: string): string[] {
  return extractPlaceholderKeys(text).filter((key) => findPlaceholder(key) == null)
}

export function hasPlaceholderTokens(text: string): boolean {
  return parsePlaceholderText(text).some((segment) => segment.type === "token")
}

/**
 * Substitutes known tokens in one pass. Replacement values are never rescanned, so example data
 * containing another token cannot inject a second substitution.
 */
export function substitutePlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(TOKEN_PATTERN, (raw, key: string) => {
    const value = values[key] ?? placeholderSample(key)
    if (value === "") return raw
    return findPlaceholder(key) == null ? raw : value
  })
}

export function validatePlaceholderText(
  text: string,
  objectId: string | null = null,
  objectName: string | null = null
): PlaceholderIssue[] {
  const issues: PlaceholderIssue[] = []

  for (const key of extractPlaceholderKeys(text)) {
    const meta = findPlaceholder(key)
    if (!meta) {
      issues.push({
        objectId,
        objectName,
        key,
        message: `Unknown placeholder {${key}}.`,
      })
    }
  }

  return issues
}

export function validateTemplatePlaceholders(
  document: TemplateDocument
): PlaceholderIssue[] {
  const issues: PlaceholderIssue[] = []

  for (const object of document.objects) {
    if (object.type !== "text") continue
    issues.push(
      ...validatePlaceholderText(object.text, object.id, object.name)
    )
  }

  return issues
}

/** Known token keys used by text objects, in first-seen order. */
export function declaredPlaceholderKeys(document: TemplateDocument): string[] {
  const keys: string[] = []
  for (const object of document.objects) {
    if (object.type !== "text") continue
    for (const key of extractPlaceholderKeys(object.text)) {
      if (findPlaceholder(key) && !keys.includes(key)) {
        keys.push(key)
      }
    }
  }
  return keys
}

export function textObjectsWithTokens(document: TemplateDocument): TextObject[] {
  return document.objects.filter(
    (object): object is TextObject =>
      object.type === "text" && hasPlaceholderTokens(object.text)
  )
}

/** Catalog order, used by the data panel and exports. */
export function catalogKeys(): string[] {
  return PLACEHOLDER_CATALOG.map((entry) => entry.key)
}
