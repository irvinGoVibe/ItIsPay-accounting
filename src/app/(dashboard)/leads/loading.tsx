import { Card } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-9 w-96 rounded-lg" />
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <Card>
        <TableSkeleton rows={8} />
      </Card>
    </div>
  );
}
