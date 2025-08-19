"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Eye,
  Lock,
  Database,
  Users,
  Globe,
  AlertTriangle,
  Settings,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            How we collect, use, and protect your personal information
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
                  <Eye className="h-5 w-5 text-primary" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  This Privacy Policy describes how we collect, use, and share
                  your personal information when you use our e-commerce
                  marketplace platform ("Service", "Platform", "we", "us", or
                  "our").
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to protecting your privacy and ensuring the
                  security of your personal information. This policy explains
                  your privacy rights and how the law protects you.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Your Privacy Matters
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        We only collect information that is necessary to provide
                        and improve our services. We never sell your personal
                        data to third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  2. Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">
                    2.1 Information You Provide
                  </h4>
                  <p className="text-muted-foreground mb-3">
                    We collect information you voluntarily provide when using
                    our Service:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      <strong>Account Information:</strong> Name, email address,
                      phone number, password
                    </li>
                    <li>
                      <strong>Profile Information:</strong> Profile picture,
                      bio, preferences
                    </li>
                    <li>
                      <strong>Store Information:</strong> Business name,
                      description, verification documents
                    </li>
                    <li>
                      <strong>Payment Information:</strong> Bank account
                      details, payment method preferences
                    </li>
                    <li>
                      <strong>Shipping Information:</strong> Delivery addresses,
                      contact details
                    </li>
                    <li>
                      <strong>Communication:</strong> Messages, reviews, support
                      inquiries
                    </li>
                  </ul>
                </div>

                <Separator />

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
                    <li>
                      <strong>Location Information:</strong> General location
                      based on IP address
                    </li>
                    <li>
                      <strong>Cookies and Tracking:</strong> Session data,
                      preferences, analytics
                    </li>
                    <li>
                      <strong>Transaction Data:</strong> Purchase history,
                      payment status, order details
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">
                    2.3 Information from Third Parties
                  </h4>
                  <p className="text-muted-foreground mb-3">
                    We may receive information from third-party services:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      <strong>Payment Processors:</strong> Transaction
                      verification, fraud prevention
                    </li>
                    <li>
                      <strong>Shipping Partners:</strong> Delivery status,
                      tracking information
                    </li>
                    <li>
                      <strong>Social Media:</strong> Profile information if you
                      connect social accounts
                    </li>
                    <li>
                      <strong>Analytics Services:</strong> Website usage
                      patterns, performance metrics
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  4. How We Share Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground mb-4">
                  We may share your personal information in the following
                  circumstances:
                </p>

                <div>
                  <h4 className="font-semibold mb-3">4.1 With Other Users</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      Sellers can see buyer contact information for order
                      fulfillment
                    </li>
                    <li>Buyers can see seller store information and ratings</li>
                    <li>Public reviews and ratings are visible to all users</li>
                    <li>Profile information you choose to make public</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">
                    4.2 With Service Providers
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>
                      <strong>Payment Processors:</strong> To process
                      transactions securely
                    </li>
                    <li>
                      <strong>Shipping Companies:</strong> To deliver orders to
                      customers
                    </li>
                    <li>
                      <strong>Cloud Services:</strong> To store and process data
                      securely
                    </li>
                    <li>
                      <strong>Analytics Providers:</strong> To understand
                      platform usage
                    </li>
                    <li>
                      <strong>Customer Support:</strong> To provide assistance
                      and resolve issues
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">4.3 Legal Requirements</h4>
                  <p className="text-muted-foreground mb-2">
                    We may disclose your information when required by law or to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Comply with legal processes or government requests</li>
                    <li>Protect our rights, property, or safety</li>
                    <li>
                      Protect the rights, property, or safety of our users
                    </li>
                    <li>Investigate fraud or security issues</li>
                    <li>Enforce our terms and conditions</li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  5. Data Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  We implement appropriate technical and organizational measures
                  to protect your personal information:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Technical Safeguards</h5>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-4">
                      <li>SSL/TLS encryption for data transmission</li>
                      <li>Encrypted data storage</li>
                      <li>Regular security audits and testing</li>
                      <li>Secure payment processing</li>
                      <li>Access controls and authentication</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">
                      Organizational Measures
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-4">
                      <li>Employee training on data protection</li>
                      <li>Limited access to personal data</li>
                      <li>Regular security policy updates</li>
                      <li>Incident response procedures</li>
                      <li>Third-party security assessments</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Security Notice
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        While we implement strong security measures, no method
                        of transmission over the internet is 100% secure. We
                        cannot guarantee absolute security of your information.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardHeader>
                <CardTitle>6. Your Privacy Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  You have the following rights regarding your personal
                  information:
                </p>

                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h5 className="font-medium">Access and Portability</h5>
                    <p className="text-sm text-muted-foreground">
                      Request a copy of your personal data and receive it in a
                      structured, machine-readable format.
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h5 className="font-medium">Correction</h5>
                    <p className="text-sm text-muted-foreground">
                      Update or correct inaccurate personal information in your
                      account settings.
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h5 className="font-medium">Deletion</h5>
                    <p className="text-sm text-muted-foreground">
                      Request deletion of your personal data, subject to legal
                      and contractual obligations.
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h5 className="font-medium">Restriction</h5>
                    <p className="text-sm text-muted-foreground">
                      Request limitation of processing of your personal data in
                      certain circumstances.
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h5 className="font-medium">Objection</h5>
                    <p className="text-sm text-muted-foreground">
                      Object to processing of your personal data for marketing
                      purposes or other legitimate interests.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  To exercise these rights, contact us at
                  privacy@yourplatform.com or through your account settings.
                </p>
              </CardContent>
            </Card>

            {/* Cookies and Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar tracking technologies to enhance
                  your experience:
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
                  You can control cookie preferences through your browser
                  settings or our cookie consent banner.
                </p>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  8. International Data Transfers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your personal information may be transferred to and processed
                  in countries other than Nigeria. When we transfer your data
                  internationally, we ensure appropriate safeguards are in
                  place:
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
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle>9. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  We retain your personal information for as long as necessary
                  to provide our services and comply with legal obligations:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <strong>Account Information:</strong> Until account deletion
                    plus 30 days
                  </li>
                  <li>
                    <strong>Transaction Records:</strong> 7 years for tax and
                    legal compliance
                  </li>
                  <li>
                    <strong>Communication Records:</strong> 3 years for customer
                    service purposes
                  </li>
                  <li>
                    <strong>Marketing Data:</strong> Until you opt out or 2
                    years of inactivity
                  </li>
                  <li>
                    <strong>Legal Hold:</strong> Extended retention when
                    required by law
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>10. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our Service is not intended for children under 18 years of
                  age. We do not knowingly collect personal information from
                  children under 18. If you are a parent or guardian and believe
                  your child has provided us with personal information, please
                  contact us immediately.
                </p>
              </CardContent>
            </Card>

            {/* Changes to Privacy Policy */}
            <Card>
              <CardHeader>
                <CardTitle>11. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by posting the new Privacy
                  Policy on this page and updating the "Last updated" date. We
                  encourage you to review this Privacy Policy periodically for
                  any changes.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>12. Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this Privacy Policy or our
                  privacy practices, please contact us:
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Privacy Officer</h5>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <strong>Email:</strong> privacy@yourplatform.com
                        </li>
                        <li>
                          <strong>Phone:</strong> +234 (0) 123 456 7890
                        </li>
                        <li>
                          <strong>Response Time:</strong> Within 30 days
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Mailing Address</h5>
                      <ul className="space-y-1 text-sm">
                        <li>Privacy Department</li>
                        <li>123 Business District</li>
                        <li>Lagos, Nigeria</li>
                        <li>Postal Code: 100001</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
