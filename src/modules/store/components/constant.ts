import {
  PackageIcon,
  MapPinIcon,
  CreditCardIcon,
  MailIcon,
  BriefcaseIcon,
  WalletIcon,
  // AlertTriangleIcon,
} from "lucide-react";

export const storeSidebarItems = (storeId: string) => [
  {
    label: "Store Management",
    items: [
      {
        title: "Dashboard",
        url: `/store/${storeId}/dashboard`,
        icon: BriefcaseIcon,
      },
      {
        title: "Products",
        url: `/store/${storeId}/products`,
        icon: PackageIcon,
      },
      {
        title: "Orders",
        url: `/store/${storeId}/orders`,
        icon: CreditCardIcon,
      },
      // {
      //   title: "Disputes",
      //   url: `/store/${storeId}/disputes`,
      //   icon: AlertTriangleIcon,
      // },
      {
        title: "Wallet",
        url: `/store/${storeId}/wallet`,
        icon: WalletIcon,
      },
    ],
  },
  {
    label: "Store Settings",
    items: [
      // {
      //   title: "Store Profile",
      //   url: `/store/${storeId}/profile`,
      //   icon: UserIcon,
      // },
      {
        title: "Shipping",
        url: `/store/${storeId}/shipping`,
        icon: MapPinIcon,
      },
      {
        title: "Payment Setup",
        url: `/store/${storeId}/payment-setup`,
        icon: CreditCardIcon,
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        title: "Contact Support",
        url: `/support`,
        icon: MailIcon,
      },
    ],
  },
];
