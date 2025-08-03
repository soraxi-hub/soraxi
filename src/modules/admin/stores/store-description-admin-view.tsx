"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";

type Store = inferProcedureOutput<
  AppRouter["storeProfile"]["getStoreProfilePrivate"]
>;

interface StoreDescriptionProps {
  storeData: {
    name: Store["name"];
    description: Store["description"];
    createdAt: Store["createdAt"];
    uniqueId: Store["uniqueId"];
  } | null;
  loading?: boolean;
}

/**
 * StoreDescription component displays and manages store information
 * @component
 * @param {Store} store - Store data object
 * @param {boolean} [loading] - Loading state flag
 */
export default function StoreDescriptionAdminView({
  storeData,
}: StoreDescriptionProps) {
  return (
    <Card className="relative group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {storeData?.name}
              <Badge variant="outline" className="text-sm">
                {storeData?.uniqueId}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              Store Information & Description
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="prose dark:prose-invert">
          {storeData?.description ? (
            <div>{storeData.description}</div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>No store description provided</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-start border-t pt-4">
        <HoverCard>
          <HoverCardTrigger className="flex items-center gap-2 text-sm cursor-help">
            <Info className="w-4 h-4" />
            <span className="font-medium">Store Details</span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <p className="text-sm">
                This information is visible to your customers on the store page.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Store ID</span>
            <span className="font-mono text-sm">{storeData?.uniqueId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Established</span>
            <span className="text-sm">
              {storeData?.createdAt &&
                format(new Date(storeData.createdAt), "MMM dd, yyyy")}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
