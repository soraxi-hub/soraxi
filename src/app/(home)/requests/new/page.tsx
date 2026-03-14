"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestForm } from "@/modules/requests/components/request-form";
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

export default function NewRequestPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useMutation(
    trpc.demandListing.createRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success("Request created successfully");
        router.push(`/requests/${data.request._id}`);
      },
      onError: (error) => {
        toast.error("Failed to create request: " + error.message);
      },
    }),
  );

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
  }) => {
    setIsSubmitting(true);
    try {
      await onSubmit.mutateAsync(data);
    } catch (error) {
      console.error("Failed to create request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto py-8 px-6 md:px-8">
        {/* Back Button */}
        <Link href="/requests">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Button>
        </Link>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Post a New Request
            </h1>
            <p className="text-muted-foreground mt-2">
              Tell the community what you're looking for
            </p>
          </div>

          <Card className="p-4 lg:p-8">
            <RequestForm
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              submitLabel="Post Request"
            />
          </Card>

          {/* Tips */}
          <Card className="bg-soraxi-green/5 border-soraxi-green/20 p-6">
            <h3 className="font-semibold text-foreground mb-3">
              Tips for a great request:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-soraxi-green">✓</span>
                <span>Be specific about what you're looking for</span>
              </li>
              <li className="flex gap-2">
                <span className="text-soraxi-green">✓</span>
                <span>Include your budget range to get relevant offers</span>
              </li>
              <li className="flex gap-2">
                <span className="text-soraxi-green">✓</span>
                <span>Select relevant categories to increase visibility</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
