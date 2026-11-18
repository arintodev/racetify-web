"use client"

import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import {
  PREVIEW_CANVAS_SIZE,
  resolveLayout,
  type GeometryConfig,
} from "../lib/geometry"
import { computeWatermarkMetrics } from "../lib/metrics"
import { SAMPLE_PHOTOS, type SamplePhoto } from "../lib/sample-photos"
import { POSITION_LABELS, type WatermarkType } from "../lib/types"

export function ConfigSummary({
  currentPhoto,
  config,
  opacityPercent,
  type,
  asset,
  text,
  fontsReady,
}: {
  currentPhoto: SamplePhoto
  config: GeometryConfig
  opacityPercent: number
  type: WatermarkType
  asset: { width: number | null; height: number | null } | null
  text: { content: string; fontFamily: string; fontWeight: number }
  fontsReady: number
}) {
  const rows = React.useMemo(
    () =>
      SAMPLE_PHOTOS.map((photo) => {
        const metrics = computeWatermarkMetrics({
          type,
          photo,
          sizeRatio: config.sizeRatio,
          marginRatio: config.marginRatio,
          asset,
          text,
        })
        const layout = metrics
          ? resolveLayout(photo, PREVIEW_CANVAS_SIZE, metrics.size, config)
          : null
        return { photo, layout }
      }),
    // `fontsReady` re-measures text once webfonts finish loading.
    [
      type,
      config,
      asset?.width,
      asset?.height,
      text.content,
      text.fontFamily,
      text.fontWeight,
      fontsReady,
    ]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration summary</CardTitle>
        <CardDescription>
          Rendered pixels at the original photo resolution. Both samples share
          a 1280 px longest edge, so the watermark matches.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Position</dt>
            <dd className="font-medium">
              {config.repeat ? "Repeat" : POSITION_LABELS[config.position]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Opacity</dt>
            <dd className="font-medium tabular-nums">{opacityPercent}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rotation</dt>
            <dd className="font-medium tabular-nums">{config.rotation}°</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reference</dt>
            <dd className="font-medium">
              {config.repeat ? "Short edge spacing" : "Long edge size"}
            </dd>
          </div>
        </dl>

        <Separator />

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Sample</th>
                <th className="px-3 py-2 font-medium">Watermark</th>
                <th className="px-3 py-2 font-medium">Margin</th>
                <th className="px-3 py-2 font-medium">Spacing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ photo, layout }) => (
                <tr
                  key={photo.key}
                  className={cn(
                    "border-t",
                    photo.key === currentPhoto.key && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-2">
                    <span className="font-medium capitalize">
                      {photo.key}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {photo.width} × {photo.height}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {layout
                      ? `${formatPx(layout.source.watermark.width)} × ${formatPx(
                          layout.source.watermark.height
                        )} px`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {config.repeat
                      ? "—"
                      : layout
                        ? `${formatPx(layout.source.margin)} px`
                        : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {layout?.source.stepX && layout.source.stepY
                      ? `${formatPx(layout.source.stepX)} × ${formatPx(
                          layout.source.stepY
                        )} px`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.every((row) => !row.layout) ? (
          <p className="text-xs text-muted-foreground">
            {type === "image"
              ? "Choose a watermark image to calculate dimensions."
              : "Enter watermark text to calculate dimensions."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatPx(value: number): string {
  return String(Math.round(value * 10) / 10)
}
