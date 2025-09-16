/**
 * Order Details Page
 *
 * This page displays comprehensive information about a user's order including:
 * - Order summary (date, status, total amount)
 * - Payment information
 * - Shipping details
 * - Products purchased grouped by store
 * - Delivery status for each store's order
 * - Functionality to mark orders as delivered
 * - Product review submission
 * - Product returns functionality
 *
 * @component OrderDetailsPage
 */

"use client";

import { useState, use } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { OrderHeader } from "@/modules/user/order/order-header";
import { OrderSummary } from "@/modules/user/order/order-summary";
import { StoreAccordion } from "@/modules/user/order/store-accordion";
import { ReviewDialog } from "@/modules/user/order/review-dialog";
import { ReturnsDialog } from "@/modules/user/order/returns-dialog";
import { DeliveryStatus } from "@/enums";

interface PageParams {
  slug: string;
}

export default function OrderDetailsPage(props: {
  params: Promise<PageParams>;
}) {
  const params = use(props.params);
  const [submitting, setSubmitting] = useState(false);

  // Review state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubOrderId, setSelectedSubOrderId] = useState("");
  const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
  const [selectedReturnProduct, setSelectedReturnProduct] = useState<{
    _id: string;
    name: string;
    quantity: number;
    images?: string[];
  } | null>(null);

  const trpc = useTRPC();
  const { data: orderDetails, refetch } = useSuspenseQuery(
    trpc.order.getByOrderId.queryOptions({ orderId: params.slug })
  );

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
    })
  );

  const submitReview = useMutation(
    trpc.productReview.submitReview.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        // Reset form and close dialog
        setRating(0);
        setReview("");
        setDialogOpen(false);
        setSubmitting(false);
      },
      onError: (data) => {
        toast.error(data.message);
        setSubmitting(false);
      },
    })
  );

  /**
   * Updates the delivery status of a sub-order to "Delivered"
   * @param subOrderId - The ID of the sub-order to update
   */
  const updateDeliveryStatus = async (subOrderId: string) => {
    if (!orderDetails) return;
    setSubmitting(true);

    customerConfirmedDelivery.mutate({
      mainOrderId: orderDetails._id,
      subOrderId: subOrderId,
      deliveryStatus: DeliveryStatus.Delivered,
    });
  };

  /**
   * Submits a product review to the API
   */
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

  /**
   * Initializes the review dialog with product information
   * @param productId - The ID of the product being reviewed
   */
  const handleReviewInit = (productId: string) => {
    setSelectedProductId(productId);
    setRating(0);
    setReview("");
    setDialogOpen(true);
  };

  /**
   * Initializes the returns dialog with product information
   * @param product - The product data for return
   */
  const handleReturnInit = (
    product: {
      _id: string;
      name: string;
      quantity: number;
      images?: string[];
    },
    subOrderId: string
  ) => {
    setSelectedReturnProduct(product);
    setSelectedSubOrderId(subOrderId);
    setReturnsDialogOpen(true);
  };

  /**
   * Submits a return request to the API
   * @param returnData - The return request data
   */
  const handleSubmitReturn = async (returnData: {
    productId: string;
    quantity: number;
    reason: string;
    description: string;
  }) => {
    if (!orderDetails) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderDetails._id,
          subOrderId: selectedSubOrderId,
          ...returnData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          result.message || "Return request submitted successfully"
        );
        setReturnsDialogOpen(false);
        setSelectedReturnProduct(null);
        refetch(); // Refresh order data to show return status
      } else {
        toast.error(result.message || "Failed to submit return request");
      }
    } catch (error) {
      console.error("Return request error:", error);
      toast.error("Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!orderDetails) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p>Order details not found</p>
      </div>
    );
  }

  // Count total products across all subOrders
  const totalProducts = orderDetails.subOrders.reduce(
    (total, subOrder) => total + subOrder.products.length,
    0
  );

  return (
    <main className="space-y-">
      <OrderHeader orderId={orderDetails._id} />

      <OrderSummary orderDetails={orderDetails} />

      <StoreAccordion
        subOrders={orderDetails.subOrders}
        totalProducts={totalProducts}
        storesCount={orderDetails.stores.length}
        onUpdateDeliveryStatusAction={updateDeliveryStatus}
        onReviewInitAction={handleReviewInit}
        onReturnInitAction={handleReturnInit}
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

      <ReturnsDialog
        open={returnsDialogOpen}
        setOpenAction={setReturnsDialogOpen}
        product={selectedReturnProduct}
        onSubmitAction={handleSubmitReturn}
        submitting={submitting}
      />
    </main>
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
//  *
//  * @component OrderDetailsPage
//  */

// "use client";

// import { useState, use } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import {
//   CheckCircle2,
//   CheckCircle2Icon,
//   ClipboardEditIcon,
//   Clock,
//   CreditCard,
//   DollarSign,
//   Loader,
//   MapPin,
//   Package,
//   ShoppingBag,
//   Star,
//   Store,
//   Truck,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from "@/components/ui/accordion";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { toast } from "sonner";

// import { useTRPC } from "@/trpc/client";
// import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
// import { formatNaira } from "@/lib/utils/naira";
// import { AppRouter } from "@/trpc/routers/_app";
// import { inferProcedureOutput } from "@trpc/server";
// import { getStatusBadge } from "@/lib/utils";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";

// type ProductsOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;
// type Product = ProductsOutput["subOrders"][number]["products"][number];

// interface PageParams {
//   slug: string;
// }

// export default function OrderDetailsPage(props: {
//   params: Promise<PageParams>;
// }) {
//   const params = use(props.params);
//   const [submitting, setSubmitting] = useState(false);

//   // Review state
//   const [rating, setRating] = useState(0);
//   const [review, setReview] = useState("");
//   const [selectedProductId, setSelectedProductId] = useState("");
//   const [dialogOpen, setDialogOpen] = useState(false);

//   const trpc = useTRPC();
//   const { data: orderDetails, refetch } = useSuspenseQuery(
//     trpc.order.getByOrderId.queryOptions({ orderId: params.slug })
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
//       deliveryStatus: "Delivered",
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
//    * @param subOrderId - The ID of the sub-order containing the product
//    */
//   const handleReviewInit = (productId: string) => {
//     setSelectedProductId(productId);
//     setRating(0);
//     setReview("");
//     setDialogOpen(true);
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
//     <main className="space-y-6">
//       {/* Header Section */}
//       <div className="bg-card rounded-lg shadow-xs p-6">
//         <div className="flex items-center justify-between mb-6">
//           <h1 className="text-2xl font-bold flex items-center gap-2">
//             <Package className="h-6 w-6 text-primary" />
//             Order Details
//             <Badge variant="outline" className="text-sm hidden sm:inline-block">
//               ID: {orderDetails?._id}
//             </Badge>
//           </h1>
//           <Breadcrumb className="hidden md:flex">
//             <BreadcrumbList>
//               <BreadcrumbItem>
//                 <BreadcrumbLink asChild>
//                   <Link href="/orders">Orders</Link>
//                 </BreadcrumbLink>
//               </BreadcrumbItem>
//               <BreadcrumbSeparator />
//               <BreadcrumbItem>
//                 <BreadcrumbPage>Order Details</BreadcrumbPage>
//               </BreadcrumbItem>
//             </BreadcrumbList>
//           </Breadcrumb>
//         </div>

//         {/* Order Summary */}
//         <div className="grid md:grid-cols-2 gap-6">
//           <Card className="bg-muted/50">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <ShoppingBag className="h-5 w-5 text-primary" />
//                 Order Overview
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-2">
//               <DetailItem
//                 icon={<Clock className="h-4 w-4 text-muted-foreground" />}
//                 label="Order Date"
//                 value={new Date(orderDetails.createdAt).toLocaleString()}
//               />
//               <DetailItem
//                 icon={null}
//                 label="Total Amount"
//                 value={formatNaira(orderDetails.totalAmount)}
//               />
//             </CardContent>
//           </Card>

//           <Card className="bg-muted/50">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <CreditCard className="h-5 w-5 text-primary" />
//                 Payment Info
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-2">
//               <DetailItem
//                 icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
//                 label="Payment Method"
//                 value={orderDetails.paymentMethod?.toUpperCase() || "N/A"}
//               />
//               <DetailItem
//                 icon={
//                   <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
//                 }
//                 label="Payment Status"
//                 value={orderDetails.paymentStatus?.toUpperCase() || "N/A"}
//               />
//             </CardContent>
//           </Card>

//           <Card className="bg-muted/50 col-span-2">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <Truck className="h-5 w-5 text-primary" />
//                 Delivery Info
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-2">
//               <DetailItem
//                 icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
//                 label="Shipping Address"
//                 value={
//                   orderDetails.shippingAddress?.address ?? "No address provided"
//                 }
//               />
//               <DetailItem
//                 icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
//                 label="Postal Code"
//                 value={
//                   orderDetails.shippingAddress?.postalCode ??
//                   "No postal code provided"
//                 }
//               />
//               <DetailItem
//                 icon={<Store className="h-4 w-4 text-muted-foreground" />}
//                 label="Stores"
//                 value={orderDetails.stores.length.toString()}
//               />
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       {/* Stores Accordion */}
//       <Card className="bg-card rounded-lg shadow-xs">
//         <CardHeader>
//           <CardTitle className="text-lg flex items-center gap-2">
//             <ShoppingBag className="h-5 w-5 text-primary" />
//             {totalProducts} Item{totalProducts > 1 && "s"} from{" "}
//             {orderDetails.stores.length} Store
//             {orderDetails.stores.length > 1 && "s"}
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Accordion type="single" collapsible className="w-full space-y-4">
//             {orderDetails.subOrders.map((subOrder, index) => {
//               const statusConfig = getStatusBadge(subOrder.deliveryStatus);
//               const StatusIcon = statusConfig.icon;
//               return (
//                 <AccordionItem
//                   key={index}
//                   value={`store-${index}`}
//                   className="border rounded-lg"
//                 >
//                   <AccordionTrigger className="px-4 hover:no-underline">
//                     <div className="flex items-center justify-between w-full pr-4">
//                       <div className="flex items-center gap-4">
//                         <Store className="w-5 h-5 text-primary" />
//                         <span className="font-medium">
//                           {typeof subOrder.store === "object" &&
//                           "name" in subOrder.store
//                             ? subOrder.store.name
//                             : `Store ${index + 1}`}
//                         </span>
//                       </div>
//                       <div className="flex gap-2">
//                         <div
//                           className={`p-2 rounded-full ${statusConfig.color}`}
//                         >
//                           <StatusIcon className="h-4 w-4" />
//                         </div>
//                         <Badge className={statusConfig.color}>
//                           {subOrder.deliveryStatus}
//                         </Badge>
//                       </div>
//                     </div>
//                   </AccordionTrigger>

//                   <AccordionContent className="px-4 pt-4">
//                     <div className="grid md:grid-cols-2 gap-6 mb-6">
//                       <div className="space-y-2">
//                         <DetailItem
//                           icon={
//                             <Truck className="h-4 w-4 text-muted-foreground" />
//                           }
//                           label="Shipping Method"
//                           value={subOrder.shippingMethod?.name || "N/A"}
//                         />
//                         <DetailItem
//                           icon={
//                             <Clock className="h-4 w-4 text-muted-foreground" />
//                           }
//                           label="Delivery Date"
//                           value={
//                             subOrder.deliveryDate
//                               ? new Date(
//                                   subOrder.deliveryDate
//                                 ).toLocaleDateString()
//                               : "N/A"
//                           }
//                         />

//                         {subOrder.customerConfirmedDelivery.confirmed && (
//                           <DetailItem
//                             icon={
//                               <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
//                             }
//                             label=""
//                             value={"Delivery Confirmed"}
//                           />
//                         )}
//                       </div>

//                       <div className="space-y-2">
//                         <DetailItem
//                           icon={
//                             <DollarSign className="h-4 w-4 text-muted-foreground" />
//                           }
//                           label="Shipping Cost"
//                           value={formatNaira(
//                             subOrder.shippingMethod?.price || 0
//                           )}
//                         />
//                         <DetailItem
//                           icon={
//                             <Clock className="h-4 w-4 text-muted-foreground" />
//                           }
//                           label="Estimated Delivery"
//                           value={
//                             subOrder.shippingMethod?.estimatedDeliveryDays ||
//                             "N/A"
//                           }
//                         />

//                         {!subOrder.customerConfirmedDelivery.confirmed &&
//                           !subOrder.customerConfirmedDelivery.autoConfirmed &&
//                           (subOrder.deliveryStatus === "Delivered" ||
//                             subOrder.deliveryStatus === "Out for Delivery") && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button
//                                   onClick={() =>
//                                     updateDeliveryStatus(subOrder._id || "")
//                                   }
//                                   disabled={submitting}
//                                   className="w-full mt-2 text-white bg-soraxi-green hover:bg-soraxi-green-hover"
//                                 >
//                                   {submitting ? (
//                                     <Loader className="animate-spin mr-2" />
//                                   ) : (
//                                     "Confirm Delivery"
//                                   )}
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent className="max-w-xs text-sm leading-snug">
//                                 If your order has arrived, please confirm it.{" "}
//                                 <br />
//                                 This helps us release payment to the seller.{" "}
//                                 <br />
//                                 You can also confirm when it's marked as{" "}
//                                 <strong>Out for Delivery</strong>.
//                               </TooltipContent>
//                             </Tooltip>
//                           )}

//                         {subOrder.customerConfirmedDelivery.confirmed && (
//                           <DetailItem
//                             icon={
//                               <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
//                             }
//                             label="Delivery Confirmed On"
//                             value={
//                               subOrder.customerConfirmedDelivery.confirmedAt
//                                 ? new Date(
//                                     subOrder.customerConfirmedDelivery.confirmedAt
//                                   ).toLocaleDateString()
//                                 : "N/A"
//                             }
//                           />
//                         )}

//                         {subOrder.customerConfirmedDelivery.autoConfirmed && (
//                           <DetailItem
//                             icon={
//                               <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
//                             }
//                             label=""
//                             value={"Auto Confirmed"}
//                           />
//                         )}
//                       </div>
//                     </div>

//                     <Separator className="mb-6" />

//                     {/* Products Grid */}
//                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
//                       {subOrder.products.map((product, productIndex) => (
//                         <ProductItem
//                           key={`${productIndex}`}
//                           product={product}
//                           onReviewInit={(id) => handleReviewInit(id)}
//                           deliveryStatus={subOrder.deliveryStatus}
//                         />
//                       ))}
//                     </div>
//                   </AccordionContent>
//                 </AccordionItem>
//               );
//             })}
//           </Accordion>
//         </CardContent>
//       </Card>

//       {/* Review Dialog - unchanged */}
//       <ReviewDialog
//         open={dialogOpen}
//         setOpen={setDialogOpen}
//         rating={rating}
//         setRating={setRating}
//         review={review}
//         setReview={setReview}
//         onSubmit={handleSubmitReview}
//         submitting={submitting}
//       />
//     </main>
//   );
// }

// // Enhanced DetailItem component with icon
// const DetailItem = ({
//   icon,
//   label,
//   value,
//   valueClassName,
// }: {
//   icon?: React.ReactNode;
//   label: string;
//   value: string | number;
//   valueClassName?: string;
// }) => (
//   <div className="flex justify-between items-center py-2 border-b">
//     <span className="text-sm text-muted-foreground flex items-center gap-2">
//       {icon}
//       {label}
//     </span>
//     <span className={`text-sm font-medium ${valueClassName || ""}`}>
//       {value || "N/A"}
//     </span>
//   </div>
// );

// /**
//  * Product Item Component
//  *
//  * Displays a single product from an order with its image, details,
//  * deal information, and a button to review the product if it has been delivered.
//  *
//  * @component ProductItem
//  * @param {Object} props - Component props
//  * @param {ProductOrder} props.product - The product data to display
//  * @param {Function} props.onReviewInit - Callback when review button is clicked
//  * @param {string} props.deliveryStatus - The delivery status of the product
//  */
// const ProductItem = ({
//   product,
//   onReviewInit,
//   deliveryStatus,
// }: {
//   product: Product;
//   onReviewInit: (id: string) => void;
//   deliveryStatus?: string;
// }) => {
//   if (product.Product) {
//     return (
//       <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-0">
//         <div className="relative overflow-hidden rounded-t-lg">
//           <Image
//             src={
//               product.Product.images?.[0] ||
//               "/placeholder.svg?height=200&width=300"
//             }
//             height={200}
//             width={300}
//             alt={product.Product.name}
//             className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
//           />
//         </div>
//         <CardContent className="pb-4">
//           <div className="space-y-2">
//             <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
//               {product.Product.name}
//             </h3>
//             <p className="text-sm text-muted-foreground">
//               Quantity: {product.quantity}
//             </p>
//             {deliveryStatus === "Delivered" && (
//               <Button
//                 className="mt-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white w-full text-sm flex items-center gap-2"
//                 onClick={() => onReviewInit(product.Product._id)}
//                 aria-label="Review product"
//                 size="sm"
//               >
//                 <ClipboardEditIcon className="h-4 w-4" />
//                 Write Review
//               </Button>
//             )}
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   return null;
// };

// /**
//  * Review Dialog Component
//  *
//  * A modal dialog for submitting product reviews with star rating
//  * and text feedback.
//  *
//  * @component ReviewDialog
//  * @param {Object} props - Component props
//  * @param {boolean} props.open - Whether the dialog is open
//  * @param {Function} props.setOpen - Function to set the open state
//  * @param {number} props.rating - The current rating value
//  * @param {Function} props.setRating - Function to set the rating
//  * @param {string} props.review - The review text
//  * @param {Function} props.setReview - Function to set the review text
//  * @param {Function} props.onSubmit - Function to handle form submission
//  * @param {boolean} props.submitting - Whether the form is currently submitting
//  */
// const ReviewDialog = ({
//   open,
//   setOpen,
//   rating,
//   setRating,
//   review,
//   setReview,
//   onSubmit,
//   submitting,
// }: {
//   open: boolean;
//   setOpen: (open: boolean) => void;
//   rating: number;
//   setRating: (rating: number) => void;
//   review: string;
//   setReview: (review: string) => void;
//   onSubmit: () => Promise<void>;
//   submitting: boolean;
// }) => {
//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogContent className="max-w-md">
//         <DialogHeader>
//           <DialogTitle>Write a Product Review</DialogTitle>
//           <DialogDescription>
//             Share your experience with this product to help other shoppers
//           </DialogDescription>
//         </DialogHeader>

//         <div className="space-y-6 py-2">
//           <div className="space-y-2">
//             <label className="text-sm font-medium">Rating</label>
//             <div className="flex justify-center gap-2">
//               {[...Array(5)].map((_, i) => {
//                 const value = i + 1;
//                 return (
//                   <button
//                     key={value}
//                     onClick={() => setRating(value)}
//                     className="focus:outline-hidden transition-transform hover:scale-110"
//                     aria-label={`Rate ${value} stars`}
//                     type="button"
//                   >
//                     <Star
//                       className={`h-8 w-8 transition-colors ${
//                         value <= rating
//                           ? "text-yellow-500 fill-yellow-500"
//                           : "text-gray-300"
//                       }`}
//                     />
//                   </button>
//                 );
//               })}
//             </div>
//             {rating > 0 && (
//               <p className="text-center text-sm text-muted-foreground">
//                 {rating === 1 && "Poor"}
//                 {rating === 2 && "Fair"}
//                 {rating === 3 && "Good"}
//                 {rating === 4 && "Very Good"}
//                 {rating === 5 && "Excellent"}
//               </p>
//             )}
//           </div>

//           <div className="space-y-2">
//             <label htmlFor="review" className="text-sm font-medium">
//               Your Review
//             </label>
//             <Textarea
//               id="review"
//               value={review}
//               onChange={(e) => setReview(e.target.value)}
//               placeholder="What did you like or dislike? How was your experience with this product?"
//               className="min-h-[120px] resize-none"
//             />
//             <p className="text-xs text-muted-foreground">
//               Your review helps other shoppers make informed decisions
//             </p>
//           </div>
//         </div>

//         <DialogFooter className="flex gap-2 sm:gap-2">
//           <Button
//             variant="outline"
//             onClick={() => setOpen(false)}
//             disabled={submitting}
//           >
//             Cancel
//           </Button>
//           <Button
//             type="submit"
//             className="bg-soraxi-green hover:bg-soraxi-green/85 text-white"
//             onClick={onSubmit}
//             disabled={submitting || !rating || !review.trim()}
//           >
//             {submitting ? (
//               <>
//                 <Loader className="mr-2 h-4 w-4 animate-spin" />
//                 Submitting...
//               </>
//             ) : (
//               "Submit Review"
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };
