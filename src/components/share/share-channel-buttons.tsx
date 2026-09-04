"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildShareLinks } from "@/lib/utils/share-links";
import { FacebookIcon, WhatsappIcon, XIcon } from "@/components/icons";

interface ShareChannelButtonsProps {
  /** The absolute URL being shared. */
  url: string;
  /** Pre-filled message for WhatsApp and X. */
  text: string;
  className?: string;
}

/**
 * A row of one-tap share actions: WhatsApp, X, Facebook, and copy-link.
 *
 * Each channel is a plain outbound `<a>` — opening a share intent, not this
 * app's own share sheet — so there is nothing to wire up beyond the link
 * itself, and it works identically with JS disabled.
 */
export function ShareChannelButtons({
  url,
  text,
  className,
}: ShareChannelButtonsProps) {
  const links = buildShareLinks({ url, text });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      // Clipboard access is denied in some mobile browsers and on non-secure
      // origins; failing silently would look like a broken button.
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        className="hover:border-soraxi-green hover:text-soraxi-green"
        asChild
      >
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
        >
          <WhatsappIcon className="size-4" />
        </a>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="hover:border-soraxi-green hover:text-soraxi-green"
        asChild
      >
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
        >
          <XIcon className="size-4" />
        </a>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="hover:border-soraxi-green hover:text-soraxi-green"
        asChild
      >
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
        >
          <FacebookIcon className="size-4" />
        </a>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="hover:border-soraxi-green hover:text-soraxi-green"
        onClick={handleCopyLink}
        aria-label="Copy link"
        type="button"
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
