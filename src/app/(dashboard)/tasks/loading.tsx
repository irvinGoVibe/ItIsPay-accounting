import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-28 mt-2" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-80 rounded-lg" />
      <div className="space-y-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
