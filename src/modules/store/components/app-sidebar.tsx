"use client";

import {
  UserIcon,
  PackageIcon,
  // HeartIcon,
  MapPinIcon,
  CreditCardIcon,
  // StarIcon,
  // LockIcon,
  // GlobeIcon,
  // HelpCircleIcon,
  MailIcon,
  BriefcaseIcon,
  // Share2Icon,
  ChevronDownIcon,
  WalletIcon,
  LogOutIcon,
  // RefreshCwIcon,
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
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StoreTokenData } from "@/lib/helpers/get-store-from-cookie";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/ui/theme-toggler";
import { siteConfig } from "@/config/site";
import { truncateText } from "@/lib/utils";
import Link from "next/link";

const sidebarItems = (storeId: string) => [
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
      //   title: "Returns",
      //   url: `/store/${storeId}/returns`,
      //   icon: RefreshCwIcon,
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
      {
        title: "Store Profile",
        url: `/store/${storeId}/profile`,
        icon: UserIcon,
      },
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
      // {
      //   title: "Tax Settings",
      //   url: `/store/${storeId}/tax`,
      //   icon: LockIcon,
      // },
    ],
  },
  // {
  //   label: "Marketing",
  //   items: [
  //     {
  //       title: "Discounts",
  //       url: `/store/${storeId}/discounts`,
  //       icon: HeartIcon,
  //     },
  //     {
  //       title: "Promotions",
  //       url: `/store/${storeId}/promotions`,
  //       icon: Share2Icon,
  //     },
  //     {
  //       title: "Analytics",
  //       url: `/store/${storeId}/analytics`,
  //       icon: GlobeIcon,
  //     },
  //   ],
  // },
  {
    label: "Support",
    items: [
      // {
      //   title: "Store Help",
      //   url: `/store/${storeId}/help`,
      //   icon: HelpCircleIcon,
      // },
      {
        title: "Contact Support",
        url: `/support`,
        icon: MailIcon,
      },
      // {
      //   title: "Policies",
      //   url: `/store/${storeId}/policies`,
      //   icon: LockIcon,
      // },
    ],
  },
];

export function StoreSidebar({ store }: { store: StoreTokenData }) {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      const response = await axios.post("/api/store/logout");
      if (response.status === 200) {
        router.push("/login");
        router.refresh();
        toast.success("Logged out successfully");
        return;
      }
      toast.error("Logout failed. Please try again.");
    } catch (error) {
      return error;
    }
  };
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  return (
    <Sidebar
      variant={`inset`}
      collapsible={`offcanvas`}
      // className="absolute top-[4rem]"
      className="fixed top-[4rem] h-[calc(100vh-4rem)]"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center space-x-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground truncate w-56">
              Welcome back {store.name}!
            </h2>
            <p className="text-xs text-muted-foreground">
              {siteConfig.name} Platform
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems(store.id).map((section, i) => (
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
            <Button
              variant="ghost"
              className="w-full justify-start py-6 truncate"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-soraxi-green text-white text-xs">
                    {getInitials(store.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {truncateText(store.name, 20)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {truncateText(store.storeEmail, 20)}
                  </p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{truncateText(store.name, 20)}</p>
                <p className="text-xs text-muted-foreground">
                  {truncateText(store.storeEmail, 20)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center justify-between gap-2">
              <span>Theme</span>
              <ThemeSwitcher page="store" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href={`/docs/`}>
              <DropdownMenuItem className="flex items-center justify-between gap-2 cursor-pointer">
                <span>Resources</span>
              </DropdownMenuItem>
            </Link>
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
