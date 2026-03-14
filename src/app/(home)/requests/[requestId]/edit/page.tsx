"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestForm } from "@/modules/requests/components/request-form";
import { ArrowLeft } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { EditRequestSkeleton } from "@/modules/skeletons/edit-request-skeleton";
import { EditRequestNotFound } from "@/modules/requests/components/edit-request-not-found";

export default function EditRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const router = useRouter();
  const awaitedParams = use(params);
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: requests, isLoading } = useQuery(
    trpc.demandListing.getRequestById.queryOptions({
      requestId: awaitedParams.requestId,
    }),
  );

  const onSubmit = useMutation(
    trpc.demandListing.updateRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success("Request updated successfully");
        router.push(`/requests/${data.request._id.toString()}`);
      },
      onError: (error) => {
        toast.error("Failed to update request: " + error.message);
      },
    }),
  );

  if (isLoading) return <EditRequestSkeleton />;

  if (!requests || !requests.request) return <EditRequestNotFound />;

  const request = requests.request;

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
  }) => {
    setIsSubmitting(true);
    try {
      await onSubmit.mutateAsync({
        ...data,
        requestId: awaitedParams.requestId,
      });

      // Redirect to request detail page
      router.push(`/requests/${awaitedParams.requestId}`);
    } catch (error) {
      console.error("Failed to update request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto py-8 px-6 md:px-8">
        {/* Back Button */}
        <Link href={`/requests/${awaitedParams.requestId}`}>
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Request
          </Button>
        </Link>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Edit Your Request
            </h1>
            <p className="text-muted-foreground mt-2">
              Update your request details
            </p>
          </div>

          <Card className="p-8">
            <RequestForm
              initialData={{
                title: request.title,
                description: request.description,
                category: request.category,
                budgetMin: request.budgetMin,
                budgetMax: request.budgetMax,
              }}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              submitLabel="Update Request"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
