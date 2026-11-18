"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@workspace/ui/components/button"

import { getBrowserApi } from "@/lib/api/browser"

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84v-2.6H3.06a10 10 0 0 0 0 9.04l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  )
}

/**
 * Only rendered when the API reports Google as configured. The API route owns the redirect to
 * Google and the callback that sets the session cookie.
 */
export function GoogleSignInButton({
  redirect,
  label = "Continue with Google",
}: {
  redirect: string
  label?: string
}) {
  const providers = useQuery({
    queryKey: queryKeys.authProviders(),
    queryFn: () =>
      getBrowserApi().request<Schemas["AuthProvidersDto"]>(
        "/v1/auth/providers"
      ),
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (!providers.data?.google) return null

  function startGoogleSignIn() {
    const params = new URLSearchParams({ redirect })
    window.location.assign(
      `/api/v1/auth/oauth/google/start?${params.toString()}`
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={startGoogleSignIn}
    >
      <GoogleMark />
      {label}
    </Button>
  )
}
