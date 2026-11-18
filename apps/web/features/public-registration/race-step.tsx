"use client"

import { Flag } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"

import type { PublicRegistrationConfig } from "./types"

import { RaceOptionCard } from "./race-option-card"

export function RaceStep({
  config,
  counts,
  onAdd,
  onRemove,
}: {
  config: PublicRegistrationConfig
  counts: Record<string, number>
  onAdd: (raceId: string) => void
  onRemove: (raceId: string) => void
}) {
  const single = config.maxParticipantsPerOrder === 1
  const totalParticipants = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  )
  const maxReached = totalParticipants >= config.maxParticipantsPerOrder

  if (config.races.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
        <Flag className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No races are open for registration</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Check back later or contact the organizer for the next registration
          window.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {config.races.map((raceConfig) => (
          <RaceOptionCard
            key={raceConfig.race.id}
            raceConfig={raceConfig}
            count={counts[raceConfig.race.id] ?? 0}
            single={single}
            maxReached={maxReached}
            timeZone={config.event.timezone}
            onAdd={() => onAdd(raceConfig.race.id)}
            onRemove={() => onRemove(raceConfig.race.id)}
          />
        ))}
      </div>

      {maxReached ? (
        <Alert>
          <AlertTitle>Maximum reached</AlertTitle>
          <AlertDescription>
            You've added {config.maxParticipantsPerOrder}{" "}
            {config.maxParticipantsPerOrder === 1
              ? "participant"
              : "participants"}
            . Continue to participant details, or remove a participant to change
            your selection.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
