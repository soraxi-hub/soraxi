"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Search,
  Star,
  ShoppingCart,
  Award,
  Zap,
  Shield,
  Truck,
  ArrowRight,
  Grid3X3,
  List,
} from "lucide-react";
import Link from "next/link";

/**
 * Modern Homepage Component
 * Showcases approved products with banners, categories, and features
 */

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string[];
  subCategory: string[];
  rating: number;
  storeID: string;
  storeName: string;
  slug: string;
  isVerifiedProduct: boolean;
  formattedPrice: string;
}

interface Category {
  name: string;
  icon: string;
  count: number;
  image: string;
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadHomePageData();
  }, []);

  const loadHomePageData = async () => {
    try {
      setLoading(true);

      // Load featured products (high-rated, verified products)
      const featuredResponse = await fetch("/api/products/featured");
      const featuredData = await featuredResponse.json();

      // Load all products
      const productsResponse = await fetch(
        "/api/products?limit=20&verified=true"
      );
      const productsData = await productsResponse.json();

      // Load categories
      const categoriesResponse = await fetch("/api/categories");
      const categoriesData = await categoriesResponse.json();

      if (featuredData.success) setFeaturedProducts(featuredData.products);
      if (productsData.success) setProducts(productsData.products);
      if (categoriesData.success) setCategories(categoriesData.categories);
    } catch (error) {
      console.error("Error loading homepage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.some((cat) =>
        cat.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || product.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={product.images[0] || "/placeholder.svg?height=200&width=300"}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.isVerifiedProduct && (
          <Badge className="absolute top-2 left-2 bg-soraxi-green text-white">
            <Shield className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
        <Button
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {renderStars(product.rating)}
            </div>
            <span className="text-sm text-muted-foreground">
              ({product.rating})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-soraxi-green">
              {product.formattedPrice}
            </span>
            <Badge variant="outline">{product.category[0]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            by {product.storeName}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-soraxi-green to-soraxi-green/80 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-tight">
                Discover Amazing Products from Verified Stores
              </h1>
              <p className="text-xl opacity-90">
                Shop with confidence from our curated marketplace of trusted
                sellers offering quality products at great prices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-soraxi-green"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Start Shopping
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-soraxi-green"
                >
                  Become a Seller
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src="/placeholder.svg?height=400&width=500"
                alt="Shopping illustration"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-soraxi-green" />
              </div>
              <h3 className="font-semibold text-lg">Verified Sellers</h3>
              <p className="text-muted-foreground">
                All our sellers are verified and trusted
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
                <Truck className="w-8 h-8 text-soraxi-green" />
              </div>
              <h3 className="font-semibold text-lg">Fast Delivery</h3>
              <p className="text-muted-foreground">
                Quick and reliable shipping nationwide
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-soraxi-green" />
              </div>
              <h3 className="font-semibold text-lg">Quality Guaranteed</h3>
              <p className="text-muted-foreground">
                Premium products with quality assurance
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-soraxi-green" />
              </div>
              <h3 className="font-semibold text-lg">24/7 Support</h3>
              <p className="text-muted-foreground">
                Round-the-clock customer support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Featured Products
              </h2>
              <p className="text-muted-foreground mt-2">
                Handpicked products from our top-rated sellers
              </p>
            </div>
            <Button variant="outline">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {featuredProducts.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Link href={`/products/${product.slug}`}>
                    <ProductCard product={product} />
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Shop by Category
            </h2>
            <p className="text-muted-foreground mt-2">
              Explore our wide range of product categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <Card
                key={category.name}
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-soraxi-green/20 transition-colors">
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.count} products
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground">All Products</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              }`}
            >
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <ProductCard product={product} />
                </Link>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-soraxi-green text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-xl opacity-90 mb-8">
            Get the latest deals and new product announcements
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              placeholder="Enter your email"
              className="bg-white text-black"
            />
            <Button variant="secondary" className="text-soraxi-green">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
