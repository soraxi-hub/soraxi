import { ICart } from "@/lib/db/models/cart.model";
import { Cart, BaseCartProps } from "./cart";
import { IProduct } from "@/lib/db/models/product.model";
import { PopulatedCart } from "./decorators/populated-cart.decorator.ts";

export class CartFactory {
  static createCart(props: BaseCartProps): Cart {
    return new Cart(props);
  }

  static buildPopulatedCart(
    rawCart: ICart,
    products: IProduct[],
  ): PopulatedCart {
    return new PopulatedCart(
      {
        ...rawCart,
        _id: rawCart._id?.toString(),
        userId: rawCart.userId.toString(),
      },
      products,
    );
  }
}
