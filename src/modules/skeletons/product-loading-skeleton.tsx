import { Card, CardContent } from "@/components/ui/card";

function ProductLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="animate-pulse p-0">
          <div className="h-48 bg-muted rounded-t-lg" />
          <CardContent className="p-4 space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ProductLoadingSkeleton;
