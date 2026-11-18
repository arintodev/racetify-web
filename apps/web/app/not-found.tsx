import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { Brand } from "@/components/brand"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <Brand className="mb-2" />
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page could not be found
      </h1>
      <p className="text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button nativeButton={false} render={<Link href="/" />}>
          Back to home
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/contact" />}
        >
          Contact
        </Button>
      </div>
    </div>
  )
}
