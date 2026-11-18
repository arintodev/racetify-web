"use client"

import * as React from "react"
import type { FieldArrayWithId } from "react-hook-form"
import { Plus, Users } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import type { PublicRegistrationConfig } from "./types"

import { formatCurrency, formatDistance } from "@/lib/format"

import { ParticipantCard } from "./participant-card"
import type { RegistrationValues } from "./types"

export function ParticipantStep({
  config,
  fields,
  expandedIndex,
  onExpand,
  onSave,
  onRemove,
  onAddParticipant,
  onBackToRaces,
}: {
  config: PublicRegistrationConfig
  fields: FieldArrayWithId<RegistrationValues, "participants", "id">[]
  expandedIndex: number | null
  onExpand: (index: number) => void
  onSave: (index: number) => void
  onRemove: (index: number) => void
  onAddParticipant: (raceId: string) => void
  onBackToRaces: () => void
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const maxReached = fields.length >= config.maxParticipantsPerOrder
  const single = config.maxParticipantsPerOrder === 1
  const onlyRace = config.races.length === 1 ? config.races[0] : undefined

  function handleAdd(raceId: string) {
    onAddParticipant(raceId)
    setAddOpen(false)
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
        <Users className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No participants yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Choose a race first, then add each participant's details.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onBackToRaces}
        >
          Choose a race
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {fields.length} of {config.maxParticipantsPerOrder}{" "}
        {config.maxParticipantsPerOrder === 1 ? "participant" : "participants"}{" "}
        used
      </p>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <ParticipantCard
            key={field.id}
            fieldId={field.id}
            index={index}
            config={config}
            isExpanded={expandedIndex === index}
            isLast={index === fields.length - 1}
            onExpand={() => onExpand(index)}
            onSave={() => onSave(index)}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>

      {!single ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full border-dashed py-4"
            onClick={() => {
              if (onlyRace) {
                onAddParticipant(onlyRace.race.id)
                return
              }
              setAddOpen(true)
            }}
            disabled={maxReached}
          >
            <Plus />
            Add another participant ({fields.length} of{" "}
            {config.maxParticipantsPerOrder} used)
          </Button>

          {maxReached ? (
            <p className="text-center text-xs text-muted-foreground">
              You've reached the maximum number of participants for this order.
            </p>
          ) : null}
        </>
      ) : null}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85svh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Add another participant</SheetTitle>
            <SheetDescription>
              Choose the race for participant {fields.length + 1}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4">
            {config.races.map((raceConfig) => (
              <div
                key={raceConfig.race.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {raceConfig.race.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(raceConfig.race.distanceKm)} ·{" "}
                    {formatCurrency(raceConfig.fee)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-11 shrink-0 sm:h-9"
                  onClick={() => handleAdd(raceConfig.race.id)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
