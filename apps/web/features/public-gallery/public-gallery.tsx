"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Images, Loader2, ScanFace, Search, X } from "lucide-react"

import { queryKeys, type Envelope, type Schemas } from "@workspace/api-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { getBrowserApi } from "@/lib/api/browser"

import { FaceSearchBanner } from "./face-search/face-search-banner"
import { useFaceMatchItems } from "./face-search/use-face-match-items"
import { GalleryGrid } from "./gallery-grid"
import { PhotoLightbox } from "./photo-lightbox"

const FaceSearchDialog = dynamic(
  () =>
    import("./face-search/face-search-dialog").then(
      (module) => module.FaceSearchDialog
    ),
  { ssr: false }
)

const PAGE_SIZE = 24

type GalleryItem = Schemas["PublicGalleryItemDto"]

export function PublicGallery({
  eventSlug,
  collections,
  initialPage,
  initialBib,
  initialCollection,
}: {
  eventSlug: string
  collections: Schemas["PublicGalleryCollectionDto"][]
  initialPage: Envelope<GalleryItem[]>
  initialBib: string
  initialCollection: string
}) {
  const pathname = usePathname()
  const [bibInput, setBibInput] = React.useState(initialBib)
  const [submittedBib, setSubmittedBib] = React.useState(initialBib.trim())
  const [collectionSlug, setCollectionSlug] = React.useState(initialCollection)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [faceDialogOpen, setFaceDialogOpen] = React.useState(false)
  const [faceResultIds, setFaceResultIds] = React.useState<string[] | null>(
    null
  )

  React.useEffect(() => {
    const params = new URLSearchParams()
    if (submittedBib) params.set("bib", submittedBib)
    if (collectionSlug) params.set("collection", collectionSlug)

    const search = params.toString()
    window.history.replaceState(
      null,
      "",
      search ? `${pathname}?${search}` : pathname
    )
  }, [collectionSlug, submittedBib, pathname])

  const isInitialQuery =
    submittedBib === initialBib.trim() && collectionSlug === initialCollection

  const query = useInfiniteQuery({
    queryKey: queryKeys.publicGalleryItems(eventSlug, {
      collection: collectionSlug || undefined,
      bib: submittedBib || undefined,
    }),
    queryFn: ({ pageParam }) =>
      getBrowserApi().requestEnvelope<GalleryItem[]>(
        `/v1/public/events/${eventSlug}/gallery/items`,
        {
          query: {
            limit: PAGE_SIZE,
            collection: collectionSlug || undefined,
            bib: submittedBib || undefined,
            cursor: pageParam,
          },
        }
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination?.hasMore
        ? (lastPage.meta.pagination.nextCursor ?? undefined)
        : undefined,
    initialData: isInitialQuery
      ? { pages: [initialPage], pageParams: [undefined] }
      : undefined,
  })

  const photos = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  )

  const faceMode = faceResultIds !== null
  const faceMatch = useFaceMatchItems(eventSlug, faceResultIds)
  const activePhotos = faceMode ? faceMatch.photos : photos
  const selectedPhoto =
    activePhotos.find((photo) => photo.id === selectedId) ?? null

  function clearFaceResults() {
    setFaceResultIds(null)
    setSelectedId(null)
  }

  function handleBibSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = bibInput.trim()
    clearFaceResults()

    if (next === submittedBib) {
      void query.refetch()
      return
    }
    setSubmittedBib(next)
  }

  function clearBib() {
    setBibInput("")
    setSubmittedBib("")
    clearFaceResults()
  }

  function clearFilters() {
    setBibInput("")
    setSubmittedBib("")
    setCollectionSlug("")
    clearFaceResults()
  }

  function selectCollection(slug: string) {
    setCollectionSlug(slug)
    clearFaceResults()
  }

  function handleFaceResults(itemIds: string[]) {
    setFaceResultIds(itemIds)
    setSelectedId(null)
    setFaceDialogOpen(false)
  }

  if (
    !faceMode &&
    !query.isPending &&
    photos.length === 0 &&
    !submittedBib &&
    !collectionSlug
  ) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
        <Images className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No public photos yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The organizer has not published any public collections for this event.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          role="search"
          onSubmit={handleBibSubmit}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={bibInput}
              onChange={(event) => setBibInput(event.target.value)}
              inputMode="numeric"
              enterKeyHint="search"
              placeholder="Search by bib number, e.g. 1042"
              className="pr-9 pl-8"
              aria-label="Search by bib number"
            />
            {bibInput ? (
              <button
                type="button"
                onClick={clearBib}
                aria-label="Clear bib search"
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setFaceDialogOpen(true)}
        >
          <ScanFace aria-hidden="true" />
          Find my photos
        </Button>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Button
          type="button"
          size="sm"
          variant={collectionSlug === "" ? "secondary" : "ghost"}
          aria-pressed={collectionSlug === ""}
          onClick={() => selectCollection("")}
        >
          All photos
        </Button>
        {collections.map((collection) => (
          <Button
            key={collection.id}
            type="button"
            size="sm"
            variant={collectionSlug === collection.slug ? "secondary" : "ghost"}
            aria-pressed={collectionSlug === collection.slug}
            onClick={() => selectCollection(collection.slug)}
          >
            {collection.name}
          </Button>
        ))}
      </div>

      {faceMode ? (
        <>
          <FaceSearchBanner
            count={faceMatch.photos.length}
            pending={faceMatch.pending}
            failedCount={faceMatch.failedCount}
            onSearchAgain={() => setFaceDialogOpen(true)}
            onShowAll={clearFaceResults}
            onRetryFailed={() => void faceMatch.retryFailed()}
          />

          {faceMatch.pending ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {Array.from(
                {
                  length: Math.min(Math.max(faceResultIds?.length ?? 0, 1), 6),
                },
                (_, index) => (
                  <Skeleton
                    key={index}
                    className="aspect-[3/2] w-full rounded-lg"
                  />
                )
              )}
            </div>
          ) : faceMatch.photos.length > 0 ? (
            <GalleryGrid photos={faceMatch.photos} onSelect={setSelectedId} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Images className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Could not load your matches</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Some photos may no longer be public. Try again or return to the
                full gallery.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void faceMatch.retryFailed()}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearFaceResults}
                >
                  Show all photos
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {query.isFetching && !query.isFetchingNextPage
              ? "Searching photos…"
              : `${photos.length} ${photos.length === 1 ? "photo" : "photos"} shown`}
          </p>

          {query.isError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Images className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Could not load photos</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => query.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {!query.isError && query.isPending ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading photos…
            </div>
          ) : null}

          {!query.isError && !query.isPending && photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Images className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No photos found</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {submittedBib
                  ? `No public photos match bib ${submittedBib}.`
                  : "No public photos match the current filters."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <>
              <GalleryGrid photos={photos} onSelect={setSelectedId} />
              {query.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => query.fetchNextPage()}
                    disabled={query.isFetchingNextPage}
                  >
                    {query.isFetchingNextPage ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <PhotoLightbox
        eventSlug={eventSlug}
        photo={selectedPhoto}
        photos={activePhotos}
        onNavigate={setSelectedId}
        onClose={() => setSelectedId(null)}
      />

      {faceDialogOpen ? (
        <FaceSearchDialog
          eventSlug={eventSlug}
          onClose={() => setFaceDialogOpen(false)}
          onResults={handleFaceResults}
        />
      ) : null}
    </div>
  )
}
