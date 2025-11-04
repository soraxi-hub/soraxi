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
  Code,
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
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
            icon={<Code className="h-6 w-6 text-soraxi-green" />}
            title="Technical Support"
            href="#technical-support"
            className="h-full"
          />
          <QuickLinkCard
            icon={<MessageSquare className="h-6 w-6 text-soraxi-green" />}
            title="Contact Us"
            href="#contact-us"
            className="h-full col-span-2 sm:col-span-1"
          />
        </div>

        {/* FAQ Sections */}
        <section id="shopping-orders" className="space-y-8">
          <SectionHeading icon={ShoppingCart} title="Shopping & Orders" />
          <FAQItem
            question="How do I place an order?"
            answer="Browse products, add them to your cart, and proceed to checkout. All payments are secured in escrow until your order is delivered and accepted."
          />
          <FAQItem
            question="What are the available payment methods?"
            answer="We accept various payment methods including credit/debit cards, bank transfers, and mobile money. All transactions are secured by our payment partners."
          />
          <FAQItem
            question="How do I track my order?"
            answer="You'll get real-time updates via your account and email. Once shipped, you can track your package directly within your Orders dashboard."
          />
          <FAQItem
            question="Can I return or exchange a product?"
            answer="Yes — returns are possible within the seller's return policy. Funds remain in escrow until the return period ends, giving you peace of mind."
          />
        </section>

        <section id="selling-store" className="space-y-8">
          <SectionHeading icon={Store} title="Selling & Store Setup" />
          <FAQItem
            question="How do I open a store?"
            answer="Go to 'Open a Store' in your dashboard, fill out your details, upload your products, and set your shipping options. Approval is quick and easy."
          />
          <FAQItem
            question="Are there listing fees?"
            answer="No listing fees. We only take a small commission from each completed sale, so you earn more."
          />
          <FAQItem
            question="How do I get paid?"
            answer="Funds from your sales are held in escrow until the return window passes. Once eligible, funds are released directly to your linked bank account."
          />
          <FAQItem
            question="How do I manage my products and orders?"
            answer="Our intuitive seller dashboard allows you to easily list new products, manage inventory, process orders, and communicate with buyers."
          />
        </section>

        <section id="escrow-payments" className="space-y-8">
          <SectionHeading icon={ShieldCheck} title="Escrow & Payments" />
          <FAQItem
            question="What is escrow protection?"
            answer="Escrow ensures that funds are only released to the seller once the buyer confirms they received their order in good condition."
          />
          <FAQItem
            question="What payment methods are supported?"
            answer="We accept major credit/debit cards, bank transfers, and mobile money — all processed securely."
          />
        </section>

        <section id="technical-support" className="space-y-8">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Code className="h-7 w-7 text-soraxi-green" />
            Technical Support
          </h2>
          <FAQItem
            question="I'm having trouble logging in."
            answer="Ensure you are using the correct email and password. If you've forgotten your password, use the 'Forgot Password' link on the login page to reset it."
          />
          <FAQItem
            question="The website is not loading correctly."
            answer="Try clearing your browser's cache and cookies, or try accessing the site from a different browser or device. If the issue persists, please contact us."
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
      <Icon className="h-7 w-7 text-soraxi-green" />
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
