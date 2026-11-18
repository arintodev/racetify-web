"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { getBrowserApi } from "@/lib/api/browser"

import { SYSTEM_FONT_FAMILIES } from "../lib/constants"
import { useEditorStore } from "../store/editor-store-context"

import { FontUploadDialog } from "./font-upload-dialog"

export function FontPicker({
  eventId,
  value,
  onChange,
}: {
  eventId: string
  value: string
  onChange: (family: string) => void
}) {
  const customFonts = useEditorStore((state) => state.document.fonts)
  const [uploadOpen, setUploadOpen] = React.useState(false)

  const eventFonts = useQuery({
    queryKey: queryKeys.eventFonts(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["FontDto"][]>(
        `/v1/events/${eventId}/fonts`
      ),
    staleTime: 60_000,
    retry: false,
  })

  const families = React.useMemo(() => {
    const names = new Set<string>([
      ...SYSTEM_FONT_FAMILIES,
      ...(eventFonts.data ?? []).map((font) => font.family),
      ...customFonts.map((font) => font.family),
    ])
    if (value) names.add(value)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [customFonts, eventFonts.data, value])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Font</span>
      <Select
        items={families.map((family) => ({ value: family, label: family }))}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a font" />
        </SelectTrigger>
        <SelectContent>
          {families.map((family) => (
            <SelectItem key={family} value={family}>
              {family}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => setUploadOpen(true)}
      >
        <Upload />
        Upload font
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Event fonts are shown by family name. If this device cannot load one,
        text falls back to a system font.
      </p>
      <FontUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(family) => onChange(family)}
      />
    </div>
  )
}
