import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

function PostWhatYouNeed() {
  return (
    <Link href={"/requests/new"} className="hidden lg:inline-flex">
      {" "}
      <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white">
        <PlusIcon /> Post What You Need
      </Button>
    </Link>
  );
}

export default PostWhatYouNeed;
