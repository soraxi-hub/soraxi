import { siteConfig } from "@/config/site";
import { IProduct } from "@/lib/db/models/product.model";
import { Wishlist } from "../wishlist";
import {
  IPopulatedWishlistInfo,
  IPopulatedWishlistItemInfo,
  IWishlistInfo,
} from "../wishlist.interface";
import { ProductFactory } from "@/domain/products/product-factory";
import { ProductStatusEnum, ProductTypeEnum } from "@/enums";

export class PopulatedWishlist
  extends Wishlist
  implements IPopulatedWishlistInfo
{
  private productMap: Map<string, IProduct>;

  constructor(data: IWishlistInfo, products: IProduct[]) {
    super(data);
    this.productMap = new Map(products.map((p) => [p._id!.toString(), p]));
  }

  get userId() {
    return super.userId.toString();
  }

  // Override items to return enriched items
  get products(): IPopulatedWishlistItemInfo[] {
    const wishlistItems = super.products
      .map((pro) => {
        const product = this.productMap.get(pro.productId.toString());

        if (!product || !product._id || typeof product.price !== "number") {
          console.warn(
            `Product not found or invalid data for wishlist item: ${pro.productId}`,
          );
          return null;
        }

        const item = {
          _id: product._id.toString(),
          name: product.name,
          images: product.images ?? [siteConfig.placeHolderImg],
          price: product.price,
          slug: product.slug,
          rating: product.rating ?? 0,
          category: product.category ?? [],
          productType: ProductTypeEnum.Product,
        };

        const productData = ProductFactory.create({
          ...item,
          isVerifiedProduct: true,
          status: ProductStatusEnum.Approved,
          isVisible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: "",
        }).toJSON();

        return {
          productType: item.productType,
          productId: item._id,
          productData,
        };
      })
      .filter((item) => item !== null);

    return wishlistItems;
  }
}
