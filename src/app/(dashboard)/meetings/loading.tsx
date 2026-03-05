import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function MeetingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
