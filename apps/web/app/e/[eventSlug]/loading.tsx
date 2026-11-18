import { Skeleton } from "@workspace/ui/components/skeleton"

export default function PublicEventLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 pb-16">
      <Skeleton className="h-52 w-full rounded-2xl sm:h-64" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
