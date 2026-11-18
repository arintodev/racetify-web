"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ApiError,
  queryKeys,
  type Schemas,
} from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, RotateCcw, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { RequirePermission } from "@/lib/auth/require-permission"

import { useWatermarkAsset } from "../hooks/use-watermark-asset"
import type { GeometryConfig } from "../lib/geometry"
import {
  formValuesToCreate,
  formValuesToUpdate,
  watermarkToFormValues,
} from "../lib/mapping"
import { watermarkFormSchema } from "../lib/schema"
import { samplePhoto } from "../lib/sample-photos"
import {
  EMPTY_FORM_VALUES,
  percentToRatio,
  WATERMARK_DEFAULTS,
  type WatermarkFormValues,
} from "../lib/types"

import { ConfigPanel } from "./config-panel"
import { PreviewPanel } from "./preview-panel"

type Watermark = Schemas["WatermarkDto"]

export function WatermarkConfigPage({
  eventId,
  watermarkId,
}: {
  eventId: string
  watermarkId?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const listPath = `/events/${eventId}/gallery/watermarks`
  const isNew = !watermarkId

  const watermarksQuery = useQuery({
    queryKey: queryKeys.watermarks(eventId),
    queryFn: () =>
      getBrowserApi().request<Watermark[]>(
        `/v1/events/${eventId}/watermarks`
      ),
    enabled: !isNew,
  })

  const watermark = watermarkId
    ? ((watermarksQuery.data ?? []).find(
        (row) => row.id === watermarkId
      ) as Watermark | undefined) ?? null
    : null

  const form = useForm<WatermarkFormValues>({
    resolver: zodResolver(watermarkFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  })
  const values = form.watch()

  const assetState = useWatermarkAsset(watermark)
  const [orientation, setOrientation] = React.useState<
    "landscape" | "portrait"
  >("landscape")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [assetError, setAssetError] = React.useState<string | undefined>()
  const [previewError, setPreviewError] = React.useState(false)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const [fontsReady, setFontsReady] = React.useState(0)
  const loadedIdRef = React.useRef<string | null>(null)
  const refreshedRef = React.useRef(false)

  React.useEffect(() => {
    if (!watermark) return
    if (loadedIdRef.current === watermark.id) return
    loadedIdRef.current = watermark.id
    form.reset(watermarkToFormValues(watermark))
  }, [form, watermark])

  React.useEffect(() => {
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) setFontsReady((current) => current + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const assetUrl = assetState.asset?.url
  React.useEffect(() => {
    setPreviewError(false)
    refreshedRef.current = false
  }, [assetUrl])

  const photo = samplePhoto(orientation)
  const geometryConfig: GeometryConfig = {
    position: values.position,
    sizeRatio: percentToRatio(values.sizePercent),
    marginRatio: percentToRatio(values.marginPercent),
    rotation: values.rotation,
    repeat: values.repeat,
    spacingXRatio: percentToRatio(values.spacingXPercent),
    spacingYRatio: percentToRatio(values.spacingYPercent),
  }

  const emptyHint =
    values.type === "image"
      ? assetState.asset
        ? assetState.asset.width && assetState.asset.height
          ? undefined
          : "Measuring the watermark image…"
        : "Choose a watermark image to see the preview."
      : values.text.trim()
        ? undefined
        : "Enter watermark text to see the preview."

  const dirty = form.formState.isDirty || assetState.hasChanges

  function handleAssetError() {
    setPreviewError(true)
    if (!refreshedRef.current && watermark) {
      refreshedRef.current = true
      void watermarksQuery.refetch()
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const upload = await getBrowserApi().request<
      Schemas["WatermarkUploadDto"]
    >(`/v1/events/${eventId}/watermarks/uploads`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      body: file,
    })
    return upload.uploadId
  }

  async function onSubmit(next: WatermarkFormValues) {
    setSubmitError(null)
    if (next.type === "image" && !assetState.asset) {
      setAssetError("Choose a watermark image before saving.")
      return
    }
    setAssetError(undefined)

    try {
      const uploadId = assetState.pendingFile
        ? await uploadImage(assetState.pendingFile)
        : undefined

      if (isNew) {
        await getBrowserApi().request(`/v1/events/${eventId}/watermarks`, {
          method: "POST",
          body: formValuesToCreate(next, uploadId) satisfies Schemas["CreateWatermarkRequest"],
        })
      } else {
        await getBrowserApi().request(
          `/v1/events/${eventId}/watermarks/${watermarkId}`,
          {
            method: "PATCH",
            body: formValuesToUpdate(next, uploadId) satisfies Schemas["UpdateWatermarkRequest"],
          }
        )
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.watermarks(eventId),
      })
      toast.success(isNew ? "Watermark created" : "Watermark saved", {
        description: next.name.trim(),
      })
      router.push(listPath)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? (error.issues[0]?.message ??
            error.detail ??
            "Could not save the watermark.")
          : "Could not save the watermark. Try again."
      setSubmitError(message)
      toast.error("Could not save the watermark", { description: message })
    }
  }

  function cancel() {
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    router.push(listPath)
  }

  function resetConfiguration() {
    form.reset({
      ...values,
      ...WATERMARK_DEFAULTS,
    })
    setAssetError(undefined)
    setResetOpen(false)
  }

  if (!isNew && watermarksQuery.isPending) {
    return (
      <RequirePermission permission="event:watermarks:manage">
        <div className="flex flex-col gap-4">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </RequirePermission>
    )
  }

  if (!isNew && watermarksQuery.isError) {
    return (
      <RequirePermission permission="event:watermarks:manage">
        <Alert variant="destructive">
          <AlertTitle>Could not load the watermark</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            Check your connection and try again.
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void watermarksQuery.refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </RequirePermission>
    )
  }

  if (!isNew && !watermark) {
    return (
      <RequirePermission permission="event:watermarks:manage">
        <Alert variant="destructive">
          <AlertTitle>Watermark not found</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            This preset may have been deleted.
            <Button
              variant="outline"
              size="sm"
              render={<Link href={listPath} />}
              nativeButton={false}
            >
              Back to watermarks
            </Button>
          </AlertDescription>
        </Alert>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="event:watermarks:manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isNew ? "New watermark" : (watermark?.name ?? "Watermark")}
          description={
            isNew
              ? "Configure a watermark preset for this event's gallery."
              : "Tune the watermark and check it live before saving."
          }
        />

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not save the watermark</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <form
          noValidate
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <ConfigPanel
              form={form}
              eventId={eventId}
              isNew={isNew}
              asset={assetState.asset}
              assetError={assetError}
              assetReadError={assetState.readError}
              onChooseAsset={(file) => {
                setAssetError(undefined)
                void assetState.choose(file)
              }}
              onRemoveAsset={() => {
                assetState.remove()
                setAssetError(
                  "Choose a replacement image before saving."
                )
              }}
            />

            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw />
                Reset
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                disabled={form.formState.isSubmitting}
                onClick={cancel}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {form.formState.isSubmitting ? "Saving…" : "Save configuration"}
              </Button>
            </div>
          </div>

          <div className="min-w-0 lg:sticky lg:top-6">
            <PreviewPanel
              type={values.type}
              photo={photo}
              orientation={orientation}
              onOrientationChange={setOrientation}
              config={geometryConfig}
              opacityPercent={values.opacityPercent}
              asset={assetState.asset}
              text={{
                content: values.text,
                fontFamily: values.fontFamily,
                fontWeight: values.fontWeight,
                color: values.textColor,
              }}
              fontsReady={fontsReady}
              previewError={previewError}
              emptyHint={emptyHint}
              onAssetError={handleAssetError}
            />
          </div>
        </form>

        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Your watermark configuration has not been saved. Leaving now
                discards these changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={() => router.push(listPath)}
              >
                Discard
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                Size, margin, opacity, rotation, position, spacing, and
                typography return to their defaults. The name, scope, type,
                image, and text are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogCancel
                variant="destructive"
                onClick={resetConfiguration}
              >
                Reset configuration
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  )
}
