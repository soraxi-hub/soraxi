import type React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  // Phone,
  // MapPin,
  HelpCircle,
  ShoppingCart,
  Store,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import ContactForm from "@/components/forms/contact-form";
import { WhatsappIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: `Help & Support`,
  description:
    "Find answers to common questions about shopping, orders, payments, store setup, and more. Contact our support team for further assistance.",
  keywords: [
    `${siteConfig.name} help`,
    "customer support",
    "shopping help",
    "order tracking",
    "escrow payments",
    "store setup",
    "seller support",
    "technical support",
    "contact support",
  ],
  openGraph: {
    title: `Help & Support | ${siteConfig.name}`,
    description: `Need assistance? Browse FAQs or reach out to ${siteConfig.name} support for shopping, selling, payments, and technical issues.`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
    siteName: `${siteConfig.name}`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/og-soraxi.png`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} Help & Support`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Help & Support | ${siteConfig.name}`,
    description: `Find answers or get in touch with the ${siteConfig.name} support team for fast help.`,
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/og-soraxi.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
  },
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
            <span className="bg-clip-text text-soraxi-green">
              How Can We Help You?
            </span>
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Find answers to common questions or get in touch with our support
            team.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLinkCard
            icon={<ShoppingCart className="h-6 w-6 text-soraxi-green" />}
            title="Shopping & Orders"
            href="#shopping-orders"
            className="h-full"
          />
          <QuickLinkCard
            icon={<Store className="h-6 w-6 text-soraxi-green" />}
            title="Selling & Store Setup"
            href="#selling-store"
            className="h-full"
          />
          <QuickLinkCard
            icon={<ShieldCheck className="h-6 w-6 text-soraxi-green" />}
            title="Escrow & Payments"
            href="#escrow-payments"
            className="h-full"
          />
          <QuickLinkCard
            icon={<MessageSquare className="h-6 w-6 text-soraxi-green" />}
            title="Contact Us"
            href="#contact-us"
            className="h-full"
          />
        </div>

        {/* FAQ Sections */}
        <section id="shopping-orders" className="space-y-8">
          <SectionHeading icon={ShoppingCart} title="Shopping & Orders" />
          <FAQItem
            question="How do I place an order?"
            answer="Browse products, add them to your cart, and proceed to checkout. Your payment is held in escrow until delivery is confirmed, not paid out to the vendor upfront."
          />
          <FAQItem
            question="What are the available payment methods?"
            answer="You can pay by card or bank transfer, handled by our secure payment partner at checkout."
          />
          <FAQItem
            question="How do I track my order?"
            answer="Open Orders to see each item's status — Order Placed, Processing, Shipped, Out for Delivery, or Delivered. You'll get an email once your order is placed, and a delivery code appears as soon as your item ships."
          />
          <FAQItem
            question="Can I return or exchange a product?"
            answer="If an item is faulty, damaged, or not what was described, raise a dispute and you'll be refunded if it's upheld in your favor."
          />
        </section>

        <section id="selling-store" className="space-y-8">
          <SectionHeading icon={Store} title="Selling & Store Setup" />
          <FAQItem
            question="How do I open a store?"
            answer="Soraxi is invite-only for vendors — there's no self-service sign-up. You submit an application with your business details and product samples, and our team reviews it. If you're approved, we create your store for you and email your details."
          />
          <FAQItem
            question="Are there listing fees?"
            answer="No listing fees, no monthly fee, and nothing to open a store. We charge a commission on each completed sale, plus a small fee when you withdraw to your bank account."
          />
          <FAQItem
            question="How do I get paid?"
            answer="Once delivery is confirmed, your earnings (minus commission) move from escrow into your store wallet. From there, you request a withdrawal to your bank account — a small platform withdrawal fee applies."
          />
          <FAQItem
            question="How do I manage my products and orders?"
            answer="Use your store dashboard to add and edit products, track stock (by size, where products have one), update each order's status as you fulfil it, and message buyers directly."
          />
        </section>

        <section id="escrow-payments" className="space-y-8">
          <SectionHeading icon={ShieldCheck} title="Escrow & Payments" />
          <FAQItem
            question="What is escrow protection?"
            answer="Soraxi holds your payment until delivery is confirmed, so the vendor never has your money and your item at the same time. Confirmation happens when you mark the order received, when your delivery code is entered, or automatically 3 days after the item ships if neither happens — only then is the vendor paid."
          />
          <FAQItem
            question="What payment methods are supported?"
            answer="Card and bank transfer, through our secure payment partner — the same options as regular checkout."
          />
        </section>

        {/* Contact Us */}
        <section id="contact-us" className="space-y-8">
          <SectionHeading icon={MessageSquare} title="Contact Us" />
          <p className="text-lg text-muted-foreground">
            Can&#39;t find what you&#39;re looking for? Our friendly support
            team is ready to assist you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card className="shadow-lg border border-green-200/40 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-soraxi-green">
                  <MessageSquare className="h-5 w-5 text-soraxi-green" />
                  Send Us a Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContactForm />
              </CardContent>
            </Card>

            {/* Other Contact Options */}
            <Card className="shadow-lg border border-green-200/40 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-soraxi-green">
                  <HelpCircle className="h-5 w-5 text-soraxi-green" />
                  Other Ways to Reach Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContactItem
                  icon={Mail}
                  text={process.env.NEXT_PUBLIC_SORAXI_SUPPORT_EMAIL!}
                  type={`email`}
                />
                <ContactItem
                  icon={WhatsappIcon}
                  text={`Chat with us on WhatsApp.`}
                  type={`whatsApp`}
                />
                {/* <ContactItem icon={Phone} text="+1 (555) 123-4567" /> */}
                {/* <ContactItem
                  icon={MapPin}
                  text="123 Marketplace Blvd, Suite 100, City, Country"
                /> */}
                <div className="pt-4">
                  <h3 className="font-semibold">Support Hours:</h3>
                  <p className="text-sm text-muted-foreground">
                    Mon–Fri: 9am – 5pm (GMT)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sat: 10am – 2pm (GMT)
                  </p>
                  <p className="text-sm text-muted-foreground">Sun: Closed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

/* Helper Components */
function QuickLinkCard({
  icon,
  title,
  href,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  className: string;
}) {
  return (
    <Link href={href} className={className}>
      <Card
        className={`flex flex-col items-center text-center p-4 hover:shadow-md transition-shadow cursor-pointer border border-green-200/40 bg-card ${className}`}
      >
        <div className="mb-2">{icon}</div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </Card>
    </Link>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <Card className="border border-green-200/40 bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{answer}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <h2 className="text-3xl font-bold flex items-center gap-3">
      <Icon className="h-7 w-7 text-soraxi-green hidden md:inline-flex" />
      {title}
    </h2>
  );
}

function ContactItem({
  icon: Icon,
  text,
  type,
}: {
  icon: React.ElementType;
  text: string;
  type?: "email" | "phone" | "text" | "whatsApp";
}) {
  if (type === "email") {
    return (
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5 text-soraxi-green" />
        <Link
          href={`mailto:${process.env.NEXT_PUBLIC_SORAXI_SUPPORT_EMAIL}`}
          className="underline"
        >
          <p className="text-sm">{text}</p>
        </Link>
      </div>
    );
  } else if (type === "whatsApp") {
    return (
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5 text-soraxi-green" />
        <Link
          href={
            process.env.NEXT_PUBLIC_SORAXI_WHATSAPP_LINK ||
            "https://wa.me/2348148600290"
          }
          className="underline"
        >
          <p className="text-sm">{text}</p>
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-3">
      <Icon className="h-5 w-5 text-soraxi-green" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
