"use client"

import { useParams } from "next/navigation"

import { WatermarkConfigPage } from "@/features/watermarks"

export default function NewWatermarkPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <WatermarkConfigPage eventId={eventId} />
}
