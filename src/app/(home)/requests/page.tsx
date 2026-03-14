"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RequestCard } from "@/modules/requests/components/request-card";
import { RequestFilters } from "@/modules/requests/components/filters";
import { Search, Plus, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { NoRequestsFound } from "@/modules/requests/components/no-request-found";
import { RequestsPageSkeleton } from "@/modules/skeletons/requests-page-skeleton";
import { siteConfig } from "@/config/site";

export default function RequestsPage() {
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: demandListing, isLoading: listingsLoading } = useQuery(
    trpc.demandListing.getAllRequests.queryOptions({ limit: 12 }),
  );

  if (listingsLoading) {
    return <RequestsPageSkeleton count={6} />;
  }

  const listings = demandListing?.requests || [];

  // Filter requests
  const filteredRequests = listings.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      (request.category &&
        request.category.some((cat) => selectedCategories.includes(cat)));

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto py-8 space-y-8 px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {siteConfig.name} Marketplace
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover what others are looking for
            </p>
          </div>
          <Link href="/requests/new" className="w-full md:w-fit pt-2 md:pt-0">
            <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white gap-2 w-full">
              <Plus className="w-4 h-4" />
              Post a Request
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <RequestFilters
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
              />
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-11"
              />
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-soraxi-green" />
                <p className="text-sm text-muted-foreground">
                  {filteredRequests.length} requests found
                </p>
              </div>
            </div>

            {/* Requests Grid */}
            {paginatedRequests.length > 0 ? (
              <div className="space-y-1">
                {paginatedRequests.map((request) => (
                  <div key={request._id}>
                    <RequestCard key={request._id} {...request} />
                  </div>
                ))}
              </div>
            ) : (
              <NoRequestsFound />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
