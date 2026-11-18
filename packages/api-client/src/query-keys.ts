export type ListKeyParams = Record<
  string,
  string | number | boolean | undefined | null
>

export const queryKeys = {
  session: () => ["session"] as const,
  authProviders: () => ["auth", "providers"] as const,
  workspaces: () => ["workspaces"] as const,
  me: () => ["me"] as const,
  notifications: () => ["notifications"] as const,
  accessOrg: (orgId: string) => ["access", "org", orgId] as const,
  accessEvent: (eventId: string) => ["access", "event", eventId] as const,
  accessSystem: () => ["access", "system"] as const,
  org: (orgId: string) => ["org", orgId] as const,
  orgOverview: (orgId: string) => ["org", orgId, "overview"] as const,
  orgMembers: (orgId: string, params?: ListKeyParams) =>
    ["org", orgId, "members", params ?? {}] as const,
  orgRoles: (orgId: string) => ["org", orgId, "roles"] as const,
  orgAudit: (orgId: string, params?: ListKeyParams) =>
    ["org", orgId, "audit", params ?? {}] as const,
  orgEvents: (orgId: string, params?: ListKeyParams) =>
    ["org", orgId, "events", params ?? {}] as const,
  orgOAuthClients: (orgId: string) => ["org", orgId, "oauth-clients"] as const,
  orgWebhooks: (orgId: string) => ["org", orgId, "webhooks"] as const,
  orgWebhookDeliveries: (orgId: string, webhookId: string) =>
    ["org", orgId, "webhook", webhookId, "deliveries"] as const,
  event: (eventId: string) => ["event", eventId] as const,
  eventOverview: (eventId: string) => ["event", eventId, "overview"] as const,
  eventRaces: (eventId: string) => ["event", eventId, "races"] as const,
  eventTeam: (eventId: string) => ["event", eventId, "team"] as const,
  eventRegistrationConfig: (eventId: string) =>
    ["event", eventId, "registration-config"] as const,
  participants: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "participants", params ?? {}] as const,
  participant: (eventId: string, participantId: string) =>
    ["event", eventId, "participant", participantId] as const,
  participantImport: (eventId: string, importId: string) =>
    ["event", eventId, "participant-import", importId] as const,
  orders: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "orders", params ?? {}] as const,
  order: (eventId: string, orderId: string) =>
    ["event", eventId, "order", orderId] as const,
  payments: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "payments", params ?? {}] as const,
  galleryCollections: (eventId: string) =>
    ["event", eventId, "gallery", "collections"] as const,
  galleryItems: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "gallery", "items", params ?? {}] as const,
  galleryItem: (eventId: string, itemId: string) =>
    ["event", eventId, "gallery", "item", itemId] as const,
  galleryUpload: (eventId: string, uploadId: string) =>
    ["event", eventId, "gallery", "upload", uploadId] as const,
  watermarks: (eventId: string) => ["event", eventId, "watermarks"] as const,
  templates: (eventId: string) =>
    ["event", eventId, "generator-templates"] as const,
  eventFonts: (eventId: string) => ["event", eventId, "fonts"] as const,
  documentJobs: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "generated-documents", params ?? {}] as const,
  certificates: (eventId: string, params?: ListKeyParams) =>
    ["event", eventId, "certificates", params ?? {}] as const,
  adminOverview: () => ["admin", "overview"] as const,
  adminOrgs: (params?: ListKeyParams) =>
    ["admin", "orgs", params ?? {}] as const,
  adminUsers: (params?: ListKeyParams) =>
    ["admin", "users", params ?? {}] as const,
  adminUser: (userId: string) => ["admin", "user", userId] as const,
  adminRoles: () => ["admin", "roles"] as const,
  adminPermissions: () => ["admin", "permissions"] as const,
  adminJobs: (params?: ListKeyParams) =>
    ["admin", "jobs", params ?? {}] as const,
  adminAudit: (params?: ListKeyParams) =>
    ["admin", "audit", params ?? {}] as const,
  publicEvent: (slug: string) => ["public", "event", slug] as const,
  publicRegistrationConfig: (slug: string) =>
    ["public", "event", slug, "registration-config"] as const,
  publicGalleryCollections: (slug: string) =>
    ["public", "event", slug, "gallery", "collections"] as const,
  publicGalleryItems: (slug: string, params?: ListKeyParams) =>
    ["public", "event", slug, "gallery", "items", params ?? {}] as const,
  publicGalleryItem: (slug: string, itemId: string) =>
    ["public", "event", slug, "gallery", "item", itemId] as const,
  publicFaceSearch: (slug: string, searchId: string) =>
    ["public", "event", slug, "gallery", "face-search", searchId] as const,
  publicCertificate: (number: string) =>
    ["public", "certificate", number] as const,
  publicResults: (slug: string) =>
    ["public", "event", slug, "results"] as const,
  publicRaceResults: (slug: string, raceSlug: string) =>
    ["public", "event", slug, "results", raceSlug] as const,
}
