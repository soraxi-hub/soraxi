import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Plus } from "lucide-react";

export function NoRequests() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Empty className="py-12">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          You have no requests yet
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Create a request to let sellers know what you’re looking for.
        </p>

        <Link href="/requests/new">
          <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </Empty>
    </div>
  );
}
