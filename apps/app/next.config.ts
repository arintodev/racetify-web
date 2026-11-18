import path from "node:path"
import type { NextConfig } from "next"

const apiOrigin =
  process.env.RACETIFY_API_ORIGIN?.replace(/\/$/, "") ?? "http://localhost:8080"

const nextConfig: NextConfig = {
  output: "standalone",
  // pnpm runs `next build` from apps/app; ../.. is the monorepo root. Without this,
  // workspace packages outside apps/app are not traced into the standalone image.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@workspace/ui", "@workspace/api-client"],
  // The dev indicator overlaps the sidebar user menu.
  devIndicators: false,
  experimental: {
    // Marks this app as receiving the agent-driven security upgrade.
    agentUpgrade: "security",
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
