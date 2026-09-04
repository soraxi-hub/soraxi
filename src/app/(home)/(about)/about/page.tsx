import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Users,
  Shield,
  Zap,
  Heart,
  TrendingUp,
  Award,
  CheckCircle,
  Star,
  Target,
  Lightbulb,
  Handshake,
} from "lucide-react";
import Image from "next/image";
import { AnimatedCounter } from "@/modules/store/components/animated-counter";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${siteConfig.name}, the campus marketplace connecting Nigerian university students with trusted vendors for fashion, gadgets, school supplies, and more.`,
};

export default function AboutPage() {
  const stats = [
    { label: "Active Stores", value: 50, icon: ShoppingBag },
    { label: "Happy Customers", value: 1000, icon: Users },
    { label: "Products Listed", value: 2000, icon: TrendingUp },
  ];

  const values = [
    {
      icon: Shield,
      title: "Trust & Security",
      description:
        "We are committed to safeguarding every transaction on our platform, giving both buyers and sellers the confidence to trade without fear.",
    },
    {
      icon: Handshake,
      title: "Empowerment",
      description:
        "Our platform is designed to unlock opportunities for entrepreneurs, helping small and growing businesses succeed in the digital economy.",
    },
    {
      icon: Heart,
      title: "Customer First",
      description:
        "We place people at the center of everything we do, building solutions that serve the real needs of our customers and partners.",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description:
        "We are constantly improving, introducing smarter tools and features that make online commerce easier, safer, and more rewarding.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-10 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="px-4 mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Redefining Campus Commerce,
              <span className="text-primary block">Starting with UNICAL</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              At <strong>{siteConfig.name}</strong>, we are creating a trusted
              marketplace that connects students, entrepreneurs, and small
              businesses within the university community. Our goal is simple:
              make it easier for students to access what they need while
              equipping vendors with the digital tools to grow their businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="px-4 mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={cn(
                  "text-center space-y-3",
                  index === stats.length - 1 && "col-span-2 md:col-span-1",
                )}
              >
                <div className="mx-auto w-12 h-12 bg-soraxi-green/10 rounded-full flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-soraxi-green" />
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-10 px-4">
        <div className="px-4 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit">
                  Our Story
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Born on Campus,
                  <span className="text-primary block">
                    Built for the Future
                  </span>
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong>{siteConfig.name}</strong> started as a simple idea
                  within the University of Calabar: how can students buy and
                  sell the things they need without stress, inflated prices, or
                  trust issues?
                </p>
                <p>
                  What began as a campus-based marketplace has grown into a
                  platform designed to empower entrepreneurs, student vendors,
                  and small businesses. We believe that everyone — from the
                  first-time seller to the growing brand — deserves access to
                  digital tools that make commerce easier, safer, and more
                  rewarding.
                </p>
                <p>
                  While our roots are in UNICAL, our vision extends far beyond
                  one campus. We&#39;re building the foundation for a
                  marketplace that will scale across Nigeria — connecting
                  communities, creating opportunities, and making online trade
                  accessible to all.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-soraxi-green" />
                  <span className="text-sm font-medium">
                    Trusted by Students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">
                    Community-First Approach
                  </span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                <Image
                  src="/soraxi.jpg"
                  alt="Our team working together"
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-background border border-soraxi-green/20 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-soraxi-green/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-soraxi-green" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      Expanding Vision
                    </div>
                    <div className="text-xs text-muted-foreground">
                      From UNICAL → Across Nigeria
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-10 px-4 bg-muted/30">
        <div className="px-4 mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="w-fit mx-auto">
              Our Values
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              What Drives Us Forward
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our core values guide every decision we make and every feature we
              build, ensuring we stay true to our mission of empowering
              commerce.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card
                key={index}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-soraxi-green/10 rounded-full flex items-center justify-center">
                    <value.icon className="h-6 w-6 text-soraxi-green" />
                  </div>
                  <h3 className="font-semibold text-lg">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-10 px-4">
        <div className="px-4 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Mission */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-soraxi-green/10 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-soraxi-green" />
                  </div>
                  <h3 className="text-2xl font-bold">Our Mission</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To transform campus commerce within Nigerian universities by
                  providing students, entrepreneurs, and small businesses a
                  secure, user-friendly platform to buy and sell with
                  confidence. We aim to make commerce within campuses seamless,
                  affordable, and trustworthy while still being accessible to
                  the wider Nigerian public.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-soraxi-green" />
                    <span className="text-sm">
                      Tailored for campus communities
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-soraxi-green" />
                    <span className="text-sm">
                      Secure and reliable payment processing
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-soraxi-green" />
                    <span className="text-sm">
                      Supporting students and small businesses
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vision */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-soraxi-green/10 rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-soraxi-green" />
                  </div>
                  <h3 className="text-2xl font-bold">Our Vision</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To emerge as the leading university-centered e-commerce
                  platform in Nigeria—where students and entrepreneurs thrive,
                  and where the public can confidently connect with
                  campus-driven businesses and innovations.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      Leadership in Nigeria’s university commerce space
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      Driving innovation in student and youth entrepreneurship
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      Creating sustainable economic opportunities for the next
                      generation
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
