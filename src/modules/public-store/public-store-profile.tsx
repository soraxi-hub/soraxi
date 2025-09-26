"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Users, Package, Share2, Star, Calendar, Store, CheckCircle2, Heart, MapPin } from "lucide-react"
import { useState } from "react"
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

interface PublicStoreProfileProps {
  storeId: string
}

export function PublicStoreProfile({ storeId }: PublicStoreProfileProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const trpc = useTRPC()
  const { data: store } = useSuspenseQuery(trpc.publicStore.getStoreProfilePublic.queryOptions({ storeId }))

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}/brand/${store._id}`
    navigator.clipboard.writeText(storeUrl)
    setIsCopied(true)
    toast.success("Store link copied to clipboard!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleFollowStore = () => {
    setIsFollowing(!isFollowing)
    toast.success(isFollowing ? "Unfollowed store" : "Following store!")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {/* Banner Image */}
        <div className="h-64 md:h-80 bg-gradient-to-br from-primary/10 via-background to-muted/20 relative overflow-hidden">
          {store.bannerUrl ? (
            <Image
              src={store.bannerUrl || "/placeholder.svg"}
              alt={`${store.name} banner`}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-muted/10" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Store Info Overlay */}
        <div className="relative -mt-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="backdrop-blur-sm bg-background/95 border shadow-xl">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Store Logo */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted border-4 border-background shadow-lg overflow-hidden">
                    {store.logoUrl ? (
                      <Image
                        src={store.logoUrl || "/placeholder.svg"}
                        alt={`${store.name} logo`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Store Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">{store.name}</h1>
                    {store.verification.isVerified && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Store
                      </Badge>
                    )}
                  </div>

                  {/* Store Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {store.stats.followersCount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {store.stats.productsCount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold text-foreground">
                          {store.ratings.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">{store.ratings.reviewCount} reviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{store.stats.establishedDate}</div>
                      <div className="text-sm text-muted-foreground">Established</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleFollowStore} variant={isFollowing ? "outline" : "default"} className="gap-2">
                    <Heart className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`} />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline" onClick={handleShareStore} className="gap-2 bg-transparent">
                    <Share2 className="w-4 h-4" />
                    {isCopied ? "Copied!" : "Share"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            {store.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">About {store.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-neutral dark:prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed text-lg">{store.description}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-serif flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Our Products
                  </CardTitle>
                  <Badge variant="secondary">
                    {store.products.length} {store.products.length === 1 ? "item" : "items"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {store.products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                    <p className="text-muted-foreground">This store is still setting up their product catalog.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {store.products.map((product) => (
                      <Link key={product._id} href={`/products/${product.slug}`} className="group">
                        <Card className="overflow-hidden transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                          <div className="aspect-square relative overflow-hidden bg-muted">
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0] || "/placeholder.svg"}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Package className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{product.name}</h3>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">₦{product.price.toLocaleString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Store Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Established</div>
                    <div className="font-medium">{store.stats.establishedDate}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                    <div className="font-medium">{store.stats.followersCount.toLocaleString()}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Products</div>
                    <div className="font-medium">{store.stats.productsCount.toLocaleString()}</div>
                  </div>
                </div>
                {store.ratings.reviewCount > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Rating</div>
                        <div className="font-medium flex items-center gap-1">
                          {store.ratings.averageRating.toFixed(1)}
                          <span className="text-sm text-muted-foreground">({store.ratings.reviewCount} reviews)</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleFollowStore}
                  variant={isFollowing ? "outline" : "default"}
                  className="w-full justify-start gap-2"
                >
                  <Heart className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`} />
                  {isFollowing ? "Following" : "Follow Store"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareStore}
                  className="w-full justify-start gap-2 bg-transparent"
                >
                  <Share2 className="w-4 h-4" />
                  Share Store
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" asChild>
                  <Link href={`/stores/${store._id}/contact`}>
                    <MapPin className="w-4 h-4" />
                    Contact Store
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
