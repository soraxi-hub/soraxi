"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"

interface CategoryHeaderProps {
  categoryName: string
  subcategoryName?: string
  productCount: number
  categorySlug: string
}

export function CategoryHeader({ categoryName, subcategoryName, productCount, categorySlug }: CategoryHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/category/${categorySlug}`}>{categoryName}</BreadcrumbLink>
          </BreadcrumbItem>
          {subcategoryName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{subcategoryName}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{subcategoryName || categoryName}</h1>
          <p className="text-muted-foreground mt-2">
            {productCount} {productCount === 1 ? "product" : "products"} found
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {categoryName}
        </Badge>
      </div>
    </div>
  )
}
