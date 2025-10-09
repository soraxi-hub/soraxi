import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import slugify from "slugify";
import { koboToNaira, nairaToKobo } from "@/lib/utils/naira";
import {
  ProductStatusEnum,
  ProductTypeEnum,
} from "@/validators/product-validators";

/**
 * Interface for Product document
 */
export interface IProduct extends Document {
  storeId: mongoose.Types.ObjectId;
  productType: ProductTypeEnum;
  name: string;
  price?: number;
  sizes?: {
    size: string;
    price: number;
    quantity: number;
  }[];
  productQuantity?: number;
  images?: string[];
  description?: string;
  specifications?: string;
  category?: string[];
  subCategory?: string[];
  isVerifiedProduct: boolean;
  status: ProductStatusEnum;
  isVisible: boolean;
  slug: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;

  firstApprovedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: [true, "Store ID is required"],
    },
    productType: {
      type: String,
      enum: Object.values(ProductTypeEnum),
      default: ProductTypeEnum.Product,
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
        return (
          this.status !== ProductStatusEnum.Draft &&
          (!this.sizes || this.sizes.length === 0)
        );
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
      required: function () {
        return this.status !== ProductStatusEnum.Draft;
      },
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: function () {
        return this.status !== ProductStatusEnum.Draft;
      },
    },
    specifications: {
      type: String,
      required: function () {
        return this.status !== ProductStatusEnum.Draft;
      },
    },
    category: {
      type: [String],
      required: function () {
        return this.status !== ProductStatusEnum.Draft;
      },
      index: true,
    },
    subCategory: {
      type: [String],
      required: function () {
        return this.status !== ProductStatusEnum.Draft;
      },
      index: true,
    },
    isVerifiedProduct: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(ProductStatusEnum),
      default: ProductStatusEnum.Draft,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: false, // default to false untill the admin approves it
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
    firstApprovedAt: {
      type: Date,
      immutable: true,
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

ProductSchema.index({ isVisible: 1 });

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

export async function getProducts(
  options: {
    visibleOnly?: boolean;
    category?: string;
    subCategory?: string;
    limit?: number;
    skip?: number;
    minRating?: number;
    search?: string | null;
    verified?: boolean;
    sort?: "newest" | "price-asc" | "price-desc" | "rating-desc";
    priceMin?: number;
    priceMax?: number;
    ratings?: number[];
    cursor?: string;
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

  // Build sort logic
  let sortQuery: { [key: string]: 1 | -1 } = { createdAt: -1 }; // default sort: newest
  switch (options.sort) {
    case "price-asc":
      sortQuery = { price: 1 };
      break;
    case "price-desc":
      sortQuery = { price: -1 };
      break;
    case "rating-desc":
      sortQuery = { rating: -1 };
      break;
    // You can add more sort cases if needed
  }

  let productQuery = Product.find<IProduct>(query).sort(sortQuery);

  if (options.skip !== undefined)
    productQuery = productQuery.skip(options.skip);
  if (options.limit !== undefined)
    productQuery = productQuery.limit(options.limit);

  return productQuery;
}

export async function getProductBySlug(slug: string): Promise<IProduct | null> {
  await connectToDatabase();
  const Product = await getProductModel();
  return Product.findOne({ slug }).lean<IProduct>();
}

export async function getProductById(id: string): Promise<IProduct | null> {
  await connectToDatabase();
  const Product = await getProductModel();
  return Product.findById(id);
}
