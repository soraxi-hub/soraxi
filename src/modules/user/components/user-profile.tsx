"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Store,
  Plus,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import { StoreStatusEnum } from "@/enums";
import { ProfileSkeleton } from "@/modules/skeletons/profile-skeleton";
import { cn } from "@/lib/utils";
import { UserStoreSummary } from "@/domain/users/user-interface";
// import { RecentlyViewed } from "@/modules/products/product-detail/recently-viewed";

const Profile = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useSuspenseQuery(
    trpc.user.getById.queryOptions(),
  );

  if (isLoading) return <ProfileSkeleton />;

  const user = data.user;
  const userStores = data.userStoreSummary;

  return (
    <FeedbackWrapper page={`user`} delay={120000}>
      <div className="space-y-6 py-6">
        {/* Profile Header */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="sm:text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              {user.displayGreeting}
            </h1>
            {user.isVerified && (
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
                  value: user.fullName,
                },
                {
                  label: "Email",
                  value: user.email,
                  icon: <Mail className="w-4 h-4" />,
                },
                {
                  label: "Phone",
                  value: user.phoneNumber,
                  icon: <Phone className="w-4 h-4" />,
                },
              ]}
            />

            <DetailSection
              icon={<MapPin className="w-5 h-5" />}
              title="Shipping Address"
              items={[
                { label: "Address", value: user.address },
                { label: "City", value: user.city },
                { label: "State", value: user.state },
                { label: "Postal Code", value: user.postalCode },
              ]}
            />
          </div>
        </section>

        {/* Verification Section */}
        {!user.isVerified && <VerificationSection />}

        <UserStores stores={userStores} />

        {/* Recently Viewed */}
        {/* <div className="mt-12">
          <RecentlyViewed />
        </div> */}
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

const UserStores = ({ stores }: { stores: UserStoreSummary[] }) => (
  <section className="space-y-4">
    <h2 className="text-xl font-bold flex items-center gap-2">
      <Store className="w-5 h-5" />
      My Storefront
    </h2>

    {stores.length > 0 ? (
      <div className="space-y-3">
        {stores.map((store) => (
          <StoreCard key={store.storeId} store={store} />
        ))}
      </div>
    ) : (
      <EmptyStoresState />
    )}
  </section>
);

// Status dot + label shown inline next to the store name
const StatusIndicator = ({ status }: { status: StoreStatusEnum }) => {
  const config = {
    [StoreStatusEnum.Active]: { label: "Active", dot: "bg-soraxi-green" },
    [StoreStatusEnum.Pending]: {
      label: "Under Review",
      dot: "bg-soraxi-warning",
    },
    [StoreStatusEnum.Rejected]: {
      label: "Not Approved",
      dot: "bg-soraxi-error",
    },
    [StoreStatusEnum.Suspended]: { label: "Suspended", dot: "bg-soraxi-error" },
  }[status];

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className={cn("w-2 h-2 rounded-full", config.dot)} />
      <span className="text-sm font-medium text-muted-foreground">
        {config.label}
      </span>
    </span>
  );
};

// Store Card Component
const StoreCard = ({ store }: { store: UserStoreSummary }) => {
  const isActive = store.status === StoreStatusEnum.Active;
  const isPending = store.status === StoreStatusEnum.Pending;
  const isRejected = store.status === StoreStatusEnum.Rejected;
  const isSuspended = store.status === StoreStatusEnum.Suspended;

  return (
    <div className={cn("border rounded-lg p-5")}>
      {/* Identity row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-base">{store.storeName}</h3>
            <StatusIndicator status={store.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isActive && "Your storefront is live and accepting orders."}
            {isPending &&
              "Your application is under review. We'll notify you by email once a decision is made."}
            {isRejected &&
              "Your application was not approved. You're welcome to submit a new one."}
            {isSuspended &&
              "Your store has been suspended. Contact support for assistance."}
          </p>
        </div>
      </div>

      <div className="border-t my-4" />

      {/* Status-aware actions */}
      <div className="flex gap-2 flex-wrap">
        {isActive && (
          <>
            <Button
              asChild
              size="sm"
              className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
            >
              <Link href={`/store/${store.storeId}/dashboard`}>
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/brand/${store.storeId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                View Storefront
              </Link>
            </Button>
          </>
        )}
        {isPending && (
          <Button asChild variant="outline" size="sm">
            <Link href="/store/waitlist/status">View Application Status</Link>
          </Button>
        )}
        {isRejected && (
          <Button
            asChild
            size="sm"
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            <Link href="/store/onboarding">
              <Plus className="w-4 h-4 mr-1.5" />
              Apply Again
            </Link>
          </Button>
        )}
        {isSuspended && (
          <Button asChild variant="outline" size="sm">
            <Link href="/support">Contact Support</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

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

export default Profile;
