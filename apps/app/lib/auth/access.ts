"use client"

import { queryKeys, type Schemas } from "@workspace/api-client"
import { useQuery } from "@tanstack/react-query"

import { getBrowserApi } from "@/lib/api/browser"

export function useOrgAccess(orgId: string) {
  return useQuery({
    queryKey: queryKeys.accessOrg(orgId),
    queryFn: () =>
      getBrowserApi().request<Schemas["AccessDto"]>("/v1/me/access", {
        query: { orgId },
      }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useSystemAccess() {
  return useQuery({
    queryKey: queryKeys.accessSystem(),
    queryFn: () =>
      getBrowserApi().request<Schemas["SystemAccessDto"]>(
        "/v1/me/system-access"
      ),
    staleTime: 60_000,
    retry: false,
  })
}

export function useEventAccess(eventId: string) {
  return useQuery({
    queryKey: queryKeys.accessEvent(eventId),
    queryFn: () =>
      getBrowserApi().request<Schemas["AccessDto"]>("/v1/me/access", {
        query: { eventId },
      }),
    staleTime: 60_000,
    retry: false,
  })
}
