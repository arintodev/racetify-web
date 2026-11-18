import Link from "next/link"

import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link href="/login" aria-label="Racetify sign in">
        <BrandMark showSubtitle />
      </Link>
      <div className="mt-8 w-full max-w-md">{children}</div>
      <p className="mt-8 max-w-sm text-center text-xs text-muted-foreground">
        Sign in with your Racetify organizer account to manage your races.
      </p>
    </div>
  )
}
