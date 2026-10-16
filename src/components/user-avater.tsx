"use client";

import { Suspense } from "react";
import { ChevronDown, User2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { truncateText } from "@/lib/utils";

function UserAvatar({ userName }: { userName?: string }) {
  const router = useRouter();

  // Handle logout
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

  return (
    <Suspense fallback={<User2Icon />}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group inline-flex flex-row items-center gap-1 whitespace-nowrap outline-none"
          >
            {userName ? (
              <>
                <span className="delay-75 transition-all ease-in-out group-hover:text-soraxi-green group-data-[state=open]:text-soraxi-green">
                  {truncateText(userName)}
                </span>
                <ChevronDown className="size-4 shrink-0 transition-all duration-200 group-hover:text-soraxi-green group-data-[state=open]:rotate-180 group-data-[state=open]:text-soraxi-green" />
              </>
            ) : (
              <User2Icon className="hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out! group-data-[state=open]:text-soraxi-green!" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dark:bg-muted/90">
          {userName ? (
            <>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className=" border" />
              <Link href={`/profile`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out!">
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href={`/wishlist`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out!">
                  Wishlist
                </DropdownMenuItem>
              </Link>
              <Link href={`/orders`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out!">
                  Orders
                </DropdownMenuItem>
              </Link>
              <Link href={`/messages`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out!">
                  My Inbox
                </DropdownMenuItem>
              </Link>
              <Link href={"/store/onboarding/"} className="lg:hidden">
                <DropdownMenuItem className="cursor-pointer hover:bg-transparent! hover:text-soraxi-green! delay-75! transition-all! ease-in-out!">
                  Create Your Store
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className=" border" />
              <DropdownMenuLabel>
                <Button
                  onClick={handleLogout}
                  variant={`ghost`}
                  className="w-full dark:hover:bg-transparent dark:hover:text-soraxi-green font-semibold hover:bg-transparent hover:text-soraxi-green delay-75 transition-all ease-in-out h-5"
                >
                  Sign out
                </Button>
              </DropdownMenuLabel>
            </>
          ) : (
            <Link href={`/sign-in`}>
              <DropdownMenuLabel>
                <Button
                  variant={`ghost`}
                  className="w-full dark:hover:bg-transparent dark:hover:text-soraxi-green font-semibold hover:bg-transparent hover:text-soraxi-green delay-75 transition-all ease-in-out h-5"
                >
                  Sign In
                </Button>
              </DropdownMenuLabel>
            </Link>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Suspense>
  );
}

export default UserAvatar;
