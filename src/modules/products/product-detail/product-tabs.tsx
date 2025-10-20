"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const renderRichText = (content: string) => {
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

interface ProductTabsProps {
  description: string;
  specifications: string;
  productId: string;
}

export function ProductTabs({
  description,
  specifications,
  productId,
}: ProductTabsProps) {
  const trpc = useTRPC();

  const { data: reviews, isLoading } = useQuery(
    trpc.productReview.getReviewsByProductId.queryOptions({ productId })
  );

  const totalReviews = reviews?.length || 0;
  const averageRating =
    totalReviews > 0
      ? (reviews?.reduce((sum, review) => sum + review.rating, 0) || 0) /
        totalReviews
      : 0;

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews?.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating as keyof typeof ratingCounts]++;
    }
  });

  return (
    <Tabs defaultValue="description" className="">
      <TabsList className="w-full border-none p-0 rounded-none h-auto">
        <TabsTrigger
          value="description"
          className="w-fit border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3"
        >
          Description
        </TabsTrigger>
        <TabsTrigger
          value="specifications"
          className="w-fit border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3"
        >
          Specifications
        </TabsTrigger>
        <TabsTrigger
          value="reviews"
          className="w-fit border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3"
        >
          Reviews ({totalReviews})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-6">
        {description ? (
          renderRichText(description)
        ) : (
          <p className="text-gray-500">
            No description available for this product.
          </p>
        )}
      </TabsContent>

      <TabsContent value="specifications" className="mt-6">
        {specifications ? (
          renderRichText(specifications)
        ) : (
          <p className="text-gray-500">
            No specifications available for this product.
          </p>
        )}
      </TabsContent>

      <TabsContent value="reviews" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Rating Summary & Breakdown */}
          <div className="md:col-span-1">
            <Card className="p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-2xl font-bold">
                  Customer Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${
                          i < Math.round(averageRating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {averageRating.toFixed(1)} out of 5
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Based on {totalReviews} reviews
                </p>

                {/* Rating Breakdown */}
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div
                      key={rating}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-4 font-medium text-gray-700 dark:text-gray-300">
                        {rating}★
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-yellow-400 h-2.5 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${
                              totalReviews > 0
                                ? (ratingCounts[
                                    rating as keyof typeof ratingCounts
                                  ] /
                                    totalReviews) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-600 dark:text-gray-400">
                        {ratingCounts[rating as keyof typeof ratingCounts]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Reviews List */}
          <div className="md:col-span-2 space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-32" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-11/12" />
                </Card>
              ))
            ) : totalReviews === 0 ? (
              <Card className="p-8 text-center col-span-full">
                <div className="w-24 h-24 bg-soraxi-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-12 h-12 text-soraxi-green" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
              </Card>
            ) : (
              reviews?.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full sm:flex items-center justify-center text-gray-600 dark:bg-gray-800 dark:text-gray-300 hidden">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="sm:flex-row flex flex-col sm:items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {review.user}
                          </span>
                          {review.verified && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            >
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {review.date}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {review.comment}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
