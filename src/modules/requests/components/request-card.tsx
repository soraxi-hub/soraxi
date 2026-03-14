"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface RequestCardProps {
  _id: string;
  title: string;
  description?: string;
  category?: string[];
  budgetMin?: number;
  budgetMax?: number;
  createdAt: Date;
  status: "open" | "fulfilled" | "expired";
}

export function RequestCard({
  _id,
  title,
  description,
  category,
  budgetMin,
  budgetMax,
  createdAt,
  status,
}: RequestCardProps) {
  const isActive = status === "open";

  return (
    <Link href={`/requests/${_id}`}>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 border-l-transparent hover:border-l-soraxi-green">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            {isActive && (
              <div className="ml-3 flex-shrink-0">
                <Badge
                  variant="secondary"
                  className="bg-soraxi-green/10 text-soraxi-green hover:bg-soraxi-green/15"
                >
                  Open
                </Badge>
              </div>
            )}
            {status === "fulfilled" && (
              <div className="ml-3 flex-shrink-0">
                <Badge variant="secondary" className="bg-green-100/50">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Fulfilled
                </Badge>
              </div>
            )}
            {status === "expired" && (
              <div className="ml-3 flex-shrink-0">
                <Badge variant="outline">Expired</Badge>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            {category && category.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {category[0]}
              </Badge>
            )}
            {budgetMin || budgetMax ? (
              <Badge
                variant="outline"
                className="text-xs flex items-center gap-1"
              >
                <DollarSign className="w-3 h-3" />
                {budgetMin && budgetMax
                  ? `₦${(budgetMin / 100).toLocaleString()}-${(budgetMax / 100).toLocaleString()}`
                  : budgetMin
                    ? `₦${(budgetMin / 100).toLocaleString()}+`
                    : `Up to ₦${(budgetMax! / 100).toLocaleString()}`}
              </Badge>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-soraxi-green transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
