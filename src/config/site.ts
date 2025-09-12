export const siteConfig = {
  siteTitle: "SORAXI | Campus Marketplace for Students & Vendors",
  description:
    "SORAXI is a student-centered e-commerce platform designed for Nigerian universities. We connect students with trusted campus vendors, making it easier to buy fashion, gadgets, school supplies, food, and personal care products at affordable prices.",
  keywords: [
    "SORAXI",
    "Campus marketplace",
    "Student e-commerce platform",
    "University online shopping",
    "Buy and sell on campus",
    "Affordable student shopping",
    "Secure campus transactions",
    "UNICAL online marketplace",
    "Student vendors platform",
    "Digital campus store",
    "Local vendor visibility",
    "Fashion and gadgets for students",
    "School supplies online",
    "Groceries on campus",
    "Trusted student marketplace",
    "E-commerce for Nigerian universities",
  ],
  name: "Soraxi",
  logo: `/svg/soraxi.svg`,
  url: process.env.NEXT_PUBLIC_APP_URL,
  footer: [
    { name: "About us", href: "/about" },
    { name: "Terms & Conditions", href: "/terms-conditions" },
    { name: "Shipping & Return Policy", href: "/shipping-return-policy" },
    { name: "Privacy Policy", href: "/privacy-policy" },
  ],
  paymentmethods: [
    { name: "Visa", img: "/svg/visa-svgrepo-com.svg" },
    { name: "Mastercard", img: "/svg/mastercard-full-svgrepo-com.svg" },
    { name: "Verve", img: "/svg/verve-svgrepo-com.svg" },
    // ... other payment methods
  ],
  links: {
    instagram: "#",
    linkedin: "#",
  },
  footerLinks: [
    { name: "Home", href: "/" },
    { name: "Support", href: "/support" },
    // { name: "Code of Conduct", href: "/code-of-conduct" },
    // { name: "Human Rights Policy", href: "/human-rights-policy" },
  ],
};
