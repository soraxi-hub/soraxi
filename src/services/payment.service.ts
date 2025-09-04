export interface SizeOption {
  size: string;
  price: number;
  quantity: number;
  _id?: string;
}

export interface Product {
  _id: string; // Product ID
  storeID: string; // Store ID (again for nested product)
  productType: "Product"; // Type of product (e.g., "Product")
  name: string; // Product name
  price?: string; // Product price in kobo (as string)
  images: string[]; // Array of product image URLs
  category: string[]; // Array of product categories
  sizes?: SizeOption[];
}

interface SelectedSize {
  size: string;
  price: string;
  quantity: string;
}

export interface CartItem {
  product: Product;
  storeID: string; // Store ID (again for nested product)
  quantity: string; // Quantity ordered (as string)
  productType: "Product"; // Type of product (e.g., "Product")
  selectedSize?: SelectedSize;
}

interface ShippingMethod {
  name: string;
  price: string;
  estimatedDeliveryDays: string;
  isActive: string;
  description: string;
}

interface StoreCart {
  storeID: string; // Store ID associated with the items
  storeName: string; // Name of the store
  products: CartItem[];
  // shippingMethods: ShippingMethod[];
  selectedShippingMethod: ShippingMethod;
}

export type ItemsInCart = StoreCart[];

type TransactionVerificationResult = {
  status: string; // Transaction status ("success", "failed", etc.)
  eventStatus: boolean; // Indicates whether the verification request was successful
  channel: string; // Payment channel used (e.g., "card", "bank", etc.)
  amount: number; // Amount paid (in kobo)
  metadata: {
    userID: string; // Your internal user ID
    name: string; // Customer's full name
    city: string; // City for shipping or billing
    state: string; // State for shipping or billing
    address: string; // Customer's address
    postal_code: string; // Postal/ZIP code
    phone_number: string; // Customer's phone number
    referrer: string; // The referring URL for the transaction
    itemsInCart: ItemsInCart; // Array of items purchased (can be typed specifically)
  };
  customer: {
    //Paystack related information
    id: number; // Customer's unique ID on Paystack
    first_name: string; // Customer's first name
    last_name: string; // Customer's last name
    email: string; // Customer's email
    customer_code: string; // Unique code for this customer on Paystack
    phone: string; // Customer's phone number
  };
};

/**
 * Verifies a Paystack transaction by its reference
 * @param transactionReference The transaction reference to verify
 * @returns The transaction data if verification is successful, null otherwise
 */
export async function verifyPaystackTransaction(
  transactionReference: string
): Promise<TransactionVerificationResult | null> {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${transactionReference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to verify transaction:", await response.text());
      return null;
    }

    const result = await response.json();

    // console.log("result", result);

    if (result.status !== true) {
      console.error("Transaction verification failed:", result);
      return null;
    }

    // console.log("Transaction verified successfully:", result);

    return {
      status: result.data.status,
      eventStatus: result.status,
      channel: result.data.channel,
      amount: result.data.amount,
      metadata: result.data.metadata,
      customer: result.data.customer,
    };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return null;
  }
}
