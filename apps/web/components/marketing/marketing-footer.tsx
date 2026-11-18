import Link from "next/link"

import { Brand } from "@/components/brand"
import { footerGroups } from "@/lib/marketing-content"

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="flex flex-col items-start gap-3">
          <Brand />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Race operations software for organizers. Registration, participants,
            orders, media, and results in one workspace.
          </p>
          <a
            href="mailto:hello@racetify.com"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            hello@racetify.com
          </a>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-medium">{group.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Racetify. All rights reserved.</p>
          <p>Race operations for organizers.</p>
        </div>
      </div>
    </footer>
  )
}
