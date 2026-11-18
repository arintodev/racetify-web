import { DEFAULT_TEMPLATE_FILE_NAME, MAX_JSON_BYTES } from "../lib/constants"
import { downloadJson, safeFileBaseName } from "../lib/download"
import { readFileAsText } from "../lib/file-read"
import { createId } from "../lib/id"
import {
  TemplateDocumentSchema,
  type TemplateDocument,
} from "../model/template-document"

export class TemplateValidationError extends Error {
  readonly issues: string[]

  constructor(message: string, issues: string[] = []) {
    super(message)
    this.name = "TemplateValidationError"
    this.issues = issues
  }
}

export function templateFileName(document: TemplateDocument): string {
  return `${safeFileBaseName(document.name) || DEFAULT_TEMPLATE_FILE_NAME}.racetify-template.json`
}

export function downloadTemplateDocument(document: TemplateDocument): void {
  downloadJson(document, templateFileName(document))
}

/**
 * Reads a native template file, validates it against the current schema, and assigns a fresh
 * document identity so importing the same file twice creates two drafts instead of overwriting one.
 */
export async function readTemplateFile(file: File): Promise<TemplateDocument> {
  if (file.size > MAX_JSON_BYTES) {
    throw new TemplateValidationError(
      "The template file is larger than 50 MB."
    )
  }

  const text = await readFileAsText(file)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new TemplateValidationError("The file is not valid JSON.")
  }

  const result = TemplateDocumentSchema.safeParse(parsed)
  if (!result.success) {
    throw new TemplateValidationError(
      "The file is not a supported Racetify template.",
      result.error.issues.slice(0, 8).map((issue) => {
        const path = issue.path.join(".")
        return path ? `${path}: ${issue.message}` : issue.message
      })
    )
  }

  const now = new Date().toISOString()
  return {
    ...result.data,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  }
}
