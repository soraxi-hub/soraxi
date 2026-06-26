import { UserTokenPayload } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import {
  UserIcon,
  PackageIcon,
  HeartIcon,
  EditIcon,
  StoreIcon,
  HelpCircleIcon,
  BuildingIcon,
  BadgeInfoIcon,
  ShieldIcon,
  // AlertTriangleIcon,
} from "lucide-react";

export const userSidebarItems = (user: UserTokenPayload) => [
  {
    label: "My Account",
    items: [
      { title: "Profile", url: "/profile", icon: UserIcon },
      { title: "Order History", url: "/orders", icon: PackageIcon },
      // { title: "My Disputes", url: "/disputes", icon: AlertTriangleIcon },
      { title: "Wishlist", url: "/wishlist", icon: HeartIcon },
      { title: "My Requests", url: "/my-requests", icon: BadgeInfoIcon },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Edit Profile", url: "/edit-profile", icon: EditIcon }],
  },
  {
    label: "Account Security",
    items: [
      {
        title: "Change Password",
        url: "/security/change-password",
        icon: ShieldIcon,
      },
    ],
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
