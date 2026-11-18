"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import type { WatermarkAsset } from "../hooks/use-watermark-asset"
import {
  longEdge,
  PREVIEW_CANVAS_SIZE,
  resolveLayout,
  type GeometryConfig,
} from "../lib/geometry"
import { computeWatermarkMetrics } from "../lib/metrics"
import type { SamplePhoto } from "../lib/sample-photos"
import { TEXT_LINE_HEIGHT } from "../lib/text-layout"
import type { WatermarkType } from "../lib/types"

export function PreviewStage({
  type,
  photo,
  config,
  opacityRatio,
  asset,
  text,
  fontsReady,
  emptyHint,
  onAssetError,
  className,
}: {
  type: WatermarkType
  photo: SamplePhoto
  config: GeometryConfig
  opacityRatio: number
  asset: WatermarkAsset | null
  text: {
    content: string
    fontFamily: string
    fontWeight: number
    color: string
  }
  fontsReady: number
  emptyHint?: string
  onAssetError?: () => void
  className?: string
}) {
  const [imageFailed, setImageFailed] = React.useState(false)

  React.useEffect(() => {
    setImageFailed(false)
  }, [asset?.url])

  const metrics = React.useMemo(
    () =>
      computeWatermarkMetrics({
        type,
        photo,
        sizeRatio: config.sizeRatio,
        marginRatio: config.marginRatio,
        asset,
        text,
      }),
    // `fontsReady` re-measures once webfonts finish loading.
    [
      type,
      asset?.url,
      asset?.width,
      asset?.height,
      text.content,
      text.fontFamily,
      text.fontWeight,
      config.sizeRatio,
      config.marginRatio,
      photo,
      fontsReady,
    ]
  )

  const layout = React.useMemo(
    () =>
      metrics
        ? resolveLayout(photo, PREVIEW_CANVAS_SIZE, metrics.size, config)
        : null,
    [photo, metrics, config]
  )

  return (
    <div
      className={cn(
        "@container relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-xl border bg-zinc-950",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={`${photo.label} sample photo`}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />

      {layout && metrics ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${(layout.photo.x / layout.canvas) * 100}%`,
            top: `${(layout.photo.y / layout.canvas) * 100}%`,
            width: `${(layout.photo.width / layout.canvas) * 100}%`,
            height: `${(layout.photo.height / layout.canvas) * 100}%`,
          }}
        >
          {layout.placements.map((placement, index) => {
            const left =
              ((placement.x + placement.width / 2 - layout.photo.x) /
                layout.photo.width) *
              100
            const top =
              ((placement.y + placement.height / 2 - layout.photo.y) /
                layout.photo.height) *
              100

            if (type === "image" && asset?.url && !imageFailed) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={asset.url}
                  alt=""
                  draggable={false}
                  className="absolute object-contain"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${(placement.width / layout.photo.width) * 100}%`,
                    height: `${(placement.height / layout.photo.height) * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                    opacity: opacityRatio,
                  }}
                  onError={() => {
                    setImageFailed(true)
                    onAssetError?.()
                  }}
                />
              )
            }

            if (type === "text" && metrics.fontSize) {
              const fontSize =
                (metrics.fontSize / longEdge(photo)) * 100
              return (
                <span
                  key={index}
                  className="absolute whitespace-nowrap select-none"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                    fontSize: `${fontSize}cqw`,
                    lineHeight: TEXT_LINE_HEIGHT,
                    fontFamily: `"${text.fontFamily}", sans-serif`,
                    fontWeight: text.fontWeight,
                    color: text.color,
                    opacity: opacityRatio,
                  }}
                >
                  {text.content}
                </span>
              )
            }

            return null
          })}
        </div>
      ) : null}

      {!metrics && emptyHint ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="rounded-lg bg-background/90 px-4 py-2 text-center text-sm text-muted-foreground shadow-sm">
            {emptyHint}
          </p>
        </div>
      ) : null}

      {imageFailed && type === "image" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="rounded-lg bg-background/90 px-4 py-2 text-center text-sm text-muted-foreground shadow-sm">
            The watermark image could not be loaded.
          </p>
        </div>
      ) : null}
    </div>
  )
}
