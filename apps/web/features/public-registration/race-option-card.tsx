"use client"

import { Check, Minus, Plus } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import type { PublicRaceConfig } from "./types"

import {
  formatCount,
  formatCurrency,
  formatDistance,
  formatRaceStart,
} from "@/lib/format"

export function RaceOptionCard({
  raceConfig,
  count,
  single,
  maxReached,
  timeZone,
  onAdd,
  onRemove,
}: {
  raceConfig: PublicRaceConfig
  count: number
  single: boolean
  maxReached: boolean
  timeZone: string
  onAdd: () => void
  onRemove: () => void
}) {
  const { race, categories, fee } = raceConfig
  const addDisabled = maxReached && count === 0

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{race.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDistance(race.distanceKm)} ·{" "}
              {formatRaceStart(race.startTime, timeZone)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"} · Capacity{" "}
              {formatCount(race.maxParticipants)}
            </p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums">
            {formatCurrency(fee)}
          </p>
        </div>

        <div className="border-t border-dashed" />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {single ? "Participant entry" : "Participants in this race"}
          </p>

          {single ? (
            count === 0 ? (
              <Button
                type="button"
                className="h-11 sm:h-9"
                aria-label={`Choose ${race.name}`}
                onClick={onAdd}
                disabled={addDisabled}
              >
                Choose race
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Badge variant="secondary">
                  <Check />
                  Selected
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove the participant from ${race.name}`}
                  onClick={onRemove}
                >
                  Remove
                </Button>
              </div>
            )
          ) : (
            <div
              role="group"
              aria-label={`Participants in ${race.name}`}
              className="flex items-center gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label={`Remove a participant from ${race.name}`}
                onClick={onRemove}
                disabled={count === 0}
              >
                <Minus />
              </Button>
              <output
                aria-live="polite"
                className="w-6 text-center text-base font-medium tabular-nums"
              >
                {count}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label={`Add a participant to ${race.name}`}
                onClick={onAdd}
                disabled={maxReached}
              >
                <Plus />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
