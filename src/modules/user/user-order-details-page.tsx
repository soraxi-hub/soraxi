"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { OrderHeader } from "@/modules/user/order/order-header";
import { OrderSummary } from "@/modules/user/order/order-summary";
import { StoreAccordion } from "@/modules/user/order/store-accordion";
import { ReviewDialog } from "@/modules/user/order/review-dialog";
import { DisputeDialog } from "@/modules/user/order/dispute-dialog";
import { DeliveryStatus } from "@/enums";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { OrderDetailsSkeleton } from "../skeletons/user-order-details-skeleton";

export default function OrderDetailsPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Review state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dispute state — replaces returns state
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [selectedDisputeSubOrderId, setSelectedDisputeSubOrderId] =
    useState("");
  const [selectedDisputeStoreName, setSelectedDisputeStoreName] = useState("");

  const trpc = useTRPC();

  const { data: orderDetails, refetch } = useSuspenseQuery(
    trpc.order.getByOrderId.queryOptions({ orderId: slug }),
  );

  // Fetch financial statuses for all suborders
  // Used to determine whether to show dispute button, dispute open badge, etc.
  const { data: financialStatusData } = useQuery(
    trpc.customerDispute.getSuborderFinancialStatuses.queryOptions({
      orderId: slug,
    }),
  );

  const financialStatuses = financialStatusData?.statuses ?? {};

  const customerConfirmedDelivery = useMutation(
    trpc.order.customerConfirmedDelivery.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setSubmitting(false);
        refetch();
      },
      onError: (data) => {
        toast.error(data.message);
        setSubmitting(false);
      },
    }),
  );

  const submitReview = useMutation(
    trpc.productReview.submitReview.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setRating(0);
        setReview("");
        setDialogOpen(false);
        setSubmitting(false);
      },
      onError: (data) => {
        toast.error(data.message);
        setSubmitting(false);
      },
    }),
  );

  const updateDeliveryStatus = async (subOrderId: string) => {
    if (!orderDetails) return;
    setSubmitting(true);

    customerConfirmedDelivery.mutate({
      mainOrderId: orderDetails._id,
      subOrderId: subOrderId,
      deliveryStatus: DeliveryStatus.Delivered,
    });
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    if (!review.trim() || !rating) {
      toast.error(`Please provide both a rating and review`);
      return;
    }

    submitReview.mutate({
      rating,
      writeUp: review,
      orderID: orderDetails?._id,
      productId: selectedProductId,
    });
  };

  const handleReviewInit = (productId: string) => {
    setSelectedProductId(productId);
    setRating(0);
    setReview("");
    setDialogOpen(true);
  };

  /**
   * Opens the dispute dialog for a specific suborder.
   * Called from StoreAccordion when student clicks "Raise a Dispute".
   */
  const handleDisputeInit = (subOrderId: string, storeName: string) => {
    setSelectedDisputeSubOrderId(subOrderId);
    setSelectedDisputeStoreName(storeName);
    setDisputeDialogOpen(true);
  };

  /**
   * Called after a dispute is successfully submitted.
   * Refreshes the order data to update financial statuses,
   * then navigates to the dispute status page.
   */
  const handleDisputeSuccess = async (disputeId: string) => {
    toast.success("Dispute submitted successfully.");
    await refetch();
    router.push(`/orders/${slug}/dispute/${disputeId}`);
  };

  if (!orderDetails) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p>Order details not found</p>
      </div>
    );
  }

  const totalProducts = orderDetails.subOrders.reduce(
    (total, subOrder) => total + subOrder.products.length,
    0,
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<OrderDetailsSkeleton />}>
        <main className="space-y-">
          <OrderHeader orderId={orderDetails._id} />

          <OrderSummary orderDetails={orderDetails} />

          <StoreAccordion
            subOrders={orderDetails.subOrders}
            totalProducts={totalProducts}
            storesCount={orderDetails.stores.length}
            orderId={slug}
            financialStatuses={financialStatuses}
            onUpdateDeliveryStatusAction={updateDeliveryStatus}
            onReviewInitAction={handleReviewInit}
            onDisputeInitAction={handleDisputeInit}
            submitting={submitting}
          />

          <ReviewDialog
            open={dialogOpen}
            setOpenAction={setDialogOpen}
            rating={rating}
            setRatingAction={setRating}
            review={review}
            setReviewAction={setReview}
            onSubmitAction={handleSubmitReview}
            submitting={submitting}
          />

          {/* Dispute dialog — replaces ReturnsDialog */}
          {orderDetails._id && selectedDisputeSubOrderId && (
            <DisputeDialog
              open={disputeDialogOpen}
              setOpenAction={setDisputeDialogOpen}
              orderId={orderDetails._id}
              subOrderId={selectedDisputeSubOrderId}
              storeName={selectedDisputeStoreName}
              onSuccessAction={handleDisputeSuccess}
              submitting={submitting}
              setSubmittingAction={setSubmitting}
            />
          )}
        </main>
      </Suspense>
    </ErrorBoundary>
  );
}

