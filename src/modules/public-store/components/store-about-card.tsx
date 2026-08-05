import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreAboutCardProps {
  description: string;
}

/**
 * "About this store" — the vendor's own description.
 *
 * Renders nothing when there's no description rather than showing an empty-state
 * placeholder: on a public storefront a shopper gains nothing from being told
 * the vendor hasn't written a blurb.
 */
export function StoreAboutCard({ description }: StoreAboutCardProps) {
  if (!description.trim()) return null;

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg">About this store</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
