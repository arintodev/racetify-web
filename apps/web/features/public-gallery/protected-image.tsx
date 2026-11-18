"use client"

import type { ComponentProps } from "react"

type ProtectedImageProps = Omit<ComponentProps<"img">, "draggable">

/**
 * Displays a gallery photo while discouraging casual saving: native drag, the context menu, and
 * iOS long-press callouts are disabled, and the image does not receive pointer events.
 *
 * This is a deterrent, not access control: the preview remains a public URL.
 */
export function ProtectedImage({
  className,
  alt,
  ...props
}: ProtectedImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      className={[
        "pointer-events-none select-none [-webkit-touch-callout:none]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  )
}
