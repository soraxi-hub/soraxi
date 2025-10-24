"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Terms & Conditions
          </h1>
          <p className="text-muted-foreground text-lg">
            Please read these terms carefully before using our platform
          </p>
          <Badge variant="outline" className="mt-2">
            Last updated: August 2025
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Welcome to {siteConfig.name} Marketplace (&#34;{siteConfig.name}
                &#34;, &#34;Platform&#34;, &#34;Service&#34;, &#34;we&#34;,
                &#34;us&#34;, or &#34;our&#34;). These Terms and Conditions
                (&#34;Terms&#34;) govern your access to and use of{" "}
                {siteConfig.name}
                Marketplace, including our website, mobile access, and related
                services.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By using or accessing our Platform, you acknowledge that you
                have read, understood, and agree to be legally bound by these
                Terms. If you do not agree, you must discontinue use of the
                Service immediately.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Important Notice
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      These Terms constitute a legally binding agreement between
                      you and our Platform. Use of the Service implies
                      acceptance of all rights and obligations set forth herein,
                      under the applicable laws of Nigeria.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                2. User Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                To access and use certain features of our Platform, you may be
                required to create a user account. By registering, you agree to
                comply with the following requirements regarding account
                creation and responsibilities.
              </p>

              <div>
                <h4 className="font-semibold mb-2">2.1 Account Registration</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    You must provide accurate, current, and complete information
                    when creating an account.
                  </li>
                  <li>
                    You are responsible for maintaining the confidentiality and
                    security of your account credentials.
                  </li>
                  <li>
                    You must be at least 18 years old to create an account.
                  </li>
                  <li>
                    You may not register or maintain more than one account,
                    whether as an individual or on behalf of an entity, without
                    our prior written consent.
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
                    You are responsible for all activities that occur under your
                    account.
                  </li>
                  <li>
                    You must notify us immediately of any unauthorized use of
                    your account or any other breach of security.
                  </li>
                  <li>
                    We reserve the right to suspend, restrict, or terminate
                    accounts at our sole discretion if these Terms are violated
                    or if fraudulent or abusive activity is suspected.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Store Operations */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                3. Store Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Store owners are required to operate their stores in compliance
                with our guidelines, applicable laws, and ethical business
                practices. By creating and managing a store on our platform, you
                agree to uphold transparency, accuracy, and professionalism in
                all activities related to your store.
              </p>

              <div>
                <h4 className="font-semibold mb-2">3.1 Store Creation</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    All stores must complete our verification process before
                    going live.
                  </li>
                  <li>Store information must be accurate and up-to-date.</li>
                  <li>
                    We reserve the right to approve or reject store
                    applications.
                  </li>
                  <li>
                    Stores must comply with all applicable laws and regulations.
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">3.2 Product Listings</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    All products must be accurately described with clear images.
                  </li>
                  <li>
                    Prohibited items include illegal goods, counterfeit
                    products, and hazardous materials.
                  </li>
                  <li>
                    Product prices must be clearly stated and include all
                    applicable fees.
                  </li>
                  <li>
                    We reserve the right to remove listings that violate our
                    policies.
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">3.3 Order Fulfillment</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Sellers must process and ship orders within the specified
                    timeframe.
                  </li>
                  {/* <li>
                    Accurate tracking information must be provided when
                    available.
                  </li>
                  <li>
                    Sellers are responsible for packaging products securely.
                  </li> */}
                  <li>
                    Customer service inquiries must be responded to promptly.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                4. Payment Terms
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                This section outlines the rules governing payments on our
                platform, including how fees are applied, how the escrow system
                ensures secure transactions, and how sellers receive payouts. By
                using our services, you agree to comply with these payment terms
                as part of your seller or buyer obligations.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Platform Fees</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    We charge a commission on each successful transaction.
                  </li>
                  <li>Payment processing fees may also apply.</li>
                  <li>
                    The applicable fee structures are outlined in your seller
                    dashboard.
                  </li>
                  <li>Fees are subject to change with 30 days’ notice.</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">4.2 Escrow System</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Payments are held in escrow until delivery is confirmed.
                  </li>
                  <li>
                    Funds are released once the return window has expired.
                  </li>
                  <li>
                    Disputed transactions may result in extended hold periods.
                  </li>
                  <li>Refunds are processed according to our return policy.</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">4.3 Payouts</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Sellers must provide valid banking information for payouts.
                  </li>
                  <li>Minimum payout thresholds may apply.</li>
                  <li>
                    Payout schedules are outlined in your seller agreement.
                  </li>
                  <li>
                    We reserve the right to hold payouts for security reasons.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Prohibited Activities */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                5. Prohibited Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To maintain a safe, fair, and trustworthy marketplace, the
                following activities are strictly prohibited. Engaging in any of
                these actions may result in account suspension, termination, or
                legal action.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  Selling counterfeit, stolen, or otherwise illegal products
                </li>
                <li>Manipulating or falsifying reviews and ratings</li>
                <li>Creating multiple accounts to bypass restrictions</li>
                <li>
                  Engaging in fraudulent, misleading, or deceptive practices
                </li>
                <li>Violating third-party intellectual property rights</li>
                <li>Spamming or sending unsolicited communications</li>
                <li>Attempting to avoid or bypass our fee structure</li>
                <li>
                  Using the platform for money laundering or unlawful activities
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>6. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Platform, along with its original content, design, features,
                and functionality, is owned by us and protected under
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You retain ownership of the content you post or upload. However,
                by submitting content to the Platform, you grant us a
                non-exclusive, worldwide, royalty-free license to use, display,
                reproduce, and distribute such content in connection with
                operating and promoting the Platform. You are solely responsible
                for ensuring you have the necessary rights to post such content.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>7. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We act solely as a marketplace platform connecting buyers and
                sellers. We do not control and are not responsible for the
                quality, safety, or legality of products listed, the truth or
                accuracy of listings, or the ability of sellers to sell items or
                buyers to complete purchases. Any disputes that arise between
                users remain the sole responsibility of the parties involved.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, we disclaim all
                liability for any indirect, incidental, special, consequential,
                or punitive damages, including but not limited to loss of
                profits, data, goodwill, or other intangible losses, resulting
                from your use of or inability to use the Platform.
              </p>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>8. Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This section explains how disputes will be handled between you
                and the Platform.
              </p>
              <div>
                <h4 className="font-semibold mb-2">8.1 Internal Resolution</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We encourage users to resolve disputes directly whenever
                  possible. Our customer support team may mediate disputes in
                  good faith, but we are not obligated to resolve every
                  conflict.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">8.2 Governing Law</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance
                  with the laws of Nigeria, without regard to its conflict of
                  law provisions. Any disputes arising under these Terms shall
                  be subject to the jurisdiction of Nigerian courts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>9. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update or revise these Terms from time to time. If a
                revision is material, we will provide at least 30 days&#39;
                notice before the new terms take effect. What constitutes a
                material change will be determined at our sole discretion.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By continuing to access or use the Platform after any revisions
                become effective, you agree to be bound by the updated Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>10. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions,
                please contact us via{" "}
                <Link
                  href={`mailto:${process.env.NEXT_PUBLIC_SORAXI_INFO_EMAIL}`}
                  className="underline"
                >
                  <strong>{process.env.NEXT_PUBLIC_SORAXI_INFO_EMAIL}</strong>
                </Link>
              </p>
              {/* <div className="bg-muted/50 rounded-lg p-4">
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
              </div> */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