// /**
//  * Order Details Page
//  *
//  * This page displays comprehensive information about a user's order including:
//  * - Order summary (date, status, total amount)
//  * - Payment information
//  * - Shipping details
//  * - Products purchased grouped by store
//  * - Delivery status for each store's order
//  * - Functionality to mark orders as delivered
//  * - Product review submission
//  * - Product returns functionality
//  *
//  * @component OrderDetailsPage
//  */

// "use client";

// import { useState, Suspense } from "react";
// import { toast } from "sonner";

// import { useTRPC } from "@/trpc/client";
// import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

// import { OrderHeader } from "@/modules/user/order/order-header";
// import { OrderSummary } from "@/modules/user/order/order-summary";
// import { StoreAccordion } from "@/modules/user/order/store-accordion";
// import { ReviewDialog } from "@/modules/user/order/review-dialog";
// import { ReturnsDialog } from "@/modules/user/order/returns-dialog";
// import { DeliveryStatus } from "@/enums";
// import { ErrorBoundary } from "react-error-boundary";
// import { ErrorFallback } from "@/components/errors/error-fallback";
// import { OrderDetailsSkeleton } from "../skeletons/user-order-details-skeleton";

// export default function OrderDetailsPage({ slug }: { slug: string }) {
//   const [submitting, setSubmitting] = useState(false);

//   // Review state
//   const [rating, setRating] = useState(0);
//   const [review, setReview] = useState("");
//   const [selectedProductId, setSelectedProductId] = useState("");
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [selectedSubOrderId, setSelectedSubOrderId] = useState("");
//   const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
//   const [selectedReturnProduct, setSelectedReturnProduct] = useState<{
//     _id: string;
//     name: string;
//     quantity: number;
//     images?: string[];
//   } | null>(null);

//   const trpc = useTRPC();
//   const { data: orderDetails, refetch } = useSuspenseQuery(
//     trpc.order.getByOrderId.queryOptions({ orderId: slug })
//   );

//   const customerConfirmedDelivery = useMutation(
//     trpc.order.customerConfirmedDelivery.mutationOptions({
//       onSuccess: (data) => {
//         toast.success(data.message);
//         setSubmitting(false);
//         refetch();
//       },
//       onError: (data) => {
//         toast.error(data.message);
//         setSubmitting(false);
//       },
//     })
//   );

//   const submitReview = useMutation(
//     trpc.productReview.submitReview.mutationOptions({
//       onSuccess: (data) => {
//         toast.success(data.message);
//         // Reset form and close dialog
//         setRating(0);
//         setReview("");
//         setDialogOpen(false);
//         setSubmitting(false);
//       },
//       onError: (data) => {
//         toast.error(data.message);
//         setSubmitting(false);
//       },
//     })
//   );

//   /**
//    * Updates the delivery status of a sub-order to "Delivered"
//    * @param subOrderId - The ID of the sub-order to update
//    */
//   const updateDeliveryStatus = async (subOrderId: string) => {
//     if (!orderDetails) return;
//     setSubmitting(true);

