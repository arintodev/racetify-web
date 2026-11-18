"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MailCheck } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { getBrowserApi } from "@/lib/api/browser"

export default function VerifyEmailPage() {
  const router = useRouter()
  const [token, setToken] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [verified, setVerified] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token")
    setToken(value)
    if (!value) return

    let cancelled = false
    setPending(true)
    getBrowserApi()
      .request<Schemas["SessionDto"]>("/v1/auth/email/verify", {
        method: "POST",
        body: { token: value } satisfies Schemas["TokenRequest"],
      })
      .then(() => {
        if (cancelled) return
        setVerified(true)
        router.replace("/workspaces")
        router.refresh()
      })
      .catch((verifyError: unknown) => {
        if (cancelled) return
        setError(
          verifyError instanceof ApiError &&
            verifyError.code === "email_verification_invalid"
            ? "This verification link is invalid or has expired."
            : "Could not verify the email. Try again."
        )
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <MailCheck className="size-5" />
          )}
        </div>
        <CardTitle>
          {verified
            ? "Email verified"
            : pending
              ? "Verifying your email"
              : "Verify your email"}
        </CardTitle>
        <CardDescription>
          {token
            ? "We are checking your verification link."
            : "Open the verification link from your email to finish setting up your account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {!token ? (
          <p className="text-sm text-muted-foreground">
            No email yet? Sign in and use “Resend verification” in your account
            settings.
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          nativeButton={false}
          render={<Link href={verified ? "/workspaces" : "/login"} />}
          className="w-full"
        >
          {verified ? "Open workspaces" : "Continue to sign in"}
        </Button>
      </CardFooter>
    </Card>
  )
}
