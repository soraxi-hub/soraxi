"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Truck,
  RotateCcw,
  Clock,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Shipping & Return Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about shipping and returns
          </p>
          <Badge variant="outline" className="mt-2">
            Last updated: January 2024
          </Badge>
        </div>

        <ScrollArea className="h-[800px] w-full">
          <div className="space-y-6">
            {/* Shipping Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Shipping Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Coverage
                  </h4>
                  <p className="text-muted-foreground mb-3">
                    We currently offer shipping services across Nigeria through
                    our network of verified sellers.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">
                          Available Areas
                        </span>
                      </div>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• Lagos State</li>
                        <li>• Abuja (FCT)</li>
                        <li>• Port Harcourt</li>
                        <li>• Kano</li>
                        <li>• Ibadan</li>
                        <li>• Other major cities</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          Coming Soon
                        </span>
                      </div>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        <li>• Remote areas</li>
                        <li>• International shipping</li>
                        <li>• Express delivery options</li>
                        <li>• Weekend delivery</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Processing & Delivery Times
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border rounded-lg">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border border-border p-3 text-left font-medium">
                            Shipping Method
                          </th>
                          <th className="border border-border p-3 text-left font-medium">
                            Processing Time
                          </th>
                          <th className="border border-border p-3 text-left font-medium">
                            Delivery Time
                          </th>
                          <th className="border border-border p-3 text-left font-medium">
                            Cost Range
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border p-3">
                            Standard Delivery
                          </td>
                          <td className="border border-border p-3">
                            1-2 business days
                          </td>
                          <td className="border border-border p-3">
                            3-7 business days
                          </td>
                          <td className="border border-border p-3">
                            ₦500 - ₦2,000
                          </td>
                        </tr>
                        <tr className="bg-muted/25">
                          <td className="border border-border p-3">
                            Express Delivery
                          </td>
                          <td className="border border-border p-3">
                            1 business day
                          </td>
                          <td className="border border-border p-3">
                            1-3 business days
                          </td>
                          <td className="border border-border p-3">
                            ₦1,500 - ₦5,000
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">
                            Same Day Delivery
                          </td>
                          <td className="border border-border p-3">
                            2-4 hours
                          </td>
                          <td className="border border-border p-3">Same day</td>
                          <td className="border border-border p-3">
                            ₦2,500 - ₦8,000
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    * Delivery times may vary based on location, product
                    availability, and external factors.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Shipping Costs</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>
                      Shipping costs are calculated based on item weight,
                      dimensions, and destination
                    </li>
                    <li>
                      Each seller sets their own shipping rates and methods
                    </li>
                    <li>
                      Free shipping may be available for orders above certain
                      thresholds
                    </li>
                    <li>
                      Multiple items from the same seller may qualify for
                      combined shipping discounts
                    </li>
                    <li>
                      Shipping costs are clearly displayed before checkout
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Order Tracking
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Once your order ships, you'll receive tracking
                        information via email and SMS. You can also track your
                        orders in your account dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Return Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  Return Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Return Window</h4>
                  <p className="text-muted-foreground mb-4">
                    You have <strong>7 days</strong> from the delivery date to
                    initiate a return for most items. This return window is
                    designed to give you adequate time to inspect your purchase
                    while ensuring timely resolution for all parties.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">
                        Returnable Items
                      </h5>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• Clothing and accessories</li>
                        <li>• Electronics (unopened)</li>
                        <li>• Home and garden items</li>
                        <li>• Books and media</li>
                        <li>• Defective or damaged items</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">
                        Non-Returnable Items
                      </h5>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        <li>• Perishable goods</li>
                        <li>• Personal care items</li>
                        <li>• Custom or personalized items</li>
                        <li>• Digital products</li>
                        <li>• Items damaged by misuse</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Return Conditions</h4>
                  <p className="text-muted-foreground mb-3">
                    To be eligible for a return, items must meet the following
                    conditions:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>
                      Items must be in original condition with all tags and
                      packaging
                    </li>
                    <li>
                      Electronics must be unopened and in original packaging
                    </li>
                    <li>
                      Clothing must be unworn, unwashed, and with original tags
                    </li>
                    <li>All accessories and components must be included</li>
                    <li>
                      Items must not show signs of wear or damage from use
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">How to Return an Item</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <div>
                        <h5 className="font-medium">Initiate Return Request</h5>
                        <p className="text-sm text-muted-foreground">
                          Go to your order history and click "Return Item"
                          within 7 days of delivery.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        2
                      </div>
                      <div>
                        <h5 className="font-medium">Select Return Reason</h5>
                        <p className="text-sm text-muted-foreground">
                          Choose the reason for your return and provide any
                          additional details.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        3
                      </div>
                      <div>
                        <h5 className="font-medium">Package and Ship</h5>
                        <p className="text-sm text-muted-foreground">
                          Package the item securely and ship it back using the
                          provided return label.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        4
                      </div>
                      <div>
                        <h5 className="font-medium">Receive Refund</h5>
                        <p className="text-sm text-muted-foreground">
                          Once we receive and inspect the item, your refund will
                          be processed within 3-5 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Refund Processing
                  </h4>
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      Refunds are processed back to your original payment
                      method:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                      <li>
                        <strong>Bank Transfer:</strong> 3-5 business days
                      </li>
                      <li>
                        <strong>Debit/Credit Card:</strong> 5-10 business days
                      </li>
                      <li>
                        <strong>Mobile Wallet:</strong> 1-3 business days
                      </li>
                      <li>
                        <strong>Store Credit:</strong> Immediate
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Processing times may vary depending on your bank or
                      payment provider.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exchange Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Exchange Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We currently do not offer direct exchanges. If you need a
                  different size, color, or model, please return the original
                  item and place a new order for the desired product.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Coming Soon
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        We're working on implementing a direct exchange system
                        to make the process more convenient for our customers.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Damaged or Defective Items */}
            <Card>
              <CardHeader>
                <CardTitle>Damaged or Defective Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  If you receive a damaged or defective item, we'll make it
                  right:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Contact us immediately upon receiving a damaged item</li>
                  <li>Provide photos of the damage or defect</li>
                  <li>
                    We'll arrange for immediate replacement or full refund
                  </li>
                  <li>
                    Return shipping is free for damaged or defective items
                  </li>
                  <li>Priority processing for damaged item claims</li>
                </ul>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Quality Guarantee:</strong> We stand behind the
                    quality of products sold on our platform. If you're not
                    satisfied with your purchase, we'll work with you to find a
                    solution.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you have questions about shipping or returns, our customer
                  service team is here to help:
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Customer Service</h5>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <strong>Email:</strong> support@yourplatform.com
                        </li>
                        <li>
                          <strong>Phone:</strong> +234 (0) 123 456 7890
                        </li>
                        <li>
                          <strong>Hours:</strong> Mon-Fri 9AM-6PM WAT
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Returns Department</h5>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <strong>Email:</strong> returns@yourplatform.com
                        </li>
                        <li>
                          <strong>Address:</strong> 123 Business District
                        </li>
                        <li>
                          <strong>Lagos, Nigeria</strong>
                        </li>
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
