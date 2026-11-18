"use client"

import type { Schemas } from "@workspace/api-client"
import { Check, Folder, Globe, Lock } from "lucide-react"
import type { ReactNode } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "cn"

import { formatNumber } from "@/lib/format"

type UploadDestinationPickerProps = {
  collections: Schemas["GalleryCollectionDto"][] | undefined
  loading: boolean
  failed: boolean
  value: string | null
  onChange: (collectionId: string | null) => void
  onRetry: () => void
}

/** Destination collection cards; the selected collection is snapshotted by each batch. */
export function UploadDestinationPicker({
  collections,
  loading,
  failed,
  value,
  onChange,
  onRetry,
}: UploadDestinationPickerProps) {
  const options = collections ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection</CardTitle>
        <CardDescription>
          New uploads go to this collection. Changes apply to the next batch;
          photos already uploading keep theirs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset>
          <legend className="sr-only">Destination collection</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DestinationCard
              name="No collection"
              description="Uncategorized"
              checked={value === null}
              onSelect={() => onChange(null)}
            >
              <Badge variant="outline">Photos stay unfiled</Badge>
            </DestinationCard>

            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-[92px] rounded-xl" />
                ))
              : options.map((collection) => (
                  <DestinationCard
                    key={collection.id}
                    name={collection.name}
                    checked={value === collection.id}
                    onSelect={() => onChange(collection.id)}
                  >
                    <Badge variant="outline">
                      {collection.isPublic ? <Globe /> : <Lock />}
                      {collection.isPublic ? "Public" : "Private"}
                    </Badge>
                    <Badge variant="outline">
                      {formatNumber(collection.itemCount)} photos
                    </Badge>
                  </DestinationCard>
                ))}
          </div>
        </fieldset>

        {failed ? (
          <Alert>
            <Folder aria-hidden="true" />
            <AlertTitle>Collections couldn&apos;t be loaded</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Photos will upload without a collection until this loads.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!loading && !failed && options.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No collections yet. Photos will upload without a collection.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DestinationCard({
  name,
  description,
  checked,
  onSelect,
  children,
}: {
  name: string
  description?: string
  checked: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "bg-card hover:border-primary/50"
      )}
    >
      <input
        type="radio"
        name="gallery-upload-destination"
        className="sr-only"
        checked={checked}
        onChange={onSelect}
      />
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        {checked ? (
          <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">{children}</div>
    </label>
  )
}
