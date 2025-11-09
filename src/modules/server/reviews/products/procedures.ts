import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { getProductReviewModel } from "@/lib/db/models/product-review.model";
import { getUserModel, IUser } from "@/lib/db/models/user.model";
import { ProductTypeEnum } from "@/validators/product-validators";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";

type PopulatedUser = Pick<IUser, "firstName" | "email" | "lastName">;

/**
 * TRPC Router: Handles product reviews
 */
export const productReviewRouter = createTRPCRouter({
  submitReview: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        rating: z.number().min(1).max(5),
        writeUp: z.string().min(1),
        orderID: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productId, rating, writeUp, orderID } = input;
      const { user } = ctx;

      if (!user || !user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const Product = await getProductModel();

      // Try to get product type from Product or EBook
      let productType: IProduct["productType"] | null = null;

      const product = await Product.findById(productId).select("productType");
      if (product) {
        productType = ProductTypeEnum.Product;
      }

      if (!productType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const ProductReview = await getProductReviewModel();

      try {
        const newReview = await ProductReview.create({
          productId: new mongoose.Types.ObjectId(productId),
          productType,
          customerId: new mongoose.Types.ObjectId(user.id),
          rating,
          reviewText: writeUp,
          orderId: new mongoose.Types.ObjectId(orderID),
        });

        // Update average rating on the product
        const allReviews = await ProductReview.find({ productId: productId });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / allReviews.length;

        await Product.findByIdAndUpdate(productId, { rating: avgRating });

        return {
          message: "Product review created successfully.",
          review: {
            id: (
              newReview._id as unknown as mongoose.Schema.Types.ObjectId
            ).toString(),
            rating: newReview.rating,
            reviewText: newReview.reviewText,
            createdAt: newReview.createdAt,
          },
        };
      } catch (error: any) {
        if (error.code === 11000) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You have already submitted a review for this product",
          });
        }
        throw handleTRPCError(error, `Error creating review: ${error.message}`);
      }
    }),

  getReviewsByProductId: baseProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { productId } = input;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid product ID format",
          });
        }
        const ProductReview = await getProductReviewModel();
        await getUserModel();

        const reviews = await ProductReview.find({ productId: productId })
          .populate({
            path: "customerId",
            select: "firstName lastName email",
          })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        return reviews.map((review) => ({
          id: review._id.toString(),
          user:
            typeof review.customerId === "object" &&
            "firstName" in review.customerId &&
            "lastName" in review.customerId
              ? `${(review.customerId as unknown as PopulatedUser)?.firstName} ${
                  (review.customerId as unknown as PopulatedUser)?.lastName
                }`
              : "Anonymous",
          rating: review.rating,
          comment: review.reviewText,
          date: new Date(review.createdAt).toISOString().split("T")[0],
          verified: true,
        }));
      } catch (error) {
        throw handleTRPCError(error, "Error fetching reviews.");
      }
    }),
});

// const reviews = await ProductReview.find({ productId: productId })
//         .populate({
//           path: "customerId",
//           select: "firstName lastName email",
//         })
//         .sort({ createdAt: -1 })
//         .lean();

// how can i select the first 15 reviews pls?
