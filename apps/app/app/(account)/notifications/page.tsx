"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Award,
  Bell,
  CalendarClock,
  CheckCheck,
  Cog,
  CreditCard,
  Images,
  Mail,
} from "lucide-react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { getBrowserApi } from "@/lib/api/browser"
import { formatDateTime } from "@/lib/format"

type Notification = Schemas["NotificationDto"]

function iconFor(type: string) {
  if (type.startsWith("order") || type.startsWith("payment")) {
    return CreditCard
  }
  if (type.startsWith("gallery")) return Images
  if (type.startsWith("certificate")) return Award
  if (type.startsWith("invitation") || type.startsWith("member")) {
    return Mail
  }
  if (type.startsWith("job")) return Cog
  if (type.startsWith("event")) return CalendarClock
  return Bell
}

function NotificationList({
  items,
  onMarkRead,
  pending,
}: {
  items: Notification[]
  onMarkRead: (id: string) => void
  pending: boolean
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="You are all caught up"
        description="New registration, gallery, certificate, and job notifications will appear here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((notification) => {
        const Icon = iconFor(notification.type)
        const unread = !notification.readAt
        return (
          <div
            key={notification.id}
            className="flex items-start gap-3 rounded-xl border p-4"
          >
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" />
              {unread ? (
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{notification.title}</p>
                {unread ? (
                  <span className="text-xs font-medium text-primary">
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>
            {unread ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkRead(notification.id)}
                disabled={pending}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const notifications = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () =>
      getBrowserApi().request<Schemas["NotificationListDto"]>(
        "/v1/me/notifications"
      ),
  })

  const items = notifications.data?.items ?? []
  const unread = items.filter((notification) => !notification.readAt)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
  }

  async function markRead(id: string) {
    try {
      await getBrowserApi().request(`/v1/me/notifications/${id}`, {
        method: "PATCH",
      })
      invalidate()
    } catch {
      toast.error("Could not mark the notification as read")
    }
  }

  async function markAllRead() {
    try {
      await getBrowserApi().request("/v1/me/notifications/read-all", {
        method: "POST",
      })
      invalidate()
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Could not mark all notifications as read")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Payment, gallery, certificate, invitation, and job activity across your workspaces."
        actions={
          <Button
            variant="outline"
            onClick={() => void markAllRead()}
            disabled={unread.length === 0 || notifications.isPending}
          >
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />

      {notifications.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load notifications</AlertTitle>
          <AlertDescription>
            Check your connection and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {notifications.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all" className="gap-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              <span className="ml-1 text-xs text-muted-foreground">
                {items.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              <span className="ml-1 text-xs text-muted-foreground">
                {unread.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <NotificationList
              items={items}
              onMarkRead={(id) => void markRead(id)}
              pending={notifications.isFetching}
            />
          </TabsContent>
          <TabsContent value="unread">
            <NotificationList
              items={unread}
              onMarkRead={(id) => void markRead(id)}
              pending={notifications.isFetching}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
