/**
 * Display metadata for the OAuth scopes and webhook events the organizer can configure.
 *
 * Keep these values in sync with the backend allowlists (`identity::oauth::ALLOWED_SCOPES` and
 * `webhooks::validation::SUPPORTED_EVENTS`).
 */

import type { StatusConfig } from "@/lib/status"

export type FieldOption = {
  value: string
  label: string
  description: string
}

export const OAUTH_CLIENT_STATUSES: Record<string, StatusConfig> = {
  active: { label: "Active", tone: "success" },
  revoked: { label: "Revoked", tone: "destructive" },
  disabled: { label: "Disabled", tone: "neutral" },
}

export const WEBHOOK_DELIVERY_STATUSES: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
}

export function statusConfig(
  statuses: Record<string, StatusConfig>,
  status: string
): StatusConfig {
  return statuses[status] ?? { label: status, tone: "neutral" }
}

export const OAUTH_SCOPES: FieldOption[] = [
  {
    value: "event:gallery:view",
    label: "Gallery read",
    description: "Read collections and gallery items, and run face search.",
  },
  {
    value: "org:face-enrollments:view",
    label: "Enrollment read",
    description: "Read enrollments and search the gallery by an enrollment.",
  },
  {
    value: "org:face-enrollments:manage",
    label: "Enrollment manage",
    description: "Create, upload, submit, and revoke enrollments.",
  },
]

export const WEBHOOK_EVENTS: FieldOption[] = [
  {
    value: "face_enrollment.activated",
    label: "Enrollment activated",
    description: "The enrollment is active and searchable.",
  },
  {
    value: "face_enrollment.failed",
    label: "Enrollment failed",
    description: "Processing failed; the payload includes the reason.",
  },
]

export const TEST_EVENT = "webhook.ping"

export function scopeLabel(scope: string): string {
  return OAUTH_SCOPES.find((option) => option.value === scope)?.label ?? scope
}

export function webhookEventLabel(event: string): string {
  if (event === TEST_EVENT) return "Test"
  return WEBHOOK_EVENTS.find((option) => option.value === event)?.label ?? event
}
