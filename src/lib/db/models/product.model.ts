import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import slugify from "slugify";
import { koboToNaira, nairaToKobo } from "@/lib/utils/naira";

/**
 * Interface for Product document
 */
export interface IProduct extends Document {
  storeID: mongoose.Types.ObjectId;
  productType: "Product" | "digitalproducts";
  name: string;
  price?: number;
  sizes?: {
    size: string;
    price: number;
    quantity: number;
  }[];
  productQuantity: number;
  images: string[];
  description: string;
  specifications: string;
  category: string[];
  subCategory: string[];
  isVerifiedProduct: boolean;
  status: "pending" | "approved" | "rejected";
  isVisible: boolean;
  slug: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;

  formattedPrice?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    storeID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: [true, "Store ID is required"],
    },
    productType: {
      type: String,
      enum: ["Product", "digitalproducts"],
      default: "Product",
      required: [true, "Product type is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      index: true,
    },
    price: {
      type: Number,
      required: function () {
        return !this.sizes || this.sizes.length === 0;
      },
      set: (price: number) => nairaToKobo(price),
      get: (price: number) => koboToNaira(price),
    },
    sizes: [
      {
        size: { type: String },
        price: { type: Number },
        quantity: { type: Number },
      },
    ],
    productQuantity: {
      type: Number,
      required: [true, "Product quantity is required"],
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      index: true,
    },
    specifications: {
      type: String,
      required: [true, "Specifications are required"],
    },
    category: {
      type: [String],
      required: [true, "Category is required"],
      index: true,
    },
    subCategory: {
      type: [String],
      required: [true, "Subcategory is required"],
      index: true,
    },
    isVerifiedProduct: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    rating: {
      type: Number,
      min: [0, "Rating must be at least 0"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

ProductSchema.index(
  {
    name: "text",
    description: "text",
    category: "text",
    subCategory: "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
      category: 3,
      subCategory: 1,
    },
    name: "TextIndex",
  }
);

ProductSchema.pre("save", async function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    const Product = mongoose.model<IProduct>("Product");
    const slugRegEx = new RegExp(`^(${this.slug})(-[0-9]*)?$`, "i");
    const existing = await Product.find({ slug: slugRegEx });

    if (existing.length > 0) {
      this.slug = `${this.slug}-${existing.length + 1}`;
    }
  }
  next();
});

export async function getProductModel(): Promise<Model<IProduct>> {
  await connectToDatabase();
  return (
    (mongoose.models.Product as Model<IProduct>) ||
    mongoose.model<IProduct>("Product", ProductSchema)
  );
}

// export async function getProducts(
//   options: {
//     visibleOnly?: boolean;
//     category?: string;
//     subCategory?: string;
//     limit?: number;
//     skip?: number;
//     minRating?: number;
//     search?: string | null;
//     verified?: boolean;
//     sort?: "newest" | "price-asc" | "price-desc" | "rating-desc";
//     priceMin?: number;
//     priceMax?: number;
//     ratings?: number[];
//     cursor?: string;
//   } = {}
// ): Promise<IProduct[]> {
//   await connectToDatabase();
//   const Product = await getProductModel();

//   const query: { [key: string]: any } = {};

//   if (options.visibleOnly) query.isVisible = true;
//   if (options.category) query.category = options.category;
//   if (options.subCategory) {
//     query.subCategory = {
//       $elemMatch: { $regex: `^${options.subCategory}$`, $options: "i" },
//     };
//   }
//   if (options.minRating !== undefined)
//     query.rating = { $gte: options.minRating };
//   if (options.verified === true) query.isVerifiedProduct = true;
//   if (options.search) query.$text = { $search: options.search };
//   if (options.priceMin !== undefined || options.priceMax !== undefined) {
//     query.price = {};
//     if (options.priceMin !== undefined)
//       query.price.$gte = nairaToKobo(options.priceMin);
//     if (options.priceMax !== undefined)
//       query.price.$lte = nairaToKobo(options.priceMax);
//   }
//   if (options.ratings && options.ratings.length > 0) {
//     query.rating = { $in: options.ratings.map((r) => Number(r)) };
//   }

//   // Build sort logic
//   let sortQuery: { [key: string]: 1 | -1 } = { createdAt: -1 }; // default sort: newest
//   switch (options.sort) {
//     case "price-asc":
//       sortQuery = { price: 1 };
//       break;
//     case "price-desc":
//       sortQuery = { price: -1 };
//       break;
//     case "rating-desc":
//       sortQuery = { rating: -1 };
//       break;
//     // You can add more sort cases if needed
//   }

//   let productQuery = Product.find<IProduct>(query).sort(sortQuery);

//   if (options.skip !== undefined)
//     productQuery = productQuery.skip(options.skip);
//   if (options.limit !== undefined)
//     productQuery = productQuery.limit(options.limit);

