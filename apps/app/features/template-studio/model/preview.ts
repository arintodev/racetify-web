import {
  hasPlaceholderTokens,
  substitutePlaceholders,
} from "./placeholder-engine"
import type { TemplateDocument } from "./template-document"

/**
 * Builds preview text per object without touching the document, so unknown tokens and example data
 * remain intact and the preview cannot leak back into the saved draft.
 */
export function previewOverrides(
  document: TemplateDocument
): Map<string, string> {
  const overrides = new Map<string, string>()

  for (const object of document.objects) {
    if (object.type !== "text") continue
    if (!hasPlaceholderTokens(object.text)) continue
    overrides.set(
      object.id,
      substitutePlaceholders(object.text, document.exampleData)
    )
  }

  return overrides
}
