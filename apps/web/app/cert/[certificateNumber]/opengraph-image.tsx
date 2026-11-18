import { ImageResponse } from "next/og"

import {
  ApiError,
  createServerApiClient,
  type Schemas,
} from "@workspace/api-client"

import { formatDate } from "@/lib/format"

export const alt = "Racetify certificate preview"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const internalUrl =
  process.env.RACETIFY_API_INTERNAL_URL?.replace(/\/$/, "") ??
  "http://localhost:8080"

async function fetchCertificate(certificateNumber: string) {
  try {
    return await createServerApiClient({ baseUrl: internalUrl }).request<
      Schemas["PublicCertificateDto"]
    >(`/v1/public/certificates/${certificateNumber}`)
  } catch (error) {
    if (error instanceof ApiError) return null
    throw error
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ certificateNumber: string }>
}) {
  const { certificateNumber } = await params
  const certificate = await fetchCertificate(certificateNumber)

  if (!certificate || certificate.status !== "issued") {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f4f5",
          color: "#3f3f46",
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        Certificate unavailable
      </div>,
      size
    )
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fffbeb",
        border: "24px solid #fef3c7",
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: 10,
          textTransform: "uppercase",
          color: "#a16207",
        }}
      >
        Certificate of Completion
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 72,
          fontWeight: 700,
          color: "#18181b",
          textAlign: "center",
        }}
      >
        {certificate.participantName}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 14,
          fontSize: 30,
          color: "#52525b",
        }}
      >
        {certificate.raceName ?? certificate.event.name}
        {certificate.categoryName ? ` · ${certificate.categoryName}` : ""}
      </div>
      <div
        style={{
          display: "flex",
          gap: 56,
          marginTop: 44,
          fontSize: 22,
          color: "#3f3f46",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, color: "#a1a1aa" }}>EVENT</span>
          <span>{certificate.event.name}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, color: "#a1a1aa" }}>DATE</span>
          <span>{formatDate(certificate.event.startDate)}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 48,
          fontSize: 18,
          letterSpacing: 3,
          color: "#71717a",
        }}
      >
        {certificate.certificateNumber}
      </div>
    </div>,
    size
  )
}
