import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Page Not Found`,
  description:
    "We can’t find the page you requested. Please check the link or return to the homepage.",
  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main 404 Content */}
        <div className="text-center mb-12">
          {/* Large 404 Number */}
          <div className="relative mb-8">
            <h1 className="text-[8rem] md:text-[16rem] font-bold text-black/30 leading-none select-none">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="space-y-4 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Oops! Page Not Found
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We can’t find the page you requested. Please check the link or
              return to the homepage. If this was unexpected, contact support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-black hover:text-black/90"
            >
              <Link href="/">Back to Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-black hover:text-black/90"
            >
              <Link href="/support">contact support</Link>
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Error Code: 404 | Page Not Found
          </p>
        </div>
      </div>
    </div>
  );
}
