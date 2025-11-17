"use client";

// import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// import { formatNaira } from "@/lib/utils";
// import { shimmer, toBase64 } from "@/lib/image";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Store,
  Plus,
  Settings,
} from "lucide-react";
// import { useRouter } from "next/navigation";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import { UserFactory } from "@/domain/users/user-factory";
import { cn, truncateText } from "@/lib/utils";
import { StoreStatusEnum } from "@/validators/store-validators";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const Profile = () => {
  // State management
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(false);
  // const router = useRouter();

  const trpc = useTRPC();
  const { data, isLoading } = useSuspenseQuery(
    trpc.user.getById.queryOptions()
  );

  const user = UserFactory.createProfileUser(data);

  // if (data.data) return JSON.stringify(data.data, null, 2);

  if (isLoading) return <ProfileSkeleton />;

  return (
    <FeedbackWrapper page={`user`} delay={5000}>
      <div className="space-y-6 py-6">
        {/* Profile Header */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="sm:text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Greetings, {user.getUserFirstName()}!
            </h1>
            {user.getUserIsVerified() && (
              <Badge className="bg-green-100 text-green-800 hover:bg-inherit">
                <ShieldCheck className="w-4 h-4 mr-1" />
                Verified Account
              </Badge>
            )}
          </div>

          {/* Profile Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <DetailSection
              icon={<User className="w-5 h-5" />}
              title="Personal Information"
              items={[
                {
                  label: "Full Name",
                  value: truncateText(user.getUserFullName(), 40) as string,
                },
                {
                  label: "Email",
                  value: user.getUserEmail(),
                  icon: <Mail className="w-4 h-4" />,
                },
                {
                  label: "Phone",
                  value: user.getUserPhoneNumber(),
                  icon: <Phone className="w-4 h-4" />,
                },
              ]}
            />

            <DetailSection
              icon={<MapPin className="w-5 h-5" />}
              title="Shipping Address"
              items={[
                { label: "Address", value: user.getUserAddress() },
                { label: "City", value: user.getUserCityOfResidence() },
                { label: "State", value: user.getUserStateOfResidence() },
                { label: "Postal Code", value: user.getUserPostalCode() },
              ]}
            />
          </div>
        </section>

        {/* Verification Section */}
        {!user.getUserIsVerified() && <VerificationSection />}

        {user.getUserStores().length > 0 && (
          <UserStores stores={user.getUserStores()} />
        )}

        {/* Recently Viewed Products */}
        {/* {recentProducts.length > 0 && (
            <RecentProductsSection
              products={recentProducts}
              blurData={blurData}
            />
          )} */}
      </div>
    </FeedbackWrapper>
  );
};

// Sub-components with TypeScript interfaces
interface DetailSectionProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
  }>;
}

const DetailSection = ({ icon, title, items }: DetailSectionProps) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <div className="bg-primary/10 p-2 rounded-lg">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>

    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          {item.icon && (
            <span className="text-muted-foreground">{item.icon}</span>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="font-medium">{item.value || "Not provided"}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const VerificationSection = () => (
  <section className="bg-card dark:bg-muted/50 rounded-lg p-6 shadow-xs border border-soraxi-green/20">
    <div className="flex items-center gap-4 mb-4">
      <ShieldCheck className="w-8 h-8 text-soraxi-green" />
      <h2 className="text-xl font-bold">Account Verification</h2>
    </div>

    <div className="space-y-3">
      <p className="text-muted-foreground">
        Verify your account to access full platform features.
      </p>
      <Button
        asChild
        className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
      >
        <Link href="/verification">Complete Verification</Link>
      </Button>
    </div>
  </section>
);

const UserStores = ({
  stores,
}: {
  stores: Array<{ storeId: string; name: string; status: StoreStatusEnum }>;
}) => (
  <section className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Store className="w-5 h-5 text-soraxi-blue" />
        My Stores
      </h2>
      <Button asChild className="bg-soraxi-blue hover:bg-soraxi-blue/90">
        <Link href="/stores/create">
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Link>
      </Button>
    </div>

    <div className="bg-card dark:bg-muted/50 rounded-lg p-6 shadow-xs border border-soraxi-blue/20">
      {stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store, index) => (
            <StoreCard key={store.storeId} store={store} index={index} />
          ))}
        </div>
      ) : (
        <EmptyStoresState />
      )}
    </div>
  </section>
);

// Store Card Component
const StoreCard = ({
  store,
}: {
  store: { storeId: string; name: string; status: StoreStatusEnum };
  index: number;
}) => (
  <Card className="gap-1">
    <CardHeader className="flex items-start justify-between mb-3">
      <div className="bg-soraxi-green p-2 rounded-lg">
        <Store className="w-4 h-4 text-white" />
      </div>
      <Badge
        className={cn(
          `text-white`,
          store.status === StoreStatusEnum.Active && "bg-soraxi-green",
          store.status === StoreStatusEnum.Pending && "bg-soraxi-warning",
          (store.status === StoreStatusEnum.Rejected ||
            store.status === StoreStatusEnum.Suspended) &&
            "bg-soraxi-error"
        )}
      >
        {store.status.charAt(0).toUpperCase() + store.status.slice(1)}
      </Badge>
    </CardHeader>

    <CardContent>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-soraxi-blue transition-colors">
        {truncateText(store.name)}
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        Store ID: {truncateText(store.storeId, 12)}
      </p>
    </CardContent>
    <CardFooter className="flex gap-2">
      <Button asChild variant="outline" size="sm" className="flex-1">
        <Link href={`/store/${store.storeId}/dashboard`}>
          <Settings className="w-3 h-3 mr-1" />
          Manage
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

// Empty State Component
const EmptyStoresState = () => (
  <div className="text-center py-8">
    <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
      <Store className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">No stores yet</h3>
    <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
      Start listing your products by creating your first store and reach
      thousands of customers.
    </p>
    <Button
      asChild
      className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
    >
      <Link href="/store/onboarding/">
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Store
      </Link>
    </Button>
  </div>
);

// Loading and Error States
const ProfileSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full rounded-lg" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    </div>
  </div>
);

export default Profile;
