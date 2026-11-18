"use client"

import { useParams } from "next/navigation"

import { WatermarkConfigPage } from "@/features/watermarks"

export default function EditWatermarkPage() {
  const { eventId, watermarkId } = useParams<{
    eventId: string
    watermarkId: string
  }>()
  return <WatermarkConfigPage eventId={eventId} watermarkId={watermarkId} />
}
