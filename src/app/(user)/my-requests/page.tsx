"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty } from "@/components/ui/empty";
import { RequestActions } from "@/modules/requests/components/request-actions";
import { Clock, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { RequestStatus } from "@/enums";
import { formatNaira } from "@/lib/utils/naira";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UserRequestsSkeleton from "@/modules/skeletons/my-request-page-skeleton";
import { NoRequests } from "@/modules/skeletons/no-user-request-skeleton";

type Output = inferProcedureOutput<
  AppRouter["demandListing"]["getUserRequests"]
>;
type Requests = Output["requests"];

const RequestRow = ({
  request,
  onDelete,
  onMarkFulfilled,
  router,
}: {
  request: Requests[number];
  onDelete: (id: string) => Promise<void>;
  onMarkFulfilled: (id: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) => (
  <Card className="p-4 hover:shadow-sm transition-shadow">
    <div className="flex items-start justify-between gap-4">
      <Link href={`/requests/${request._id}`} className="group">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-soraxi-green transition-colors truncate">
            {request.title}
          </h3>

          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {request.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            {request.category && request.category.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {request.category[0]}
              </Badge>
            )}
            {request.budgetMin || request.budgetMax ? (
              <Badge
                variant="outline"
                className="text-xs flex items-center gap-1"
              >
                {request.budgetMin && request.budgetMax
                  ? `${formatNaira(request.budgetMin)} - ${formatNaira(request.budgetMax)}`
                  : request.budgetMin
                    ? `${formatNaira(request.budgetMin)}+`
                    : `Up to ${formatNaira(request.budgetMax!)}`}
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(request.createdAt))}
          </div>
          <Badge
            variant="secondary"
            className={`mt-2 ${
              request.status === RequestStatus.Open
                ? "bg-soraxi-green/10 text-soraxi-green"
                : request.status === "fulfilled"
                  ? "bg-soraxi-green text-white"
                  : ""
            }`}
          >
            {request.status === RequestStatus.Fulfilled && (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            {request.status === RequestStatus.Expired && (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>

        <RequestActions
          requestId={request._id}
          isOwner={true}
          status={request.status}
          onEdit={() => router.push(`/requests/${request._id}/edit`)}
          onDelete={() => onDelete(request._id)}
          onMarkFulfilled={() => onMarkFulfilled(request._id)}
        />
      </div>
    </div>
  </Card>
);

export default function UserRequestsPage() {
  const trpc = useTRPC();
  const router = useRouter();

  const {
    data: userRequests,
    isLoading,
    refetch,
  } = useQuery(trpc.demandListing.getUserRequests.queryOptions());

  const onDelete = useMutation(
    trpc.demandListing.deleteRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Request deleted successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(
          "Failed to delete request: " + (error.message || "Unknown error"),
        );
      },
    }),
  );

  const onMarkFulfilled = useMutation(
    trpc.demandListing.markRequestFulfilled.mutationOptions({
      onSuccess: () => {
        toast.success("Request marked as fulfilled");
        refetch();
      },
      onError: (error) => {
        toast.error(
          "Failed to update request status: " +
            (error.message || "Unknown error"),
        );
      },
    }),
  );

  if (isLoading) {
    return <UserRequestsSkeleton />;
  }

  if (!userRequests || userRequests.requests.length === 0) {
    return <NoRequests />;
  }

  const retquests = userRequests.requests;

  const openRequests = retquests.filter((r) => r.status === RequestStatus.Open);
  const fulfilledRequests = retquests.filter(
    (r) => r.status === RequestStatus.Fulfilled,
  );
  // const expiredRequests = retquests.filter(
  //   (r) => r.status === RequestStatus.Expired,
  // );

  const handleDelete = async (id: string) => {
    await onDelete.mutateAsync({ requestId: id });
  };

  const handleMarkFulfilled = async (id: string) => {
    await onMarkFulfilled.mutateAsync({ requestId: id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container py-8 px-2 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your marketplace requests
            </p>
          </div>
          <Link href="/requests/new" className="w-full md:w-fit pt-2 md:pt-0">
            <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white gap-2 w-full">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="open">Open ({openRequests.length})</TabsTrigger>
            <TabsTrigger value="fulfilled">
              Fulfilled ({fulfilledRequests.length})
            </TabsTrigger>
            {/* <TabsTrigger value="expired">
              Expired ({expiredRequests.length})
            </TabsTrigger> */}
          </TabsList>

          <div className="mt-6">
            {/* Open Requests */}
            <TabsContent value="open" className="space-y-3">
              {openRequests.length > 0 ? (
                openRequests.map((request) => (
                  <RequestRow
                    key={request._id}
                    request={request}
                    onDelete={handleDelete}
                    onMarkFulfilled={handleMarkFulfilled}
                    router={router}
                  />
                ))
              ) : (
                <Empty title="No open requests" className="py-12" />
              )}
            </TabsContent>

            {/* Fulfilled Requests */}
            <TabsContent value="fulfilled" className="space-y-3">
              {fulfilledRequests.length > 0 ? (
                fulfilledRequests.map((request) => (
                  <RequestRow
                    key={request._id}
                    request={request}
                    onDelete={handleDelete}
                    onMarkFulfilled={handleMarkFulfilled}
                    router={router}
                  />
                ))
              ) : (
                <Empty title="No fulfilled requests" className="py-12" />
              )}
            </TabsContent>

            {/* Expired Requests */}
            {/* <TabsContent value="expired" className="space-y-3">
              {expiredRequests.length > 0 ? (
                expiredRequests.map((request) => (
                  <RequestRow
                    key={request._id}
                    request={request}
                    onDelete={handleDelete}
                    onMarkFulfilled={handleMarkFulfilled}
                    router={router}
                  />
                ))
              ) : (
                <Empty title="No expired requests" className="py-12" />
              )}
            </TabsContent> */}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
