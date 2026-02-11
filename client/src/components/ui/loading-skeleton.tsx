import { Skeleton } from "@/components/ui/skeleton";

export function GoalCardSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-6 w-6 rounded-full mt-1" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function GoalsPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <GoalCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AffirmationCardSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5">
      <Skeleton className="h-24 w-full mb-4" />
      <div className="flex justify-between border-t border-white/5 pt-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function AffirmationsPageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <AffirmationCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function JournalEntrySkeleton() {
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5">
      <div className="flex justify-between mb-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function JournalPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      <div className="lg:col-span-1 space-y-4">
        <Skeleton className="h-8 w-32 mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <JournalEntrySkeleton key={i} />
        ))}
      </div>
      <div className="lg:col-span-2">
        <div className="glass-panel h-full rounded-2xl p-8 border border-white/5">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export function VisionBoardCardSkeleton() {
  return (
    <div className="glass-panel aspect-video rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-end">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-5 w-5" />
      </div>
    </div>
  );
}

export function VisionBoardPageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <VisionBoardCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Skeleton className="lg:col-span-2 h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="lg:col-span-3 h-64 rounded-2xl" />
      </div>
    </div>
  );
}
