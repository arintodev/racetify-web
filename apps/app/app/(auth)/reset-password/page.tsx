"use client"

import { ApiError, type Schemas } from "@workspace/api-client"
import * as React from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

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

import { getBrowserApi } from "@/lib/api/browser"

export default function ResetPasswordPage() {
  const [token, setToken] = React.useState<string | null>(null)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setError("This reset link is missing its token.")
      return
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setError(null)
    setPending(true)
    try {
      await getBrowserApi().request("/v1/auth/password/reset", {
        method: "POST",
        body: {
          token,
          newPassword: password,
        } satisfies Schemas["ResetPasswordRequest"],
      })
      setSubmitted(true)
    } catch (resetError) {
      if (resetError instanceof ApiError && resetError.code === "password_reset_invalid") {
        setError("This reset link is invalid or has expired.")
      } else {
        setError("Could not update the password. Try again.")
      }
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Sign in with your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
            <CheckCircle2 className="size-5 text-emerald-600" />
            All other sessions have been signed out.
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button nativeButton={false} render={<Link href="/login" />}>
            Return to sign in
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use at least 12 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Check your password</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !token}
          >
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
