import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import slugify from "slugify";
import currency from "currency.js";

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
      set: (price: number) => Math.round(currency(price).multiply(100).value),
      get: (price: number) => currency(price / 100).value,
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

// ProductSchema.virtual("formattedPrice").get(function (this: IProduct) {
//   return currency(this.price ?? 0 / 100, {
//     symbol: "₦",
//     precision: 2,
//   }).format();
// });

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
    limit?: number;
    skip?: number;
    minRating?: number;
    search?: string;
    verified?: boolean;
  } = {}
): Promise<IProduct[]> {
  await connectToDatabase();
  const Product = await getProductModel();

  const query: { [key: string]: any } = {};

  if (options.visibleOnly) query.isVisible = true;
  if (options.category) query.category = options.category;
  if (options.minRating !== undefined)
    query.rating = { $gte: options.minRating };
  if (options.verified === true) query.isVerifiedProduct = true;

  // Case-insensitive search across name, category array, or subCategory
  if (options.search) {
    const searchRegex = new RegExp(options.search, "i");
    query.$or = [
      { name: searchRegex },
      { category: { $elemMatch: searchRegex } },
      { subCategory: searchRegex },
    ];
  }

  let productQuery = Product.find<IProduct>(query).sort({ createdAt: -1 });

  if (options.skip !== undefined)
    productQuery = productQuery.skip(options.skip);
  if (options.limit !== undefined)
    productQuery = productQuery.limit(options.limit);

  return productQuery;
}

export async function getProductBySlug(slug: string): Promise<IProduct | null> {
  await connectToDatabase();
  const Product = await getProductModel();
  return Product.findOne({ slug }).lean();
}
