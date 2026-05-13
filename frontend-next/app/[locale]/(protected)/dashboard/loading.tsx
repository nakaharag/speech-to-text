import { SkeletonStats, SkeletonHistoryItem } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <SkeletonStats />

      <div className="space-y-4">
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
      </div>
    </div>
  );
}
