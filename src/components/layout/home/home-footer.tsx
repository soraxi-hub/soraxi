"use client";

import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { ThemeSwitcher } from "@/components/ui/theme-toggler";
import { playpenSans } from "@/constants/constant";
import { usePathname } from "next/navigation";
import { FacebookIcon, WhatsappIcon } from "@/components/icons";

export function HomeFooter() {
  const pathname = usePathname();
  // Hide footer on specific paths
  const hideHomeFooter = () => {
    return (
      pathname.startsWith("/profile") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/wishlist") ||
      pathname.startsWith("/edit-profile")
    );
  };

  if (hideHomeFooter()) {
    return null; // Do not render footer if condition is met
  }
  const currentYear = new Date().getFullYear();
  const linkStyles =
    "text-sm hover:text-soraxi-green transition-colors duration-200";

  return (
    <footer className="bg-soraxi-darkmode-background text-sm text-[#ffffffa4] border-t">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-20 sm:px-6 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
        {/* Brand Section */}
        <div className="flex flex-col justify-between lg:col-span-2">
          <div className="space-y-4">
            <Link
              href="/"
              className={`flex items-center space-x-2 hover:opacity-90 transition-opacity ${playpenSans.className}`}
            >
              <span>
                <Image
                  src={siteConfig.logo}
                  alt={siteConfig.name}
                  width={32}
                  height={32}
                />
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-soraxi-green">
                {siteConfig.name}
              </span>
            </Link>
            <p className="max-w-sm text-xs">{siteConfig.description}</p>
            <SocialLinks />
          </div>
          <Copyright currentYear={currentYear} />
        </div>

        {/* Company Info */}
        <FooterSection title="Company info">
          <ul className="space-y-2">
            {siteConfig.footer.map((item) => (
              <li key={item.name}>
                <Link href={item.href} className={linkStyles}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </FooterSection>

        {/* Useful Links */}
        <FooterSection title="Useful links">
          <ul className="space-y-2">
            {siteConfig.footerLinks.map((link) => (
              <li key={link.name}>
                <Link href={link.href} className={linkStyles}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </FooterSection>

        {/* Payment Methods */}
        <FooterSection title="Payment Methods">
          <ul className="flex flex-wrap gap-2">
            {siteConfig.paymentmethods.map((method) => (
              <li key={method.name}>
                <Image
                  src={method.img}
                  width={40}
                  height={40}
                  alt={method.name}
                  className="h-10 w-10 object-contain"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <ThemeSwitcher />
          </div>
        </FooterSection>
      </div>
    </footer>
  );
}

// Reusable Footer Section Component
const FooterSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <h3 className="mb-6 text-base uppercase text-white">{title}</h3>
    {children}
  </div>
);

// Social Links Component
const SocialLinks = () => (
  <ul className="flex gap-4">
    <li>
      <Link
        href={
          siteConfig.links.facebook ||
          "https://www.facebook.com/profile.php?id=61583344972491"
        }
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit our Instagram"
      >
        <FacebookIcon className="h-5 w-5 hover:text-soraxi-green-hover" />
      </Link>
    </li>
    <li>
      <Link
        href={siteConfig.links.whatsapp || "https://wa.me/2348148600290"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit our LinkedIn"
      >
        <WhatsappIcon className="h-5 w-5 hover:text-soraxi-green-hover" />
      </Link>
    </li>
  </ul>
);

// Copyright Component
const Copyright = ({ currentYear }: { currentYear: number }) => (
  <p className="pt-4 text-xs">
    &copy; {currentYear}{" "}
    <a
      href="https://mishael-joe.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-soraxi-green"
    >
      {siteConfig.name} LLC
    </a>
    . All rights reserved.
  </p>
);
