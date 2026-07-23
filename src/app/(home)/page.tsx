import Link from "next/link";

const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029Vb8DHGo2kNFsJxywTI2a";
const VENDOR_APPLICATION_URL = "/store/onboarding/";

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-soraxi-darkmode-background transition-colors">
      {/* Hero */}
      <div className="flex flex-1 flex-col justify-center px-6 pb-16 pt-6 mx-auto">
        <div className="max-w-2xl">
          <h1 className="text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-[#0B1A10] dark:text-[#F3F7F4] sm:text-5xl lg:text-6xl">
            Your campus is about to get a{" "}
            <span className="bg-soraxi-green/20 dark:bg-soraxi-green/25 px-1">
              marketplace
            </span>
            .
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#6B7A70] dark:text-[#9AA79E] sm:text-lg">
            SoraxiHub connects students with trusted vendors around campus.
            We&apos;re live and onboarding our founding vendors now. Doors open
            to everyone soon, and the people on our list hear about it first.
          </p>

          {/* CTAs */}
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl bg-soraxi-green px-7 py-5 transition-colors hover:bg-soraxi-green-hover"
            >
              <span>
                <span className="block text-lg font-bold text-white">
                  I&apos;m a student
                </span>
                <span className="mt-1 block text-sm text-white/85">
                  Join the WhatsApp Channel for early access and launch updates
                </span>
              </span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-white transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href={VENDOR_APPLICATION_URL}
              className="group flex items-center justify-between rounded-2xl border border-[#E3E8E4] dark:border-[#243027] bg-white dark:bg-soraxi-darkmode-background px-7 py-5 transition-colors hover:border-[#C9D1CB] dark:hover:border-[#31402F]"
            >
              <span>
                <span className="block text-lg font-bold text-[#0B1A10] dark:text-[#F3F7F4]">
                  I sell on or around campus
                </span>
                <span className="mt-1 block text-sm text-[#7A8880] dark:text-[#8C978F]">
                  Apply to become a founding vendor before we open
                </span>
              </span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-[#0B1A10] dark:text-[#F3F7F4] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <p className="mt-6 text-sm text-[#8C978F] dark:text-[#6B7A70]">
            No spam. Just one message when it matters.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E3E8E4] dark:border-[#1F2A22] px-6 py-6 sm:px-12 lg:px-24">
        <div className="flex gap-1 text-sm text-[#8C978F] dark:text-[#6B7A70] flex-row items-center justify-between">
          <span>© 2026 SoraxiHub</span>
          <span>Calabar, Nigeria</span>
        </div>
      </footer>
    </div>
  );
}

// import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
// import { getQueryClient, trpc } from "@/trpc/server";
// import { HomePage } from "@/modules/home/home-page";
// import { CartProvider } from "@/modules/cart/cart-provider";
// import { ErrorBoundary } from "react-error-boundary";
// import { Suspense } from "react";
// import { HomePageSkeleton } from "@/modules/skeletons/home-page-skeleton";
// import { ErrorFallback } from "@/components/errors/error-fallback";

// /**
//  * Home Page
//  * Main landing page showcasing products and features
//  *
//  * The main landing page of the application.
//  * Includes the CartHydration component to ensure user's cart
//  * is loaded and available throughout the application.
//  *
//  * Architecture note: CartHydration is included at the page level
//  * rather than in the layout to provide more granular control
//  * over when cart hydration occurs.
//  */
// export default async function Home() {
//   const queryClient = getQueryClient();
//   void queryClient.prefetchQuery(trpc.home.getPublicProducts.queryOptions({}));

//   return (
//     <HydrationBoundary state={dehydrate(queryClient)}>
//       <ErrorBoundary FallbackComponent={ErrorFallback}>
//         <Suspense fallback={<HomePageSkeleton />}>
//           {/*
//             CartHydration component handles loading user's cart data
//             Must be included early in the component tree to ensure
//             cart data is available for other components that depend on it
//           */}
//           <CartProvider />
//           <HomePage />
//         </Suspense>
//       </ErrorBoundary>
//     </HydrationBoundary>
//   );
// }
