"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

import { createTemplateDocument } from "../model/template-defaults"
import { getTemplateRepository } from "../repository"

const formSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a template name.")
      .max(120, "Use 120 characters or fewer."),
    scope: z.enum(["bib", "certificate"]),
    preset: z.enum(["a5", "a4", "a3", "custom"]),
    orientation: z.enum(["portrait", "landscape"]),
    unit: z.enum(["mm", "px"]),
    customWidth: z.string().optional(),
    customHeight: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.preset !== "custom") return
    const width = Number(value.customWidth)
    const height = Number(value.customHeight)
    if (!Number.isFinite(width) || width <= 0) {
      context.addIssue({
        code: "custom",
        path: ["customWidth"],
        message: "Enter a width.",
      })
    }
    if (!Number.isFinite(height) || height <= 0) {
      context.addIssue({
        code: "custom",
        path: ["customHeight"],
        message: "Enter a height.",
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

const PRESET_ITEMS = [
  { value: "a5", label: "A5" },
  { value: "a4", label: "A4" },
  { value: "a3", label: "A3" },
  { value: "custom", label: "Custom" },
]

const SCOPE_ITEMS = [
  { value: "bib", label: "Participant bib" },
  { value: "certificate", label: "Certificate" },
]

export function NewTemplateDialog({
  eventId,
  open,
  onOpenChange,
  onCreated,
  defaultScope = "certificate",
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  defaultScope?: FormValues["scope"]
}) {
  const router = useRouter()
  const { repository } = getTemplateRepository()
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      scope: defaultScope,
      preset: "a4",
      orientation: "portrait",
      unit: "mm",
      customWidth: "210",
      customHeight: "297",
    },
  })

  const preset = form.watch("preset")
  const unit = form.watch("unit")

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null)
    setSubmitting(true)
    try {
      const customWidth =
        values.preset === "custom" ? Number(values.customWidth) : undefined
      const customHeight =
        values.preset === "custom" ? Number(values.customHeight) : undefined

      const document = createTemplateDocument({
        name: values.name,
        scope: values.scope,
        eventId,
        preset: values.preset,
        orientation: values.orientation,
        unit: values.unit,
        customWidth,
        customHeight,
      })

      await repository.create(eventId, document)
      toast.success("Draft created")
      form.reset()
      onCreated?.()
      onOpenChange(false)
      router.push(`/events/${eventId}/template-studio/${document.id}`)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not create the draft."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Choose the document size and what the template is for. You can
            change the canvas size later.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={form.formState.errors.name ? true : undefined}>
              <FieldLabel htmlFor="template-name">Name</FieldLabel>
              <Input
                id="template-name"
                maxLength={120}
                placeholder="Finisher certificate"
                aria-invalid={form.formState.errors.name ? true : undefined}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="template-scope">Used for</FieldLabel>
                <Select
                  items={SCOPE_ITEMS}
                  value={form.watch("scope")}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      form.setValue("scope", value as FormValues["scope"], {
                        shouldValidate: true,
                      })
                    }
                  }}
                >
                  <SelectTrigger id="template-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="template-preset">Size</FieldLabel>
                <Select
                  items={PRESET_ITEMS}
                  value={preset}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      form.setValue("preset", value as FormValues["preset"], {
                        shouldValidate: true,
                      })
                    }
                  }}
                >
                  <SelectTrigger id="template-preset" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {preset !== "custom" ? (
                <Field>
                  <FieldLabel>Orientation</FieldLabel>
                  <ToggleGroup
                    size="sm"
                    value={[form.watch("orientation")]}
                    onValueChange={(value) => {
                      const next = value[0]
                      if (next === "portrait" || next === "landscape") {
                        form.setValue("orientation", next)
                      }
                    }}
                  >
                    <ToggleGroupItem value="portrait">Portrait</ToggleGroupItem>
                    <ToggleGroupItem value="landscape">Landscape</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              ) : null}

              <Field>
                <FieldLabel>Unit</FieldLabel>
                <ToggleGroup
                  size="sm"
                  value={[unit]}
                  onValueChange={(value) => {
                    const next = value[0]
                    if (next === "mm" || next === "px") {
                      form.setValue("unit", next)
                    }
                  }}
                >
                  <ToggleGroupItem value="mm">mm</ToggleGroupItem>
                  <ToggleGroupItem value="px">px</ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </div>

            {preset === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={form.formState.errors.customWidth ? true : undefined}>
                  <FieldLabel htmlFor="custom-width">
                    Width ({unit})
                  </FieldLabel>
                  <Input
                    id="custom-width"
                    type="number"
                    min={1}
                    {...form.register("customWidth")}
                  />
                  <FieldError errors={[form.formState.errors.customWidth]} />
                </Field>
                <Field data-invalid={form.formState.errors.customHeight ? true : undefined}>
                  <FieldLabel htmlFor="custom-height">
                    Height ({unit})
                  </FieldLabel>
                  <Input
                    id="custom-height"
                    type="number"
                    min={1}
                    {...form.register("customHeight")}
                  />
                  <FieldError errors={[form.formState.errors.customHeight]} />
                </Field>
              </div>
            ) : (
              <FieldDescription>
                Preset sizes are defined in millimetres. The editor renders them
                at 96 DPI.
              </FieldDescription>
            )}
          </FieldGroup>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              {submitting ? "Creating…" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
