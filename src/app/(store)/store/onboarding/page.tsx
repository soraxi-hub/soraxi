"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import {
  CheckCircleIcon,
  Headset,
  LayoutGridIcon,
  ShieldCheck,
  ShieldIcon,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AnimatedCounter } from "@/modules/store/components/animated-counter";
import SellerTestimonials from "@/modules/store/components/seller-testimonials";
import { siteConfig } from "@/config/site";
import Link from "next/link";

function BenefitCard({ icon, title, description }: any) {
  return (
    <Card className="shadow-sm border border-soraxi-green/20 hover:border-soraxi-green-hover/40 transition-colors">
      <CardHeader>{icon}</CardHeader>
      <CardContent>
        <CardTitle className="text-lg font-semibold mb-2">{title}</CardTitle>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function StoreOnboardingLandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="text-center py-10">
        <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
          <span className="bg-clip-text text-soraxi-green">
            {`Start Selling on and off Campus with ${siteConfig.name}`}
          </span>
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          {siteConfig.name} helps students, entrepreneurs, and small business
          owners launch and manage online storefronts, reach more buyers, and
          grow their hustle — on and off campus.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            asChild
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white border border-soraxi-green"
          >
            <Link href={`/store/create`}>Create Your Store Now</Link>
          </Button>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-10">
        <BenefitCard
          icon={
            <p className="h-8 w-8 font-semibold text-3xl text-soraxi-green">
              ₦
            </p>
          }
          title="Earn on Your Own Terms"
          description="List what you already sell and reach more customers without building a full website or app."
        />
        <BenefitCard
          icon={<Users className="h-8 w-8 text-soraxi-green" />}
          title="Sell to Students Near You"
          description="Buyers can find your store, order online, and connect with you from within their campus or nearby."
        />
        <BenefitCard
          icon={<TrendingUp className="h-8 w-8 text-soraxi-green" />}
          title="Tools Made for Small Hustles"
          description="Track orders, update products, and grow your store with simple tools built for student vendors."
        />
        <BenefitCard
          icon={<ShieldCheck className="h-8 w-8 text-soraxi-green" />}
          title="Protected Payments"
          description="We hold customer payments securely until you confirm delivery, so everyone is protected."
        />
        <BenefitCard
          icon={<Headset className="h-8 w-8 text-soraxi-green" />}
          title="We’ve Got Your Back"
          description="Get support from real humans when you need help — whether you’re just starting or stuck."
        />
        <BenefitCard
          icon={<Truck className="h-8 w-8 text-soraxi-green" />}
          title="Flexible Delivery Options"
          description="Use your own delivery riders, meet up on campus, or offer pickup — it’s your call."
        />
      </section>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-8">
        <div className="flex items-center justify-center space-x-2">
          <LayoutGridIcon className="text-soraxi-green" />
          <span className="text-sm font-medium">No Coding Required</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <ShieldIcon className="text-soraxi-green" />
          <span className="text-sm font-medium">{`Secure Escrow by ${siteConfig.name}`}</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <CheckCircleIcon className="text-soraxi-green" />
          <span className="text-sm font-medium">Supports Local Delivery</span>
        </div>
      </div>

      <Separator className="my-12 bg-green-200/50 dark:bg-green-900/30" />

      {/* Feature Comparison */}
      <section className="py-10">
        <h2 className="text-3xl font-bold text-center mb-8">
          {siteConfig.name} vs Instagram / WhatsApp Store
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption className="text-muted-foreground">
              {`Feature comparison between ${siteConfig.name} and typical social media selling.`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-soraxi-green">
                  {siteConfig.name}
                </TableHead>
                <TableHead>Instagram / WhatsApp Store</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Setup Cost</TableCell>
                <TableCell className="font-medium text-soraxi-green">
                  ₦0
                </TableCell>
                <TableCell>Free, but manual</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Built-in Buyer Traffic</TableCell>
                <TableCell className="font-medium text-soraxi-green">
                  Yes
                </TableCell>
                <TableCell>No</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Secure Payments</TableCell>
                <TableCell className="font-medium text-soraxi-green">
                  Yes (Escrow)
                </TableCell>
                <TableCell>No</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Support</TableCell>
                <TableCell className="font-medium text-soraxi-green">
                  Human Support
                </TableCell>
                <TableCell>DIY Only</TableCell>
              </TableRow>
              {/* <TableRow>
                <TableCell>Order Tracking</TableCell>
                <TableCell className="font-medium text-soraxi-green">
                  Built-in
                </TableCell>
                <TableCell>Manual via DM</TableCell>
              </TableRow> */}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Animated Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center pt-6">
        <div>
          <AnimatedCounter target={10000} className={`text-soraxi-green`} />
          <p className="text-muted-foreground">Active Buyers</p>
        </div>
        <div>
          <AnimatedCounter target={1200} className={`text-soraxi-green`} />
          <p className="text-muted-foreground">Stores Onboarded</p>
        </div>
        <div>
          <AnimatedCounter
            target={48}
            className={`text-soraxi-green`}
            sign="hrs"
          />
          <p className="text-muted-foreground">Average Delivery Time</p>
        </div>
      </div>

      <Separator className="my-12 bg-green-200/50 dark:bg-green-900/30" />

      {/* How It Works */}
      <div className="text-center space-y-6 pt-12">
        <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
        <p className="text-muted-foreground text-lg">
          Starting is easy, and you remain in full control. Here’s what to
          expect:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard
            step="1"
            title="Create a Free Store Account"
            description="Provide a few details about your business — your brand, category, and location — and we’ll set up a store for you."
          />
          <StepCard
            step="2"
            title="Add Products & Set Preferences"
            description="Upload your products, select your delivery options, and configure your earnings settings."
          />
          <StepCard
            step="3"
            title="Start Receiving Orders"
            description={`Share your storefront link or let customers discover you on ${siteConfig.name}. We’ll notify you when orders come in.`}
          />
        </div>
      </div>

      <Separator className="my-12 bg-green-200/50 dark:bg-green-900/30" />

      {/* Testimonials */}
      <SellerTestimonials />

      <Separator className="my-12 bg-green-200/50 dark:bg-green-900/30" />

      {/* FAQ Section */}
      <div className="pt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              How long does it take to get paid?
            </AccordionTrigger>
            <AccordionContent>
              Payouts are processed weekly between Friday and Sunday once a
              withdrawal request is made.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              What’s the delivery process like?
            </AccordionTrigger>
            <AccordionContent>
              You can use your own courier, connect to our partners, or opt for
              self-fulfillment.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Can I handle returns?</AccordionTrigger>
            <AccordionContent>
              Yes, you can manage returns from your seller dashboard and issue
              refunds where applicable.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Are there commission fees?</AccordionTrigger>
            <AccordionContent>
              Yes, a small percentage is charged per order to maintain the
              platform and services.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Separator className="my-12 bg-green-200/50 dark:bg-green-900/30" />

      {/* Final CTA */}
      <section className="text-center py-10">
        <h2 className="text-3xl font-bold text-foreground">
          Ready to Grow Your Campus Hustle?
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Start selling online in minutes and reach more buyers — without the
          stress of building from scratch.
        </p>
        <div className="mt-6">
          <Button
            size="lg"
            asChild
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white border border-soraxi-green"
          >
            <Link href={`/store/create`}>Get Started Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

interface StepCardProps {
  step: string;
  title: string;
  description: string;
}

function StepCard({ step, title, description }: StepCardProps) {
  return (
    <Card className="flex flex-col items-center text-center p-6 shadow-md border border-green-200/40 bg-card text-card-foreground">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-soraxi-green text-white text-xl font-bold mb-4">
        {step}
      </div>
      <CardHeader className="p-0 mb-2 w-full">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
