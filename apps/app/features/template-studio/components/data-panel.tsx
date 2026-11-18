"use client"

import { AlertTriangle, Plus, Replace, RotateCcw } from "lucide-react"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"

import { useEngineRef } from "../engine/engine-context"
import {
  PLACEHOLDER_CATALOG,
  PLACEHOLDER_CATEGORY_LABELS,
  type PlaceholderCategory,
} from "../model/placeholder-catalog"
import { useEditorStore } from "../store/editor-store-context"
import { placeholderIssues, selectedTextObject } from "../store/selectors"

const CATEGORY_ORDER: PlaceholderCategory[] = ["identity", "race", "result"]

export function DataPanel() {
  const document = useEditorStore((state) => state.document)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const preview = useEditorStore((state) => state.preview)
  const setPreview = useEditorStore((state) => state.setPreview)
  const insertToken = useEditorStore((state) => state.insertToken)
  const replaceTextWithToken = useEditorStore(
    (state) => state.replaceTextWithToken
  )
  const setExampleValue = useEditorStore((state) => state.setExampleValue)
  const resetExampleData = useEditorStore((state) => state.resetExampleData)
  const setSelection = useEditorStore((state) => state.setSelection)
  const engineRef = useEngineRef()

  const textObject = selectedTextObject(document, selectedIds)
  const issues = React.useMemo(
    () => placeholderIssues(document),
    [document]
  )

  function insert(raw: string): void {
    if (!textObject) return
    const insertedAtCursor = engineRef.current?.insertTextAtCursor(raw)
    if (!insertedAtCursor) {
      insertToken(textObject.id, raw, null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button
          variant={preview ? "default" : "outline"}
          className="w-full justify-start"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Exit sample preview" : "Preview with sample data"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {textObject
            ? `Editing “${textObject.name}”. Insert a placeholder at the caret or append it.`
            : "Select a text layer to insert a placeholder."}
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        {CATEGORY_ORDER.map((category) => {
          const entries = PLACEHOLDER_CATALOG.filter(
            (entry) => entry.category === category
          )
          return (
            <section key={category} className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {PLACEHOLDER_CATEGORY_LABELS[category]}
              </h3>
              {entries.map((entry) => {
                const token = `{${entry.key}}`
                return (
                  <div
                    key={entry.key}
                    className="rounded-md border px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {entry.label}
                        </p>
                        <code className="text-[11px] text-muted-foreground">
                          {token}
                        </code>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Insert ${entry.label}`}
                          disabled={!textObject}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => insert(token)}
                        >
                          <Plus />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Replace text with ${entry.label}`}
                          disabled={!textObject}
                          onClick={() =>
                            textObject &&
                            replaceTextWithToken(textObject.id, token)
                          }
                        >
                          <Replace />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>

      <Separator />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Example values
          </h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={resetExampleData}
          >
            <RotateCcw />
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Used only for previews. They are never written into the design or the
          compiled output.
        </p>
        {PLACEHOLDER_CATALOG.map((entry) => (
          <label key={entry.key} className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {entry.label}
              <code className="text-[10px]">{`{${entry.key}}`}</code>
            </span>
            <Input
              value={document.exampleData[entry.key] ?? ""}
              maxLength={200}
              className="h-8 text-xs"
              placeholder={entry.sample}
              onChange={(event) =>
                setExampleValue(entry.key, event.target.value)
              }
            />
          </label>
        ))}
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Validation
          </h3>
          {issues.length > 0 ? (
            <Badge variant="destructive">{issues.length}</Badge>
          ) : null}
        </div>
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            All placeholders in this template are recognised.
          </p>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Unknown placeholders</AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {issues.map((issue) => (
                  <li key={`${issue.objectId}-${issue.key}`}>
                    <button
                      type="button"
                      className="text-left underline-offset-2 hover:underline"
                      onClick={() =>
                        issue.objectId && setSelection([issue.objectId])
                      }
                    >
                      {issue.objectName ?? "Text"}: {`{${issue.key}}`}
                    </button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  )
}
