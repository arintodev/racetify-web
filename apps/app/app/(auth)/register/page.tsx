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

export default function RegisterPage() {
  const { session } = useSession()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (session) router.replace("/workspaces")
  }, [router, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 12) {
      setError("Use at least 12 characters for your password.")
      return
    }

    setPending(true)
    try {
      await getBrowserApi().request("/v1/auth/register", {
        method: "POST",
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          email: email.trim(),
          password,
        } satisfies Schemas["RegisterRequest"],
      })
      setSubmitted(true)
    } catch (registerError) {
      if (registerError instanceof ApiError) {
        if (registerError.code === "rate_limited") {
          setError("Too many attempts. Try again later.")
        } else if (registerError.isValidationFailed) {
          setError(
            registerError.issues[0]?.message ??
              "Check the form and try again."
          )
        } else if (registerError.detail) {
          setError(registerError.detail)
        } else {
          setError("Could not create the account.")
        }
      } else {
        setError("Could not create the account. Try again.")
      }
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If the address can be registered, a verification link is on its way
            to {email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You can sign in now; some workspace actions may require a verified
          email.
        </CardContent>
        <CardFooter>
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            className="w-full"
          >
            Continue to sign in
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start organizing races with Racetify.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Ayu"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name (optional)</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Pradita"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 12 characters.
            </p>
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
              <AlertTitle>Check your details</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton
            redirect="/workspaces"
            label="Continue with Google"
          />
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
