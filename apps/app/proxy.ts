import { NextResponse, type NextRequest } from "next/server"

const sessionCookieName =
  process.env.RACETIFY_SESSION_COOKIE_NAME ?? "__Host-racetify_session"

/**
 * Optimistic redirect only. This checks for the presence of the session cookie; the API remains
 * the authorization authority for every request.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get(sessionCookieName)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?next=${encodeURIComponent(
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/workspaces/:path*",
    "/orgs/:path*",
    "/events/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/notifications/:path*",
  ],
}
