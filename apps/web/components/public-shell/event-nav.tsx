"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

export function EventNav({ eventSlug }: { eventSlug: string }) {
  const pathname = usePathname()
  const base = `/e/${eventSlug}`
  const items = [
    { label: "Overview", href: base },
    { label: "Register", href: `${base}/register` },
    { label: "Gallery", href: `${base}/gallery` },
    { label: "Results", href: `${base}/results` },
    { label: "Certificates", href: `${base}/certificates` },
  ]

  return (
    <nav
      aria-label="Event pages"
      className="flex gap-1 overflow-x-auto border-t px-2"
    >
      {items.map((item) => {
        const active =
          item.href === base
            ? pathname === base
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
