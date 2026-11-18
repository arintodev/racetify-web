"use client"

import { AlertTriangle } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import type { WatermarkAsset } from "../hooks/use-watermark-asset"
import type { GeometryConfig } from "../lib/geometry"
import type { SamplePhoto } from "../lib/sample-photos"
import type { WatermarkType } from "../lib/types"

import { ConfigSummary } from "./config-summary"
import { PreviewStage } from "./preview-stage"

export function PreviewPanel({
  type,
  photo,
  orientation,
  onOrientationChange,
  config,
  opacityPercent,
  asset,
  text,
  fontsReady,
  previewError,
  emptyHint,
  onAssetError,
}: {
  type: WatermarkType
  photo: SamplePhoto
  orientation: SamplePhoto["key"]
  onOrientationChange: (value: SamplePhoto["key"]) => void
  config: GeometryConfig
  opacityPercent: number
  asset: WatermarkAsset | null
  text: {
    content: string
    fontFamily: string
    fontWeight: number
    color: string
  }
  fontsReady: number
  previewError: boolean
  emptyHint?: string
  onAssetError?: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                A square canvas with the photo contained and the watermark
                scaled by the same factor.
              </CardDescription>
            </div>
            <ToggleGroup
              aria-label="Preview orientation"
              value={[orientation]}
              onValueChange={(value) => {
                const next = value[0]
                if (next === "landscape" || next === "portrait") {
                  onOrientationChange(next)
                }
              }}
            >
              <ToggleGroupItem value="landscape">Landscape</ToggleGroupItem>
              <ToggleGroupItem value="portrait">Portrait</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {previewError ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Preview unavailable</AlertTitle>
              <AlertDescription>
                The watermark image could not be loaded. Choose a replacement;
                your other settings are unchanged.
              </AlertDescription>
            </Alert>
          ) : null}
          <PreviewStage
            type={type}
            photo={photo}
            config={config}
            opacityRatio={opacityPercent / 100}
            asset={asset}
            text={text}
            fontsReady={fontsReady}
            emptyHint={emptyHint}
            onAssetError={onAssetError}
          />
          <p className="text-center text-xs text-muted-foreground">
            {photo.label} · preview scaled to fit
          </p>
        </CardContent>
      </Card>

      <ConfigSummary
        currentPhoto={photo}
        config={config}
        opacityPercent={opacityPercent}
        type={type}
        asset={asset}
        text={text}
        fontsReady={fontsReady}
      />
    </div>
  )
}
