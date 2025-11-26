"use client";

import {
  UserIcon,
  PackageIcon,
  HeartIcon,
  EditIcon,
  StoreIcon,
  // MapPinIcon,
  // CreditCardIcon,
  // StarIcon,
  // LockIcon,
  // BellIcon,
  // GlobeIcon,
  // HelpCircleIcon,
  HelpCircleIcon,
  // RefreshCwIcon,
  // MailIcon,
  BuildingIcon,
  // Share2Icon,
  ChevronDownIcon,
  LogOutIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  //   SidebarGroupLabel,
  // SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible } from "@/components/ui/collapsible";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { siteConfig } from "@/config/site";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TokenData } from "@/lib/helpers/get-user-data-from-token";
import { ThemeSwitcher } from "@/components/ui/theme-toggler";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { truncateText } from "@/lib/utils";
import Link from "next/link";

const sidebarItems = (user: TokenData) => [
  {
    label: "My Account",
    items: [
      { title: "Profile", url: "/profile", icon: UserIcon },
      { title: "Order History", url: "/orders", icon: PackageIcon },
      { title: "Wishlist", url: "/wishlist", icon: HeartIcon },
      // { title: "Addresses", url: "/addresses", icon: MapPinIcon },
      // {
      //   title: "Payment Methods",
      //   url: "/payment-methods",
      //   icon: CreditCardIcon,
      // },
      // { title: "Reviews", url: "/reviews", icon: StarIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      // { title: "Security", url: "/security", icon: LockIcon },
      { title: "Edit Profile", url: "/edit-profile", icon: EditIcon },
      // { title: "Notifications", url: "/notifications", icon: BellIcon },
      // { title: "Language", url: "/language", icon: GlobeIcon },
    ],
  },
  {
    label: "Help & Support",
    items: [
      // { title: "FAQs", url: "/faqs", icon: HelpCircleIcon },
      // { title: "Returns", url: "/returns", icon: RefreshCwIcon },
      { title: "Support", url: "/support", icon: HelpCircleIcon },
    ],
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
      // {
      //   title: "Affiliate Program",
      //   url: "/affiliate-program",
      //   icon: Share2Icon,
      // },
    ],
  },
];

export function AppSidebar({ user }: { user: TokenData | null }) {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      const response = await axios.post("/api/auth/sign-out");
      if (response.status === 200) {
        router.push("/sign-in");
        router.refresh();
        toast.success("Logged out successfully");
        return;
      }
      toast.error("Logout failed. Please try again.");
    } catch (error) {
      return error;
    }
  };

  if (!user) {
    router.push("/sign-in");
    return;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <Sidebar
      // variant={`inset`}
      collapsible={`offcanvas`}
      // className="absolute top-[7rem]"
      className="fixed top-[7rem] h-[calc(100vh-7rem)]"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center space-x-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Hello {user.firstName}!
            </h2>
            <p className="text-xs text-muted-foreground">
              {siteConfig.name} Platform
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems(user).map((section, i) => (
                <Collapsible key={i} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <span>{section.label}</span>
                        <ChevronDownIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {section.items.map((item, j) => (
                        <SidebarMenuSubItem key={j}>
                          <SidebarMenuButton asChild>
                            <a href={item.url}>
                              <item.icon className="mr-2 h-4 w-4" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-soraxi-green text-white text-xs">
                    {getInitials(user.firstName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {truncateText(user.firstName)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {truncateText(user.email)}
                  </p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{truncateText(userName, 20)}</p>
                <p className="text-xs text-muted-foreground">
                  {truncateText(user.email)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center justify-between gap-2">
              <span>Theme</span>
              <ThemeSwitcher page="user" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={`/docs/`}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                <span>Resources</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
