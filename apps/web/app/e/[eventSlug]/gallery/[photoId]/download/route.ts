import { serverApiBaseUrl } from "@/lib/api/server"

export const dynamic = "force-dynamic"

/**
 * Streams the original gallery image as a same-origin attachment. The API verifies that the item is
 * published in a public collection; the browser cannot follow a cross-origin `download` link.
 */
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ eventSlug: string; photoId: string }>
  }
): Promise<Response> {
  const { eventSlug, photoId } = await params
  const endpoint = `${serverApiBaseUrl()}/v1/public/events/${encodeURIComponent(eventSlug)}/gallery/items/${encodeURIComponent(photoId)}/download`
  const forwardedFor = request.headers.get("x-forwarded-for")

  let upstream: globalThis.Response
  try {
    upstream = await fetch(endpoint, {
      cache: "no-store",
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : undefined,
    })
  } catch {
    return new Response("Could not prepare the download", { status: 502 })
  }

  if (!upstream.ok) {
    return upstream.status === 404
      ? new Response("Photo not found", { status: 404 })
      : new Response("Could not prepare the download", { status: 502 })
  }
  if (!upstream.body) {
    return new Response("Could not prepare the download", { status: 502 })
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  })
  for (const name of ["content-type", "content-disposition"] as const) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }

  return new Response(upstream.body, { headers })
}