//   return productQuery;
// }

/**
 * Fetch products with optional filters and cursor-based pagination.
 *
 * @function getProducts
 * @async
 *
 * @param {Object} [options={}] - Options to filter and paginate products.
 * @param {boolean} [options.visibleOnly] - If true, only return products marked as visible.
 * @param {string} [options.category] - Filter by category name.
 * @param {string} [options.subCategory] - Filter by subCategory name.
 * @param {number} [options.limit] - Number of products to fetch (default is 20).
 * @param {string} [options.cursor] - The last seen product's `_id` (used for cursor-based pagination).
 * @param {number} [options.minRating] - Minimum rating threshold for filtering.
 * @param {string|null} [options.search] - Full-text search query.
 * @param {boolean} [options.verified] - If true, only verified products are returned.
 * @param {"newest"|"price-asc"|"price-desc"|"rating-desc"} [options.sort="newest"] - Sorting option.
 * @param {number} [options.priceMin] - Minimum product price.
 * @param {number} [options.priceMax] - Maximum product price.
 * @param {number[]} [options.ratings] - Array of specific rating values to filter by.
 *
 * @returns {Promise<IProduct[]>} A promise resolving to an array of products matching filters and pagination.
 *
 * @description
 * Supports infinite scroll via **cursor-based pagination**.
 * - Sort field depends on `options.sort` (e.g., `createdAt`, `price`, `rating`).
 * - Cursor is applied using `$lt` or `$gt` depending on the sort order.
 *
 * @example
 * // Fetch 10 newest products
 * const products = await getProducts({ limit: 10, sort: "newest" });
 *
 * @example
 * // Fetch next page of products using cursor
 * const moreProducts = await getProducts({ limit: 10, cursor: lastProductId });
 */
export async function getProducts(
  options: {
    visibleOnly?: boolean;
    category?: string;
    subCategory?: string;
    limit?: number;
    cursor?: string; // now supports cursor-based pagination
    minRating?: number;
    search?: string | null;
    verified?: boolean;
    sort?: "newest" | "price-asc" | "price-desc" | "rating-desc";
    priceMin?: number;
    priceMax?: number;
    ratings?: number[];
  } = {}
): Promise<IProduct[]> {
  await connectToDatabase();
  const Product = await getProductModel();

  const query: { [key: string]: any } = {};

  if (options.visibleOnly) query.isVisible = true;
  if (options.category) query.category = options.category;
  if (options.subCategory) {
    query.subCategory = {
      $elemMatch: { $regex: `^${options.subCategory}$`, $options: "i" },
    };
  }
  if (options.minRating !== undefined)
    query.rating = { $gte: options.minRating };
  if (options.verified === true) query.isVerifiedProduct = true;
  if (options.search) query.$text = { $search: options.search };
  if (options.priceMin !== undefined || options.priceMax !== undefined) {
    query.price = {};
    if (options.priceMin !== undefined)
      query.price.$gte = nairaToKobo(options.priceMin);
    if (options.priceMax !== undefined)
      query.price.$lte = nairaToKobo(options.priceMax);
  }
  if (options.ratings && options.ratings.length > 0) {
    query.rating = { $in: options.ratings.map((r) => Number(r)) };
  }

  // ---------------------------
  // Sorting logic + cursor filter
  // ---------------------------
  let sortField: string = "createdAt";
  let sortOrder: 1 | -1 = -1; // default newest (descending)

  switch (options.sort) {
    case "price-asc":
      sortField = "price";
      sortOrder = 1;
      break;
    case "price-desc":
      sortField = "price";
      sortOrder = -1;
      break;
    case "rating-desc":
      sortField = "rating";
      sortOrder = -1;
      break;
    default:
      sortField = "createdAt";
      sortOrder = -1;
      break;
  }

  // Apply cursor-based pagination
  if (options.cursor) {
    const cursorProduct = await Product.findById(options.cursor).lean();
    if (cursorProduct) {
      // Apply range filter depending on sort order
      if (sortOrder === -1) {
        query[sortField] = {
          ...(query[sortField] || {}),
          $lt: (cursorProduct as Record<string, any>)[sortField],
        };
      } else {
        query[sortField] = {
          ...(query[sortField] || {}),
          $gt: (cursorProduct as Record<string, any>)[sortField],
        };
      }
    }
  }

  // Build query
  const productQuery = Product.find<IProduct>(query)
    .sort({ [sortField]: sortOrder })
    .limit(options.limit ?? 20);

  return productQuery;
}

export async function getProductBySlug(slug: string): Promise<IProduct | null> {
  await connectToDatabase();
  const Product = await getProductModel();
  return Product.findOne({ slug }).lean();
}

export async function getProductById(id: string): Promise<IProduct | null> {
  await connectToDatabase();
  const Product = await getProductModel();
  return Product.findById(id);
}
