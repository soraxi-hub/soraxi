"use client";

import {
  UserIcon,
  PackageIcon,
  // HeartIcon,
  MapPinIcon,
  CreditCardIcon,
  // StarIcon,
  LockIcon,
  // GlobeIcon,
  HelpCircleIcon,
  MailIcon,
  BriefcaseIcon,
  // Share2Icon,
  ChevronDownIcon,
  User2,
  ChevronUp,
  WalletIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  //   SidebarGroupLabel,
  SidebarHeader,
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

const sidebarItems = (storeId: string) => [
  {
    label: "Store Management",
    items: [
      {
        title: "Store Dashboard",
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
      {
        title: "Store Help",
        url: `/store/${storeId}/help`,
        icon: HelpCircleIcon,
      },
      {
        title: "Contact Support",
        url: `/store/${storeId}/contact`,
        icon: MailIcon,
      },
      {
        title: "Policies",
        url: `/store/${storeId}/policies`,
        icon: LockIcon,
      },
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
  return (
    <Sidebar
      variant={`inset`}
      collapsible={`offcanvas`}
      // className="absolute top-[4rem]"
      className="fixed top-[4rem] h-[calc(100vh-4rem)]"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>Greetings, {store.name}</SidebarMenuItem>
        </SidebarMenu>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {store.name}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
