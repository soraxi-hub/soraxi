import { TokenData } from "@/lib/helpers/get-user-data-from-token";
import {
  UserIcon,
  PackageIcon,
  HeartIcon,
  EditIcon,
  StoreIcon,
  HelpCircleIcon,
  BuildingIcon,
} from "lucide-react";

export const userSidebarItems = (user: TokenData) => [
  {
    label: "My Account",
    items: [
      { title: "Profile", url: "/profile", icon: UserIcon },
      { title: "Order History", url: "/orders", icon: PackageIcon },
      { title: "Wishlist", url: "/wishlist", icon: HeartIcon },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Edit Profile", url: "/edit-profile", icon: EditIcon }],
  },
  {
    label: "Help & Support",
    items: [{ title: "Support", url: "/support", icon: HelpCircleIcon }],
  },
  {
    label: `My Store`,
    items: [
      ...(user?.store
        ? [
            {
              title: "Store Management",
              url: `/store/${user.store}/dashboard`,
              icon: BuildingIcon,
            },
          ]
        : []),
      {
        title: "Create Your Store",
        url: "/store/onboarding/",
        icon: StoreIcon,
      },
    ],
  },
];
