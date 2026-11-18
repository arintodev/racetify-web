import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BadgeCheck } from "lucide-react"

import { ApiError, type Schemas } from "@workspace/api-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { ShareButton } from "@/components/share-button"
import { CertificatePreview } from "@/features/public-certificates"
import { getServerApi } from "@/lib/api/server"
import { formatDate } from "@/lib/format"

type CertificateResult =
  | { state: "found"; certificate: Schemas["PublicCertificateDto"] }
  | { state: "unavailable" }
  | null

async function fetchCertificate(
  certificateNumber: string
): Promise<CertificateResult> {
  try {
    const api = await getServerApi()
    const certificate = await api.request<Schemas["PublicCertificateDto"]>(
      `/v1/public/certificates/${certificateNumber}`
    )

    if (certificate.status !== "issued") {
      return { state: "unavailable" }
    }

    return { state: "found", certificate }
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    if (error instanceof ApiError && error.status === 410) {
      return { state: "unavailable" }
    }
    throw error
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certificateNumber: string }>
}): Promise<Metadata> {
  const { certificateNumber } = await params
  const result = await fetchCertificate(certificateNumber)

  if (!result || result.state === "unavailable") {
    return {
      title: "Certificate unavailable",
      robots: { index: false, follow: false },
    }
  }

  const { certificate } = result
  const description = `Verify the ${certificate.event.name} certificate for ${certificate.participantName}.`

  return {
    title: `Certificate for ${certificate.participantName}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `Certificate for ${certificate.participantName}`,
      description,
      type: "website",
    },
  }
}

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>
}) {
  const { certificateNumber } = await params
  const result = await fetchCertificate(certificateNumber)

  if (!result) {
    notFound()
  }

  if (result.state === "unavailable") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
        <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Unavailable
            </Badge>
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
              Certificate unavailable
            </CardTitle>
            <CardDescription>
              This certificate has been revoked or is not yet issued. Contact
              the race organizer if you believe this is a mistake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Go to Racetify
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { certificate } = result

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 pb-16">
      <CertificatePreview certificate={certificate} />

      <Card className="gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Certificate details
              </CardTitle>
              <CardDescription>{certificate.event.name}</CardDescription>
            </div>
            <ShareButton
              title={`Certificate for ${certificate.participantName}`}
              text={`${certificate.participantName} · ${certificate.event.name}`}
              url={`https://racetify.com/cert/${certificate.certificateNumber}`}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow
              label="Participant"
              value={certificate.participantName}
            />
            <DetailRow label="Event" value={certificate.event.name} />
            <DetailRow
              label="Race"
              value={certificate.raceName ?? "Not available"}
            />
            <DetailRow
              label="Category"
              value={certificate.categoryName ?? "Not available"}
            />
            <DetailRow label="Finish status" value={certificate.finishStatus} />
            <DetailRow
              label="Issued"
              value={
                certificate.issuedAt
                  ? formatDate(certificate.issuedAt)
                  : "Not available"
              }
            />
            <div>
              <dt className="text-xs text-muted-foreground">Organizer</dt>
              <dd className="mt-0.5 font-medium">
                {certificate.organizationName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Certificate number
              </dt>
              <dd className="mt-0.5 font-mono font-medium">
                {certificate.certificateNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Verification</dt>
              <dd className="mt-0.5">
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </Badge>
              </dd>
            </div>
          </dl>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/e/${certificate.event.slug}/certificates`} />
              }
            >
              Find another certificate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
