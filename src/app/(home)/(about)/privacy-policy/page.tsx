"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            How we collect, use, and protect your personal information
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
                This Privacy Policy describes how {siteConfig.name} Marketplace
                (&#34;{siteConfig.name}&#34;, &#34;we&#34;, &#34;us&#34;, or
                &#34;our&#34;) collects, uses, and shares your personal
                information when you access or use our e-commerce platform.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {siteConfig.name} is committed to protecting your privacy and
                ensuring the security of your personal information. This policy
                explains your rights, how we safeguard your data, and how the
                law protects you.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Your Privacy Matters
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      We only collect information necessary to provide and
                      improve our services. You are always in control of your
                      personal data, and we will never sell your information to
                      third parties.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                2. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User-Provided Information */}
              <div>
                <h4 className="font-semibold mb-3">
                  2.1 Information You Provide
                </h4>
                <p className="text-muted-foreground mb-3">
                  We collect information that you voluntarily provide when using
                  our Service:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <strong>Account Information:</strong> Name, email address,
                    phone number, password
                  </li>
                  {/* <li>
                    <strong>Profile Information:</strong> Profile picture, bio,
                    preferences
                  </li> */}
                  <li>
                    <strong>Store Information:</strong> Business name,
                    description, verification documents
                  </li>
                  <li>
                    <strong>Payment Information:</strong> Bank account details,
                    payment method preferences.{" "}
                    <em>
                      We do not store full card details — payments are processed
                      securely by trusted third-party providers.
                    </em>
                  </li>
                  <li>
                    <strong>Shipping Information:</strong> Delivery addresses,
                    contact details
                  </li>
                  <li>
                    <strong>Communication:</strong> Reviews and support
                    inquiries
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Automatically Collected Information */}
              <div>
                <h4 className="font-semibold mb-3">
                  2.2 Information We Collect Automatically
                </h4>
                <p className="text-muted-foreground mb-3">
                  When you use our Service, we automatically collect certain
                  information:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <strong>Device Information:</strong> IP address, browser
                    type, operating system
                  </li>
                  <li>
                    <strong>Usage Information:</strong> Pages visited, time
                    spent, click patterns
                  </li>
                  {/* <li>
                    <strong>Location Information:</strong> General location
                    based on IP address.{" "}
                    <em>
                      We do not collect precise GPS location unless you
                      explicitly provide it (e.g., for delivery purposes).
                    </em>
                  </li> */}
                  <li>
                    <strong>Cookies and Tracking:</strong> Session data,
                    preferences, analytics
                  </li>
                  <li>
                    <strong>Transaction Data:</strong> Purchase history, payment
                    status, order details
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Third-Party Information */}
              <div>
                <h4 className="font-semibold mb-3">
                  2.3 Information from Third Parties
                </h4>
                <p className="text-muted-foreground mb-3">
                  We may receive information about you from trusted third-party
                  services, such as:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <strong>Payment Processors:</strong> Transaction
                    verification, fraud prevention
                  </li>
                  {/* <li>
                    <strong>Shipping Partners:</strong> Delivery status,
                    tracking information
                  </li> */}
                  {/* <li>
                    <strong>Social Media:</strong> Profile information if you
                    choose to connect your social accounts (optional)
                  </li> */}
                  <li>
                    <strong>Analytics Services:</strong> Aggregated usage
                    patterns and performance metrics used to improve our
                    platform.{" "}
                    <em>This data does not personally identify you.</em>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card className=" shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                3. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                We use your personal information for the following purposes:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Service Provision
                  </h5>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Process orders and payments</li>
                    <li>• Manage user accounts</li>
                    <li>• Provide customer support</li>
                    <li>• Facilitate communication</li>
                    <li>• Enable marketplace features</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Service Improvement
                  </h5>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Analyze usage patterns</li>
                    <li>• Improve user experience</li>
                    <li>• Develop new features</li>
                    <li>• Personalize content</li>
                    <li>• Optimize performance</li>
                  </ul>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Security & Compliance
                  </h5>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• Prevent fraud and abuse</li>
                    <li>• Verify user identity</li>
                    <li>• Comply with legal requirements</li>
                    <li>• Protect user safety</li>
                    <li>• Maintain platform integrity</li>
                  </ul>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                    Communication
                  </h5>
                  <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                    <li>• Send order updates</li>
                    <li>• Provide customer support</li>
                    <li>• Share important notices</li>
                    <li>• Marketing communications</li>
                    <li>• Platform announcements</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                4. How We Share Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground mb-4">
                We value your privacy and only share personal information when
                necessary to provide our services, comply with the law, or
                improve your experience on {siteConfig.name}. Below are the
                specific circumstances under which we may share your
                information:
              </p>

              <div>
                <h4 className="font-semibold mb-3">4.1 With Other Users</h4>
                <p className="text-muted-foreground mb-2">
                  Certain information is shared between buyers and sellers to
                  enable smooth transactions:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Sellers can view buyer contact details for order fulfillment
                  </li>
                  <li>Buyers can view seller store details and ratings</li>
                  <li>Public reviews and ratings are visible to all users</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">
                  4.2 With Service Providers
                </h4>
                <p className="text-muted-foreground mb-2">
                  We work with trusted third-party providers who help us operate
                  {siteConfig.name} effectively. These include:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <strong>Payment Processors:</strong> To securely process
                    transactions
                  </li>
                  <li>
                    <strong>Shipping Companies:</strong> To deliver orders to
                    customers
                  </li>
                  <li>
                    <strong>Cloud Services:</strong> To safely store and process
                    data
                  </li>
                  <li>
                    <strong>Analytics Providers:</strong> To understand how our
                    platform is used and improve services
                  </li>
                  <li>
                    <strong>Customer Support:</strong> To assist users and
                    resolve issues
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">4.3 Legal Requirements</h4>
                <p className="text-muted-foreground mb-2">
                  We may disclose your information if required by law, or when
                  necessary to protect the rights, safety, and integrity of
                  {siteConfig.name}, our users, or the public. This may include:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Complying with legal processes or government requests</li>
                  <li>Protecting our rights, property, or safety</li>
                  <li>
                    Protecting the rights, property, or safety of our users
                  </li>
                  <li>Investigating fraud, abuse, or security concerns</li>
                  <li>Enforcing our terms and conditions</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      We Never Sell Your Data
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      We do not sell, rent, or trade your personal information
                      to third parties for marketing purposes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                5. Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures
                to safeguard your personal information. These include both
                system-level protections and company-wide practices:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-semibold mb-2">
                    Technical Safeguards
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-4">
                    {/* <li>SSL/TLS encryption for all transmitted data</li> */}
                    <li>Encrypted storage of sensitive information</li>
                    <li>Regular security audits and penetration testing</li>
                    {/* <li>Secure, PCI-DSS–compliant payment processing</li> */}
                    <li>
                      Role-based access controls and strong authentication
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-semibold mb-2">
                    Organizational Measures
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-4">
                    <li>Employee training on data protection best practices</li>
                    <li>Strict limitations on access to personal data</li>
                    <li>Regular reviews and updates of security policies</li>
                    {/* <li>Established incident response procedures</li> */}
                    {/* <li>Independent third-party security assessments</li> */}
                  </ul>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Security Notice
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      While we strive to protect your information with strong
                      safeguards, no method of transmission or storage over the
                      internet is completely secure. We continuously improve our
                      systems to reduce risks and keep your data safe.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>6. Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                You have important rights concerning your personal information.
                Depending on applicable laws, you may exercise the following:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h5 className="font-medium">Access &amp; Portability</h5>
                  <p className="text-sm text-muted-foreground">
                    You can request a copy of your personal data and receive it
                    in a structured, commonly used, and machine-readable format.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h5 className="font-medium">Correction</h5>
                  <p className="text-sm text-muted-foreground">
                    You can update or correct inaccurate or incomplete
                    information directly through your account settings or by
                    contacting us.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h5 className="font-medium">Deletion</h5>
                  <p className="text-sm text-muted-foreground">
                    You may request deletion of your personal data, subject to
                    our legal, regulatory, and contractual obligations.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h5 className="font-medium">Restriction</h5>
                  <p className="text-sm text-muted-foreground">
                    You may request that we restrict processing of your
                    information under certain circumstances (e.g., while
                    accuracy is being verified).
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h5 className="font-medium">Objection</h5>
                  <p className="text-sm text-muted-foreground">
                    You may object to our processing of your personal data,
                    including for direct marketing purposes, at any time.
                  </p>
                </div>
              </div>

              {/* <p className="text-sm text-muted-foreground mt-4">
                To exercise any of these rights, please contact us at
                <span className="font-medium"> privacy@yourplatform.com</span>
                or use the controls available in your account settings. We will
                respond in accordance with applicable data protection laws.
              </p> */}
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          {/* <Card className=" shadow-none border-0">
            <CardHeader>
              <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                We use cookies and similar tracking technologies to enhance your
                experience:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border rounded-lg">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-3 text-left font-medium">
                        Cookie Type
                      </th>
                      <th className="border border-border p-3 text-left font-medium">
                        Purpose
                      </th>
                      <th className="border border-border p-3 text-left font-medium">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border p-3">Essential</td>
                      <td className="border border-border p-3">
                        Required for basic site functionality
                      </td>
                      <td className="border border-border p-3">Session</td>
                    </tr>
                    <tr className="bg-muted/25">
                      <td className="border border-border p-3">Analytics</td>
                      <td className="border border-border p-3">
                        Understand how users interact with our site
                      </td>
                      <td className="border border-border p-3">2 years</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Functional</td>
                      <td className="border border-border p-3">
                        Remember your preferences and settings
                      </td>
                      <td className="border border-border p-3">1 year</td>
                    </tr>
                    <tr className="bg-muted/25">
                      <td className="border border-border p-3">Marketing</td>
                      <td className="border border-border p-3">
                        Deliver relevant advertisements
                      </td>
                      <td className="border border-border p-3">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground">
                You can control cookie preferences through your browser settings
                or our cookie consent banner.
              </p>
            </CardContent>
          </Card> */}

          {/* International Transfers */}
          {/* <Card className=" shadow-none border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                8. International Data Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your personal information may be transferred to and processed in
                countries other than Nigeria. When we transfer your data
                internationally, we ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>
                  Adequacy decisions by relevant data protection authorities
                </li>
                <li>
                  Standard contractual clauses approved by data protection
                  authorities
                </li>
                <li>Certification schemes and codes of conduct</li>
                <li>Binding corporate rules for intra-group transfers</li>
              </ul>
            </CardContent>
          </Card> */}

          {/* Data Retention */}
          {/* <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>9. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                We retain your personal information only for as long as
                necessary to provide our services, resolve disputes, and comply
                with legal and regulatory requirements:
              </p>

              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>
                  <strong>Account Information:</strong> Retained until account
                  deletion, plus an additional 30 days for recovery.
                </li>
                <li>
                  <strong>Transaction Records:</strong> Retained for 7 years to
                  meet tax and legal compliance obligations.
                </li>
                <li>
                  <strong>Communication Records:</strong> Retained for 3 years
                  for customer service and dispute resolution.
                </li>
                <li>
                  <strong>Marketing Data:</strong> Retained until you opt out or
                  after 2 years of inactivity.
                </li>
                <li>
                  <strong>Legal Hold:</strong> Retained longer if required by
                  law, court order, or regulatory authorities.
                </li>
              </ul>

              <p className="text-sm text-muted-foreground mt-4">
                Please note that actual retention periods may vary depending on
                applicable laws, contractual obligations, or specific business
                needs.
              </p>
            </CardContent>
          </Card> */}

          {/* Children's Privacy */}
          {/* <Card className=" shadow-none border-0">
            <CardHeader>
              <CardTitle>10. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our Service is not intended for children under 18 years of age.
                We do not knowingly collect personal information from children
                under 18. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us
                immediately.
              </p>
            </CardContent>
          </Card> */}

          {/* Changes to Privacy Policy */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>7. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, technology, legal requirements, or
                other factors. When we make material updates, we will notify you
                by posting the revised policy on this page and updating the{" "}
                <em>&#34;Last Updated&#34;</em> date. We encourage you to review
                this Privacy Policy periodically to stay informed about how we
                protect your information.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>8. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or our privacy practices, please contact us via{" "}
                <Link
                  href={`mailto:${process.env.NEXT_PUBLIC_SORAXI_INFO_EMAIL}`}
                  className="underline"
                >
                  <strong>{process.env.NEXT_PUBLIC_SORAXI_INFO_EMAIL}</strong>
                </Link>
              </p>

              {/* <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-2">Privacy Officer</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>
                        <strong>Email:</strong> privacy@yourplatform.com
                      </li>
                      <li>
                        <strong>Phone:</strong> +234 (0) 123 456 7890
                      </li>
                      <li>
                        <strong>Response Time:</strong> Typically within 30 days
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Mailing Address</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>Privacy Department</li>
                      <li>123 Business District</li>
                      <li>Lagos, Nigeria</li>
                      <li>Postal Code: 100001</li>
                    </ul>
                  </div>
                </div>
              </div> */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