//     customerConfirmedDelivery.mutate({
//       mainOrderId: orderDetails._id,
//       subOrderId: subOrderId,
//       deliveryStatus: DeliveryStatus.Delivered,
//     });
//   };

//   /**
//    * Submits a product review to the API
//    */
//   const handleSubmitReview = async () => {
//     setSubmitting(true);
//     if (!review.trim() || !rating) {
//       toast.error(`Please provide both a rating and review`);
//       return;
//     }

//     submitReview.mutate({
//       rating,
//       writeUp: review,
//       orderID: orderDetails?._id,
//       productId: selectedProductId,
//     });
//   };

//   /**
//    * Initializes the review dialog with product information
//    * @param productId - The ID of the product being reviewed
//    */
//   const handleReviewInit = (productId: string) => {
//     setSelectedProductId(productId);
//     setRating(0);
//     setReview("");
//     setDialogOpen(true);
//   };

//   /**
//    * Initializes the returns dialog with product information
//    * @param product - The product data for return
//    */
//   const handleReturnInit = (
//     product: {
//       _id: string;
//       name: string;
//       quantity: number;
//       images?: string[];
//     },
//     subOrderId: string
//   ) => {
//     setSelectedReturnProduct(product);
//     setSelectedSubOrderId(subOrderId);
//     setReturnsDialogOpen(true);
//   };

//   /**
//    * Submits a return request to the API
//    * @param returnData - The return request data
//    */
//   const handleSubmitReturn = async (returnData: {
//     productId: string;
//     quantity: number;
//     reason: string;
//     description: string;
//   }) => {
//     if (!orderDetails) return;

//     setSubmitting(true);

//     try {
//       const response = await fetch("/api/returns", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           orderId: orderDetails._id,
//           subOrderId: selectedSubOrderId,
//           ...returnData,
//         }),
//       });

//       const result = await response.json();

//       if (response.ok) {
//         toast.success(
//           result.message || "Return request submitted successfully"
//         );
//         setReturnsDialogOpen(false);
//         setSelectedReturnProduct(null);
//         refetch(); // Refresh order data to show return status
//       } else {
//         toast.error(result.message || "Failed to submit return request");
//       }
//     } catch (error) {
//       console.error("Return request error:", error);
//       toast.error("Failed to submit return request");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!orderDetails) {
//     return (
//       <div className="w-full min-h-screen flex items-center justify-center">
//         <p>Order details not found</p>
//       </div>
//     );
//   }

//   // Count total products across all subOrders
//   const totalProducts = orderDetails.subOrders.reduce(
//     (total, subOrder) => total + subOrder.products.length,
//     0
//   );

//   return (
//     <ErrorBoundary FallbackComponent={ErrorFallback}>
//       <Suspense fallback={<OrderDetailsSkeleton />}>
//         <main className="space-y-">
//           <OrderHeader orderId={orderDetails._id} />

//           <OrderSummary orderDetails={orderDetails} />

//           <StoreAccordion
//             subOrders={orderDetails.subOrders}
//             totalProducts={totalProducts}
//             storesCount={orderDetails.stores.length}
//             onUpdateDeliveryStatusAction={updateDeliveryStatus}
//             onReviewInitAction={handleReviewInit}
//             onReturnInitAction={handleReturnInit}
//             submitting={submitting}
//           />

//           <ReviewDialog
//             open={dialogOpen}
//             setOpenAction={setDialogOpen}
//             rating={rating}
//             setRatingAction={setRating}
//             review={review}
//             setReviewAction={setReview}
//             onSubmitAction={handleSubmitReview}
//             submitting={submitting}
//           />

//           <ReturnsDialog
//             open={returnsDialogOpen}
//             setOpenAction={setReturnsDialogOpen}
//             product={selectedReturnProduct}
//             onSubmitAction={handleSubmitReturn}
//             submitting={submitting}
//           />
//         </main>
//       </Suspense>
//     </ErrorBoundary>
//   );
// }
