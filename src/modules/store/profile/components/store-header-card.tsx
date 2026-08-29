"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SoraxiCard, SoraxiCardContent } from "@/components/ui/soraxi-card";
import { cn } from "@/lib/utils";

import { pageCardLg } from "../../components/page-card.styles";
import { statusBadgeClass, type StoreStatusView } from "../store-status";

interface StoreHeaderCardProps {
  storeName: string;
  initials: string;
  institution?: string;
  publicUrl: string;
  status: StoreStatusView;
  onEditName: () => void;
}

const TONE_ICON = {
  live: BadgeCheck,
  pending: Clock,
  suspended: ShieldAlert,
} as const;

export function StoreHeaderCard({
  storeName,
  initials,
  institution,
  publicUrl,
  status,
  onEditName,
}: StoreHeaderCardProps) {
  const [copied, setCopied] = useState(false);
  const StatusIcon = TONE_ICON[status.tone];

  const handleCopy = async () => {
    try {
      const absoluteUrl = new URL(publicUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Copy the link from your browser's address bar.");
    }
  };

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar className="size-12 shrink-0">
              <AvatarFallback className="bg-soraxi-green text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold break-words sm:text-2xl">
                  {storeName}
                </h1>
                <button
                  type="button"
                  onClick={onEditName}
                  aria-label="Edit store name"
                  className="text-muted-foreground transition-colors hover:text-soraxi-green"
                >
                  <Pencil className="size-4" />
                </button>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
                    statusBadgeClass[status.tone],
                  )}
                >
                  <StatusIcon className="size-3" aria-hidden />
                  {status.label}
                </span>

                {institution && (
                  <span className="text-sm text-muted-foreground">
                    {institution}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                View public page
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-muted-foreground"
            >
              {copied ? (
                <Check className="size-3.5 text-soraxi-green" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}
