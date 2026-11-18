"use client"

import { useParams } from "next/navigation"

import { RequirePermission } from "@/lib/auth/require-permission"

import { GalleryUploadWorkspace } from "@/features/gallery/upload"

export default function GalleryUploadPage() {
  const { eventId } = useParams<{ eventId: string }>()

  return (
    <RequirePermission permission="event:gallery:upload">
      <GalleryUploadWorkspace eventId={eventId} />
    </RequirePermission>
  )
}
