export type WorkspaceKind = "organization" | "event" | "admin" | "account"

export type WorkspaceInfo = {
  kind: WorkspaceKind
  id?: string
  name: string
  subtitle?: string
}

export type ShellBreadcrumb = {
  label: string
  href?: string
}
