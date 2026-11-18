import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Brand } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"
import { siteNav } from "@/lib/marketing-content"

import { MarketingNav } from "./marketing-nav"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {siteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 sm:inline-flex"
            nativeButton={false}
            render={<a href="https://app.racetify.com/login" />}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="hidden h-9 sm:inline-flex"
            nativeButton={false}
            render={<Link href="/contact" />}
          >
            Request a demo
          </Button>
          <MarketingNav />
        </div>
      </div>
    </header>
  )
}
