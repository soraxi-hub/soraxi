"use client";

import { Suspense } from "react";
import { User2Icon } from "lucide-react";
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
        <DropdownMenuTrigger className="">
          {userName ? (
            <span className="hover:bg-transparent hover:text-udua-orange-primary delay-75 transition-all ease-in-out">
              {userName}
            </span>
          ) : (
            <User2Icon className="hover:bg-transparent! hover:text-udua-orange-primary! delay-75! transition-all! ease-in-out!" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {userName ? (
            <>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className=" border" />
              <Link href={`/profile`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-udua-orange-primary! delay-75! transition-all! ease-in-out! hover:font-semibold">
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href={`/wishlist`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-udua-orange-primary! delay-75! transition-all! ease-in-out! hover:font-semibold">
                  Wishlist
                </DropdownMenuItem>
              </Link>
              <Link href={`/order-history`}>
                <DropdownMenuItem className=" cursor-pointer hover:bg-transparent! hover:text-udua-orange-primary! delay-75! transition-all! ease-in-out! hover:font-semibold">
                  Orders
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className=" border" />
              <DropdownMenuLabel>
                <Button
                  onClick={handleLogout}
                  variant={`ghost`}
                  className="w-full dark:hover:bg-transparent dark:hover:text-udua-orange-primary font-semibold hover:bg-transparent hover:text-udua-orange-primary delay-75 transition-all ease-in-out h-5"
                >
                  Sign out
                </Button>
              </DropdownMenuLabel>
            </>
          ) : (
            <Link href={`/sign-in`}>
              <DropdownMenuLabel>
                <Button
                  onClick={handleLogout}
                  variant={`ghost`}
                  className="w-full dark:hover:bg-transparent dark:hover:text-udua-orange-primary font-semibold hover:bg-transparent hover:text-udua-orange-primary delay-75 transition-all ease-in-out h-5"
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
