import {
  Award,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderOpen,
  Images,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Route,
  ScanFace,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stamp,
  Ticket,
  Upload,
  UserRound,
  Users,
  Webhook,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { Permission } from "@/lib/auth/permissions"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  permission?: Permission
  badge?: string
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export function getOrganizationNav(orgId: string): NavGroup[] {
  const base = `/orgs/${orgId}`

  return [
    {
      label: "Workspace",
      items: [
        {
          title: "Overview",
          href: `${base}/overview`,
          icon: LayoutDashboard,
          permission: "org:overview:view",
        },
        {
          title: "Events",
          href: `${base}/events`,
          icon: CalendarDays,
          permission: "org:events:view",
        },
        {
          title: "Members",
          href: `${base}/members`,
          icon: Users,
          permission: "org:members:view",
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          title: "Roles",
          href: `${base}/roles`,
          icon: ShieldCheck,
          permission: "org:roles:manage",
        },
        {
          title: "Settings",
          href: `${base}/settings`,
          icon: Settings,
          permission: "org:settings:view",
        },
        {
          title: "Integrations",
          href: `${base}/integrations`,
          icon: Webhook,
          permission: "org:webhooks:manage",
        },
        {
          title: "Audit log",
          href: `${base}/audit-logs`,
          icon: ScrollText,
          permission: "org:audit:view",
        },
      ],
    },
  ]
}

export function getEventNav(eventId: string): NavGroup[] {
  const base = `/events/${eventId}`

  return [
    {
      label: "Event",
      items: [
        {
          title: "Overview",
          href: `${base}/overview`,
          icon: LayoutDashboard,
          permission: "event:overview:view",
        },
        {
          title: "Settings",
          href: `${base}/settings`,
          icon: Settings,
          permission: "event:settings:update",
        },
        {
          title: "Races",
          href: `${base}/races`,
          icon: Route,
          permission: "event:races:manage",
        },
        {
          title: "Team",
          href: `${base}/team`,
          icon: Users,
          permission: "event:team:manage",
        },
        {
          title: "Registration",
          href: `${base}/registration`,
          icon: ClipboardList,
          permission: "event:registration:manage",
        },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          title: "Participants",
          href: `${base}/participants`,
          icon: UserRound,
          permission: "event:participants:view",
        },
        {
          title: "Orders",
          href: `${base}/orders`,
          icon: ShoppingCart,
          permission: "event:orders:view",
        },
        {
          title: "Payments",
          href: `${base}/payments`,
          icon: CreditCard,
          permission: "event:payments:view",
        },
      ],
    },
    {
      label: "Media",
      items: [
        {
          title: "Gallery",
          href: `${base}/gallery`,
          icon: Images,
          permission: "event:gallery:view",
        },
        {
          title: "Collections",
          href: `${base}/gallery/collections`,
          icon: FolderOpen,
          permission: "event:gallery:manage",
        },
        {
          title: "Upload",
          href: `${base}/gallery/upload`,
          icon: Upload,
          permission: "event:gallery:upload",
        },
        {
          title: "Watermarks",
          href: `${base}/gallery/watermarks`,
          icon: Stamp,
          permission: "event:watermarks:manage",
        },
      ],
    },
    {
      label: "Documents",
      items: [
        {
          title: "Template Studio",
          href: `${base}/template-studio`,
          icon: LayoutTemplate,
          permission: "event:generators:manage",
        },
        {
          title: "Bib generator",
          href: `${base}/bib-generator`,
          icon: Ticket,
          permission: "event:generators:manage",
        },
        {
          title: "Certificates",
          href: `${base}/certificates`,
          icon: Award,
          permission: "event:certificates:view",
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          title: "Audit log",
          href: `${base}/audit-logs`,
          icon: ScrollText,
          permission: "event:audit:view",
        },
      ],
    },
  ]
}

export function getAdminNav(): NavGroup[] {
  return [
    {
      label: "Platform",
      items: [
        {
          title: "Overviews",
          href: "/admin/overviews",
          icon: LayoutDashboard,
          permission: "system:overview:view",
        },
        {
          title: "Organizations",
          href: "/admin/orgs",
          icon: Building2,
          permission: "system:orgs:view",
        },
        {
          title: "Users",
          href: "/admin/users",
          icon: Users,
          permission: "system:users:view",
        },
      ],
    },
    {
      label: "Access",
      items: [
        {
          title: "Roles",
          href: "/admin/roles",
          icon: ShieldCheck,
          permission: "system:roles:view",
        },
        {
          title: "Permissions",
          href: "/admin/permissions",
          icon: KeyRound,
          permission: "system:permissions:view",
        },
      ],
    },
    {
      label: "Infrastructure",
      items: [
        {
          title: "Face enrollments",
          href: "/admin/face-enrollments",
          icon: ScanFace,
          permission: "system:face-enrollments:view",
        },
        {
          title: "Webhooks",
          href: "/admin/webhooks",
          icon: Webhook,
          permission: "system:webhooks:view",
        },
        {
          title: "Jobs",
          href: "/admin/jobs",
          icon: ListChecks,
          permission: "system:jobs:view",
        },
        {
          title: "Audit log",
          href: "/admin/audit-logs",
          icon: ScrollText,
          permission: "system:audit:view",
        },
      ],
    },
  ]
}

export function getAccountNav(): NavGroup[] {
  return [
    {
      label: "Account",
      items: [
        {
          title: "Profile",
          href: "/settings/profile",
          icon: UserRound,
        },
        {
          title: "Security",
          href: "/settings/security",
          icon: ShieldCheck,
        },
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
        },
      ],
    },
  ]
}
