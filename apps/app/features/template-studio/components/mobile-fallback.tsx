"use client"

import { Download, Monitor } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { EmptyState } from "@/components/empty-state"

import { downloadTemplateDocument } from "../repository/json-transfer"
import { useEditorStore } from "../store/editor-store-context"

export function MobileFallback({ eventId }: { eventId: string }) {
  const document = useEditorStore((state) => state.document)

  return (
    <div className="p-4">
      <EmptyState
        icon={Monitor}
        title="Template Studio needs a larger screen"
        description="Editing a print canvas needs room for layers and the inspector. Open this draft on a tablet or desktop, or export the native template file here."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/events/${eventId}/template-studio`} />}
            >
              Back to templates
            </Button>
            <Button onClick={() => downloadTemplateDocument(document)}>
              <Download />
              Export JSON
            </Button>
          </div>
        }
      />
    </div>
  )
}
