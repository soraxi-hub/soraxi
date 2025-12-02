/**
 * Loading skeleton for fund releases list
 */
export function FundReleasesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
