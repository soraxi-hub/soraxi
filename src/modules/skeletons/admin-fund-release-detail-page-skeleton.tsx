/**
 * Loading skeleton for detail page
 */
export function DetailPageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
