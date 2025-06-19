import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "react-day-picker";

function CreateStoreOption() {
  const router = useRouter();
  /**
   * Handle store creation navigation
   */
  const handleCreateStore = () => {
    router.push("/dashboard/store/create");
  };

  /**
   * Handle store login navigation
   */
  const handleStoreLogin = () => {
    router.push("/store/login?redirect=/dashboard/store");
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-8 h-8 text-soraxi-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Start Selling Today
          </h1>
          <p className="text-muted-foreground">
            Create your store and start reaching customers on our platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Store</CardTitle>
            <CardDescription>
              Set up your online store in minutes and start selling to thousands
              of customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCreateStore}
              className="w-full bg-soraxi-green hover:bg-soraxi-green/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Store
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Already have a store?
              </p>
              <Button onClick={handleStoreLogin} className="w-full">
                Sign In to Existing Store
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CreateStoreOption;
