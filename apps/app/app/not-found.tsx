import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { BrandMark } from "@/components/brand-mark"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 text-center">
      <BrandMark showSubtitle />
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          That workspace does not exist
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The organization or event in this URL does not exist or you do not
          have access to it. Return to the workspace picker to continue.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/workspaces" />}>
        Back to workspaces
      </Button>
    </div>
  )
}
