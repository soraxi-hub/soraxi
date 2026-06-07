import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

interface EvidenceGalleryProps {
  evidence: string[];
  title: string;
  description?: string;
}

/**
 * Evidence Gallery - Clean display of submitted evidence images
 * Supports lightbox preview on click
 */
export function EvidenceGallery({
  evidence,
  title,
  description,
}: EvidenceGalleryProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <ImageIcon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">No evidence submitted</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {evidence.map((url, index) => (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded border border-border bg-muted hover:border-foreground/50 transition-colors group overflow-hidden"
            >
              <img
                src={url}
                alt={`Evidence ${index + 1}`}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
