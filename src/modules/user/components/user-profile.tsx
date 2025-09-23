"use client";

// import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// import { formatNaira } from "@/lib/utils";
// import { shimmer, toBase64 } from "@/lib/image";
import { User, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
// import { useRouter } from "next/navigation";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";

const Profile = () => {
  // State management
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(false);
  // const router = useRouter();

  const trpc = useTRPC();
  const { data: user, isLoading } = useSuspenseQuery(
    trpc.user.getById.queryOptions()
  );

  // if (data.data) return JSON.stringify(data.data, null, 2);

  /**
   * Fetches recently viewed products from localStorage
   */
  // const fetchRecentProducts = useCallback(async () => {
  //   try {
  //     const viewedIds = JSON.parse(
  //       localStorage.getItem("recentlyViewed") || "[]"
  //     );
  //     if (viewedIds.length) {
  //       const { data } = await axios.post("/api/user/recently-viewed", {
  //         productIds: viewedIds,
  //       });
  //       setRecentProducts(data.products);
  //     }
  //   } catch (err) {
  //     console.error("Recent products error:", err);
  //   }
  // }, []);

  // useEffect(() => {
  //   fetchRecentProducts();
  // }, [fetchRecentProducts]);

  // if (loading) return <ProfileSkeleton />;
  // if (error) return <ErrorState />;
  if (isLoading) return <ProfileSkeleton />;

  return (
    <FeedbackWrapper page={`user`} delay={5000}>
      <div className="space-y-6 py-6">
        {/* Profile Header */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="sm:text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Greetings, {user.firstName}!
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
                  value: `${user.firstName} ${user.otherNames} ${user.lastName}`,
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
                { label: "City", value: user.cityOfResidence },
                { label: "State", value: user.stateOfResidence },
                { label: "Postal Code", value: user.postalCode },
              ]}
            />
          </div>
        </section>

        {/* Verification Section */}
        {!user.isVerified && <VerificationSection />}

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

// interface RecentProductsProps {
//   products: CombinedProduct[];
//   blurData: string;
// }

// const RecentProductsSection = ({ products, blurData }: RecentProductsProps) => (
//   <section className="bg-card rounded-lg p-6 shadow-xs">
//     <div className="flex items-center gap-4 mb-6">
//       <Eye className="w-8 h-8 text-primary" />
//       <h2 className="text-xl font-bold">Recently Viewed</h2>
//     </div>

//     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
//       {products.map((product) => (
//         <ProductCard key={product._id} product={product} blurData={blurData} />
//       ))}
//     </div>
//   </section>
// );

// interface ProductCardProps {
//   product: CombinedProduct;
//   blurData: string;
// }

// const ProductCard = ({ product, blurData }: ProductCardProps) => {
//   const isPhysical = product.productType === "physicalproducts";
//   const imageUrl = isPhysical ? product.images[0] : product.coverIMG[0];
//   const title = isPhysical ? product.name : product.title;
//   const price = isPhysical
//     ? product.price ?? product.sizes?.[0]?.price
//     : product.price;

//   return (
//     <Link
//       href={`/product/${product._id}`}
//       className="group relative bg-background rounded-lg border p-3 hover:shadow-md transition-shadow"
//     >
//       <div className="aspect-square relative overflow-hidden rounded-md bg-muted">
//         <Image
//           src={imageUrl}
//           alt={title}
//           fill
//           className="object-cover group-hover:scale-105 transition-transform"
//           placeholder="blur"
//           blurDataURL={blurData}
//           sizes="(max-width: 768px) 50vw, 25vw"
//         />
//       </div>
//       <div className="mt-3 space-y-1">
//         <h3 className="font-medium line-clamp-2 text-sm">{title}</h3>
//         {price && <p className="text-sm font-semibold">{formatNaira(price)}</p>}
//       </div>
//     </Link>
//   );
// };

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

// const ErrorState = () => (
//   <div className="h-screen flex items-center justify-center text-center p-4">
//     <div className="max-w-md space-y-4">
//       <h2 className="text-xl font-bold text-destructive">
//         Failed to Load Profile
//       </h2>
//       <p className="text-muted-foreground">
//         We couldn't load your profile information. Please check your connection
//         and try again.
//       </p>
//       <Button onClick={() => window.location.reload()}>Retry</Button>
//     </div>
//   </div>
// );

export default Profile;
