"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Shield,
  Users,
  CreditCard,
  Package,
  AlertTriangle,
} from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Terms & Conditions
          </h1>
          <p className="text-muted-foreground text-lg">
            Please read these terms carefully before using our platform
          </p>
          <Badge variant="outline" className="mt-2">
            Last updated: January 2024
          </Badge>
        </div>

        <ScrollArea className="h-[800px] w-full">
          <div className="space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to our e-commerce marketplace platform ("Platform",
                  "Service", "we", "us", or "our"). These Terms and Conditions
                  ("Terms") govern your use of our website and services.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using our Platform, you agree to be bound by
                  these Terms. If you disagree with any part of these terms,
                  then you may not access the Service.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Important Notice
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        These terms constitute a legally binding agreement
                        between you and our platform.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  2. User Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    2.1 Account Registration
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      You must provide accurate and complete information when
                      creating an account
                    </li>
                    <li>
                      You are responsible for maintaining the security of your
                      account credentials
                    </li>
                    <li>
                      You must be at least 18 years old to create an account
                    </li>
                    <li>
                      One person or entity may not maintain more than one
                      account
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">
                    2.2 Account Responsibilities
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      You are responsible for all activities that occur under
                      your account
                    </li>
                    <li>
                      Notify us immediately of any unauthorized use of your
                      account
                    </li>
                    <li>
                      We reserve the right to suspend or terminate accounts that
                      violate these terms
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Store Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  3. Store Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">3.1 Store Creation</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      All stores must complete our verification process before
                      going live
                    </li>
                    <li>Store information must be accurate and up-to-date</li>
                    <li>
                      We reserve the right to approve or reject store
                      applications
                    </li>
                    <li>
                      Stores must comply with all applicable laws and
                      regulations
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">3.2 Product Listings</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      All products must be accurately described with clear
                      images
                    </li>
                    <li>
                      Prohibited items include illegal goods, counterfeit
                      products, and hazardous materials
                    </li>
                    <li>
                      Product prices must be clearly stated and include all
                      applicable fees
                    </li>
                    <li>
                      We reserve the right to remove listings that violate our
                      policies
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">3.3 Order Fulfillment</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      Sellers must process and ship orders within the specified
                      timeframe
                    </li>
                    <li>
                      Accurate tracking information must be provided when
                      available
                    </li>
                    <li>
                      Sellers are responsible for packaging products securely
                    </li>
                    <li>
                      Customer service inquiries must be responded to promptly
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  4. Payment Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">4.1 Platform Fees</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      We charge a commission on each successful transaction
                    </li>
                    <li>Payment processing fees may apply</li>
                    <li>
                      Fee structures are clearly outlined in your seller
                      dashboard
                    </li>
                    <li>Fees are subject to change with 30 days notice</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">4.2 Escrow System</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      Payments are held in escrow until delivery is confirmed
                    </li>
                    <li>Funds are released after the return window expires</li>
                    <li>
                      Disputed transactions may result in extended hold periods
                    </li>
                    <li>
                      Refunds are processed according to our return policy
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">4.3 Payouts</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      Sellers must provide valid banking information for payouts
                    </li>
                    <li>Minimum payout thresholds may apply</li>
                    <li>
                      Payout schedules are outlined in your seller agreement
                    </li>
                    <li>
                      We reserve the right to hold payouts for security reasons
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Prohibited Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  5. Prohibited Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The following activities are strictly prohibited:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Selling counterfeit, stolen, or illegal products</li>
                  <li>Manipulating reviews or ratings</li>
                  <li>Creating multiple accounts to circumvent restrictions</li>
                  <li>Engaging in fraudulent or deceptive practices</li>
                  <li>Violating intellectual property rights</li>
                  <li>Spamming or sending unsolicited communications</li>
                  <li>Attempting to bypass our fee structure</li>
                  <li>
                    Using the platform for money laundering or other illegal
                    activities
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle>6. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  The Platform and its original content, features, and
                  functionality are owned by us and are protected by
                  international copyright, trademark, patent, trade secret, and
                  other intellectual property laws.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of content you post, but grant us a
                  license to use, display, and distribute such content on the
                  Platform.
                </p>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card>
              <CardHeader>
                <CardTitle>7. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We act as a marketplace platform connecting buyers and
                  sellers. We are not responsible for the quality, safety, or
                  legality of products listed, the truth or accuracy of
                  listings, or the ability of sellers to sell items or buyers to
                  pay for items.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  In no event shall we be liable for any indirect, incidental,
                  special, consequential, or punitive damages, including without
                  limitation, loss of profits, data, use, goodwill, or other
                  intangible losses.
                </p>
              </CardContent>
            </Card>

            {/* Dispute Resolution */}
            <Card>
              <CardHeader>
                <CardTitle>8. Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    8.1 Internal Resolution
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    We encourage users to resolve disputes directly. Our
                    customer support team is available to mediate disputes when
                    necessary.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">8.2 Governing Law</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms shall be governed by and construed in accordance
                    with the laws of Nigeria, without regard to its conflict of
                    law provisions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardHeader>
                <CardTitle>9. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify or replace these Terms at any
                  time. If a revision is material, we will provide at least 30
                  days notice prior to any new terms taking effect. What
                  constitutes a material change will be determined at our sole
                  discretion.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>10. Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions about these Terms and Conditions,
                  please contact us:
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <ul className="space-y-2 text-sm">
                    <li>
                      <strong>Email:</strong> legal@yourplatform.com
                    </li>
                    <li>
                      <strong>Phone:</strong> +234 (0) 123 456 7890
                    </li>
                    <li>
                      <strong>Address:</strong> 123 Business District, Lagos,
                      Nigeria
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
