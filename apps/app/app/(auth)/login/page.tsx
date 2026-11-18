"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { getBrowserApi } from "@/lib/api/browser"
import { useSession } from "@/lib/auth/session-provider"

function getNextPath() {
  const params = new URLSearchParams(window.location.search)
  const next = params.get("next")
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next
  }
  return "/workspaces"
}

const oauthErrorMessages: Record<string, string> = {
  oauth_failed: "Google sign-in could not be completed. Try again.",
  oauth_not_configured: "Google sign-in is not available right now.",
  oauth_email_unverified: "Google has not verified this email address.",
  account_suspended: "This account is suspended. Contact your workspace owner.",
}

function loginError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "invalid_credentials") {
      return "The email or password is incorrect."
    }
    if (error.code === "account_suspended") {
      return "This account is suspended. Contact your workspace owner."
    }
    if (error.code === "rate_limited") {
      return "Too many attempts. Try again in a few minutes."
    }
    if (error.detail) return error.detail
  }
  return "Could not sign in. Check your connection and try again."
}

export default function LoginPage() {
  const { session } = useSession()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [nextPath, setNextPath] = React.useState("/workspaces")

  React.useEffect(() => {
    setNextPath(getNextPath())
    const oauthError = new URLSearchParams(window.location.search).get("error")
    if (oauthError) {
      setError(oauthErrorMessages[oauthError] ?? oauthErrorMessages.oauth_failed!)
    }
  }, [])

  React.useEffect(() => {
    if (session) {
      router.replace(getNextPath())
    }
  }, [router, session])

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await getBrowserApi().request<Schemas["SessionDto"]>("/v1/auth/login", {
        method: "POST",
        body: {
          email: email.trim(),
          password,
        } satisfies Schemas["LoginRequest"],
      })
      router.replace(getNextPath())
      router.refresh()
    } catch (signInError) {
      setError(loginError(signInError))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to the Racetify organizer workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleSignInButton redirect={nextPath} />
        {session?.user.emailVerified === false ? (
          <Alert>
            <AlertTitle>Email not verified</AlertTitle>
            <AlertDescription>
              Some actions may be unavailable until you verify your email.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        New to Racetify?{" "}
        <Link
          href="/register"
          className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </CardFooter>
    </Card>
  )
}
