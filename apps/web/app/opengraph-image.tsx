import { ImageResponse } from "next/og"

export const alt = "Racetify — Race operations software for organizers"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            backgroundColor: "#fafafa",
            color: "#0a0a0a",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          R
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600 }}>
          Racetify
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 920,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}
        >
          Race operations software for organizers.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          Registration · Participants · Orders · Media · Results
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa" }}>
        racetify.com
      </div>
    </div>,
    size
  )
}
