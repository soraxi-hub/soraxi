import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface OrderHeaderProps {
  reference: string;
  createdAt: Date | string;
  storesCount: number;
  formattedTotalAmount: string;
}

export function OrderHeader({
  reference,
  createdAt,
  formattedTotalAmount,
}: OrderHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <h1 className="text-xl font-bold break-words sm:text-2xl">
          Order <span className="font-mono">{reference}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed{" "}
          {new Date(createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {formattedTotalAmount}
        </p>
      </div>

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList className="text-xs sm:text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/orders">Orders</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{reference}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
