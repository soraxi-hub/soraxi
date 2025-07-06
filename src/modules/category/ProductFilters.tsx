"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface FilterOptions {
  priceRange: [number, number]
  inStock: boolean
  ratings: number[]
  brands: string[]
}

interface ProductFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableBrands: string[]
  maxPrice: number
}

export function ProductFilters({ filters, onFiltersChange, availableBrands, maxPrice }: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handlePriceChange = (value: number[]) => {
    const newFilters = { ...localFilters, priceRange: [value[0], value[1]] as [number, number] }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleStockChange = (checked: boolean) => {
    const newFilters = { ...localFilters, inStock: checked }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleRatingChange = (rating: number, checked: boolean) => {
    const newRatings = checked ? [...localFilters.ratings, rating] : localFilters.ratings.filter((r) => r !== rating)
    const newFilters = { ...localFilters, ratings: newRatings }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleBrandChange = (brand: string, checked: boolean) => {
    const newBrands = checked ? [...localFilters.brands, brand] : localFilters.brands.filter((b) => b !== brand)
    const newFilters = { ...localFilters, brands: newBrands }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      priceRange: [0, maxPrice] as [number, number],
      inStock: false,
      ratings: [],
      brands: [],
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const activeFiltersCount =
    (localFilters.inStock ? 1 : 0) +
    localFilters.ratings.length +
    localFilters.brands.length +
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < maxPrice ? 1 : 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {localFilters.inStock && (
            <Badge variant="secondary" className="flex items-center gap-1">
              In Stock
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleStockChange(false)} />
            </Badge>
          )}
          {localFilters.ratings.map((rating) => (
            <Badge key={rating} variant="secondary" className="flex items-center gap-1">
              {rating}+ Stars
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleRatingChange(rating, false)} />
            </Badge>
          ))}
          {localFilters.brands.map((brand) => (
            <Badge key={brand} variant="secondary" className="flex items-center gap-1">
              {brand}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleBrandChange(brand, false)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Price Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={localFilters.priceRange}
            onValueChange={handlePriceChange}
            max={maxPrice}
            step={100}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>₦{localFilters.priceRange[0].toLocaleString()}</span>
            <span>₦{localFilters.priceRange[1].toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox id="in-stock" checked={localFilters.inStock} onCheckedChange={handleStockChange} />
            <Label htmlFor="in-stock">In Stock Only</Label>
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={localFilters.ratings.includes(rating)}
                onCheckedChange={(checked) => handleRatingChange(rating, checked as boolean)}
              />
              <Label htmlFor={`rating-${rating}`} className="flex items-center">
                {rating}+ Stars
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Brands */}
      {availableBrands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableBrands.slice(0, 8).map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={localFilters.brands.includes(brand)}
                  onCheckedChange={(checked) => handleBrandChange(brand, checked as boolean)}
                />
                <Label htmlFor={`brand-${brand}`}>{brand}</Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
