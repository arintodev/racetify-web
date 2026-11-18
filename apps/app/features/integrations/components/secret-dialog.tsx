"use client"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { CopyButton } from "@/components/copy-button"

export function SecretDialog({
  open,
  onOpenChange,
  title,
  description,
  secret,
  contextLabel,
  contextValue,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  secret: string
  contextLabel?: string
  contextValue?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTitle>Shown only once</AlertTitle>
          <AlertDescription>
            Copy this secret into your secret manager now. It cannot be
            retrieved again; rotate it if it is lost.
          </AlertDescription>
        </Alert>

        {contextLabel && contextValue ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {contextLabel}
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs">
                {contextValue}
              </code>
              <CopyButton value={contextValue} label={`Copy ${contextLabel}`} />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Secret
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={secret}
              className="font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Signing secret"
            />
            <CopyButton value={secret} label="Copy secret" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            I have saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
