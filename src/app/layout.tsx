import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCReactProvider } from "@/trpc/client";
import { siteConfig } from "@/config/site";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

// Configure Geist Sans font with CSS variables
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Configure Geist Mono font with CSS variables
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Global Metadata for the application
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url), // ensures relative OG/Twitter URLs resolve correctly
  title: {
    default: siteConfig.siteTitle,
    template: `%s | ${siteConfig.siteTitle}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.siteTitle, url: siteConfig.url }],
  creator: siteConfig.siteTitle,
  publisher: siteConfig.siteTitle,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.siteTitle,
    title: siteConfig.siteTitle,
    description: siteConfig.description,
    images: [
      {
        url: "/og-soraxi.png", // 👈 place your OG image here
        width: 1200,
        height: 630,
        alt: siteConfig.siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.siteTitle,
    description: siteConfig.description,
    images: ["/og-soraxi.png"],
    // creator: "@yourtwitterhandle", // 👈 replace if you have one. when we create an X account
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Suppress hydration warnings to prevent mismatch errors
    // This is necessary because the theme provider modifies the HTML on client-side
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.className} antialiased`}
        suppressHydrationWarning
      >
        {/*
          ThemeProvider may cause hydration mismatch because:
          1. It relies on client-side state (theme preference)
          2. The server doesn't know the user's preferred theme initially
          3. The client will apply the theme after hydration

          Using suppressHydrationWarning on the html tag is a common solution
          when using theme providers with SSR.
        */}
        <TRPCReactProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange // Helps prevent flash of unstyled content
          >
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
