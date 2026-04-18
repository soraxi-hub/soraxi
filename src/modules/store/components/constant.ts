import { siteConfig } from "@/config/site";
import {
  UserIcon,
  PackageIcon,
  MapPinIcon,
  CreditCardIcon,
  MailIcon,
  BriefcaseIcon,
  WalletIcon,
  RefreshCwIcon,
} from "lucide-react";

export const storeSidebarItems = (storeId: string) => [
  {
    label: "Store Management",
    items: [
      {
        title: "Dashboard",
        url: `/${siteConfig.routeNames.store}/${storeId}/dashboard`,
        icon: BriefcaseIcon,
      },
      {
        title: "Products",
        url: `/${siteConfig.routeNames.store}/${storeId}/products`,
        icon: PackageIcon,
      },
      {
        title: "Orders",
        url: `/${siteConfig.routeNames.store}/${storeId}/orders`,
        icon: CreditCardIcon,
      },
      {
        title: "My Escrow",
        url: `/${siteConfig.routeNames.store}/${storeId}/escrow`,
        icon: RefreshCwIcon,
      },
      {
        title: "Wallet",
        url: `/${siteConfig.routeNames.store}/${storeId}/wallet`,
        icon: WalletIcon,
      },
    ],
  },
  {
    label: "Store Settings",
    items: [
      {
        title: "Store Profile",
        url: `/${siteConfig.routeNames.store}/${storeId}/profile`,
        icon: UserIcon,
      },
      {
        title: "Shipping",
        url: `/${siteConfig.routeNames.store}/${storeId}/shipping`,
        icon: MapPinIcon,
      },
      {
        title: "Payment Setup",
        url: `/${siteConfig.routeNames.store}/${storeId}/payment-setup`,
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
