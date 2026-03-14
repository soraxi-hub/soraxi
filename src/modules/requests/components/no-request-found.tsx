import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Plus } from "lucide-react";

export function NoRequestsFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Empty className="py-12">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          No requests found
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
          Looks like there are no marketplace requests matching your search or
          filters. Be the first to post a request!
        </p>

        <Link href="/requests/new">
          <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white gap-2">
            <Plus className="w-4 h-4" />
            Post a Request
          </Button>
        </Link>
      </Empty>
    </div>
  );
}
