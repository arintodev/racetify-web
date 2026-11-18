import type { Metadata } from "next"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { MarketingShell } from "@/components/marketing/marketing-shell"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Racetify about race registration, participant management, and event operations.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <Badge variant="outline">Contact</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Talk to the Racetify team
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Tell us about your event, the number of participants you expect, and
          the tools you need. We will get back to you with next steps.
        </p>

        <Card className="mt-8 gap-4 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              The best way to reach us about a demo or a new event.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <a
              href="mailto:hello@racetify.com"
              className="text-lg font-medium underline underline-offset-4 hover:text-primary"
            >
              hello@racetify.com
            </a>
            <Button
              className="h-10"
              nativeButton={false}
              render={<a href="mailto:hello@racetify.com" />}
            >
              Email us
            </Button>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-muted-foreground">
          This is a placeholder contact address for the demo. Replace it with
          the real support email before launch or review.
        </p>
      </div>
    </MarketingShell>
  )
}
