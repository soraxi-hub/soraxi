import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  categoryEntryHref,
  helpCenterCategories,
} from "@/lib/utils/mdx-utils/help-center-data";
import { Store, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function DocumentationHome() {
  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <section className="py-4 pt-10 sm:pt-0">
        <div className="mx-auto px-4 text-center max-w-5xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Soraxi Documentation
          </h1>

          <p className="text-xl lg:text-2xl text-foreground/70 mb-8 leading-relaxed max-w-5xl mx-auto">
            Everything you need to know about using Soraxi. From creating your
            account to building a successful business, we've got you covered
            with comprehensive guides.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/docs/storefront/vendor-waitlist">
              <Button
                size="lg"
                className="gap-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white"
              >
                <Store className="w-4 h-4" />
                I want to sell
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/docs/protection/how-escrow-works">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-soraxi-green text-soraxi-green dark:text-white hover:text-soraxi-green-hover"
              >
                <ShieldCheck className="w-4 h-4" />
                How you're protected
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Documentation Categories */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Documentation Categories
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              Explore our comprehensive documentation organized by topics and
              features
            </p>
          </div>

          {/*
            Cards are derived from `helpCenterCategories` — the same list the
            sidebar and the route's static params read. Adding a category is one
            edit, and this page cannot drift out of step with the nav.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {helpCenterCategories.map((category) => {
              const CategoryIcon = category.card.icon;

              return (
                <Link key={category.id} href={categoryEntryHref(category)}>
                  <Card
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all duration-300 h-full group",
                      "hover:border-soraxi-green border border-transparent"
                    )}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-xl bg-soraxi-green/15">
                          <CategoryIcon className="w-6 h-6 text-soraxi-green" />
                        </div>
                        {category.card.popular && (
                          <Badge className="bg-soraxi-green/10 text-soraxi-green border-soraxi-green/20">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl group-hover:text-soraxi-green transition-colors">
                        {category.card.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {category.card.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.pages.map((page) => (
                          <li
                            key={page.id}
                            className="flex items-center text-sm text-foreground/70"
                          >
                            <CheckCircle2 className="w-4 h-4 text-soraxi-green mr-2" />
                            {page.title}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          className="w-full justify-between group-hover:text-soraxi-green hover:text-soraxi-green-hover"
                        >
                          Explore Guide
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
