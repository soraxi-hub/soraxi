import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { format } from "date-fns";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ProductsOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;

type OrderTimelineProps = {
  subOrder: ProductsOutput["subOrders"][number];
};

export function OrderTimeline({ subOrder }: OrderTimelineProps) {
  const isMobile = useIsMobile();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full rounded bg-muted border-soraxi-green/15 hover:bg-transparent hover:text-soraxi-green dark:hover:text-white"
        >
          Order Timeline
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(isMobile && "h-3/4")}
      >
        {/* Order Timeline */}
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle
              className={cn(
                "flex items-center gap-2",
                isMobile && "justify-center text-xl"
              )}
            >
              <Calendar className="h-5 w-5" />
              Order Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ScrollArea className="h-[100vh] pr-2">
                <div className="flex flex-col gap-3">
                  {subOrder.statusHistory &&
                  subOrder.statusHistory.length > 0 ? (
                    subOrder.statusHistory.map((statusItem, statusIndex) => (
                      <div
                        key={statusIndex}
                        className="flex items-center gap-3"
                      >
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="font-medium">{statusItem.status}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(statusItem.timestamp),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </p>
                          {statusItem.notes && (
                            <p className="text-sm text-muted-foreground">
                              Notes: {statusItem.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No status history available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </SheetContent>
    </Sheet>
  );
}
