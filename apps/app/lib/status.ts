

export type StatusTone =
  "neutral" | "info" | "success" | "warning" | "destructive"

export type StatusConfig = {
  label: string
  tone: StatusTone
}

export const eventStatuses: Record<string, StatusConfig> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "info" },
  ongoing: { label: "Ongoing", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "destructive" },
}

export const userStatuses: Record<string, StatusConfig> = {
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "warning" },
  deleted: { label: "Deleted", tone: "neutral" },
}

export const organizationStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
}

export const memberStatuses: Record<string, StatusConfig> = {
  invited: { label: "Invited", tone: "info" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "warning" },
}

export const raceStatuses: Record<string, StatusConfig> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "info" },
  closed: { label: "Closed", tone: "neutral" },
}

export const registrationStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
}

export const orderStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
}

export const paymentStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  success: { label: "Success", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
  expired: { label: "Expired", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
}

export const invitationStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "destructive" },
}

export const certificateStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  issued: { label: "Issued", tone: "success" },
  revoked: { label: "Revoked", tone: "destructive" },
}

export const jobStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
}

export const webhookStatuses: Record<string, StatusConfig> = {
  active: { label: "Active", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
}

export const faceEnrollmentStatuses: Record<string, StatusConfig> = {
  pending: { label: "Pending", tone: "warning" },
  active: { label: "Active", tone: "success" },
  rejected: { label: "Rejected", tone: "destructive" },
  deleted: { label: "Deleted", tone: "neutral" },
}
