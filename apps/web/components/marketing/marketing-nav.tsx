"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import { Brand } from "@/components/brand"
import { siteNav } from "@/lib/marketing-content"

export function MarketingNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <Brand />
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Racetify navigation
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
          {siteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          <Button
            variant="outline"
            className="w-full justify-center"
            nativeButton={false}
            render={<a href="https://app.racetify.com/login" />}
          >
            Sign in
          </Button>
          <Button
            className="w-full justify-center"
            nativeButton={false}
            render={<Link href="/contact" onClick={() => setOpen(false)} />}
          >
            Request a demo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
