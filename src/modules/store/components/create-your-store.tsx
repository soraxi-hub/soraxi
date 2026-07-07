import { Button } from "@/components/ui/button";
import { StoreIcon } from "lucide-react";
import Link from "next/link";

function CreateYourStore() {
  return (
    <Link href={"/store/onboarding/"} className="hidden lg:inline-flex">
      {" "}
      <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white">
        <StoreIcon /> Create Your Store
      </Button>
    </Link>
  );
}

export { CreateYourStore };
