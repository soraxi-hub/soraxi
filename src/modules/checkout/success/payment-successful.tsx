import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import { CartHydration } from "@/modules/cart/cart-hydration-provider";

interface Props {
  searchParams: {
    status?: string;
    trxref?: string; // PayStack gateways use trxref
    tx_ref?: string; // Flutterwave gateways use trx_ref
    transaction_id?: string; // Flutterwave gateways use transaction_id
    [key: string]: string | undefined;
  };
}

export default function PaymentSuccess({ searchParams }: Props) {
  const status = searchParams.status;
  const transaction_reference =
    searchParams.trxref || searchParams.tx_ref || searchParams.transaction_id;

  if (!status) {
    return (
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-yellow-500 dark:text-yellow-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-yellow-500 dark:text-yellow-400 sm:text-5xl">
            Payment Status Unknown
          </h1>
          <h3 className="mt-8 text-2xl leading-7">
            We couldn’t verify your payment status.
          </h3>
          <p className="mt-8">
            Please check your email for an invoice, or visit{" "}
            <Link
              href="/orders"
              className="text-yellow-500 font-bold hover:underline"
            >
              My Orders
            </Link>{" "}
            to confirm.
          </p>

          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild variant={`link`}>
              <Link href="/cart" className="text-sm font-semibold group">
                <ArrowLeftIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                Back to cart{" "}
              </Link>
            </Button>

            <Button size="lg" asChild variant={`link`}>
              <Link href="/support" className="text-sm font-semibold group">
                Contact support{" "}
                <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (status.toLowerCase() === "cancelled") {
    return (
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500 dark:text-red-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-red-500 dark:text-red-400 sm:text-5xl">
            Payment cancelled!!
          </h1>
          <h3 className="mt-8 text-2xl leading-7">
            Sorry, Your payment was not successful!
          </h3>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Your transaction reference:{" "}
            <span className="font-semibold">
              {transaction_reference || "N/A"}
            </span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild variant={`link`}>
              <Link href="/cart" className="text-sm font-semibold group">
                <ArrowLeftIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                Back to cart{" "}
              </Link>
            </Button>
            <Button size="lg" asChild variant={`link`}>
              <Link href="/orders" className="text-sm font-semibold group">
                My Orders{" "}
                <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (status.toLowerCase() === "failed") {
    return (
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500 dark:text-red-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-red-500 dark:text-red-400 sm:text-5xl">
            Oops, Something went wrong!!!
          </h1>
          <h3 className="mt-8 text-2xl leading-7">
            Sorry, payment was not successful!
          </h3>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Your transaction reference:{" "}
            <span className="font-semibold">
              {transaction_reference || "N/A"}
            </span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild variant={`link`}>
              <Link href="/cart" className="text-sm font-semibold group">
                <ArrowLeftIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                Back to cart{" "}
              </Link>
            </Button>

            <Button size="lg" asChild variant={`link`}>
              <Link href="/support" className="text-sm font-semibold group">
                Contact support{" "}
                <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <FeedbackWrapper page={`payment-success`} delay={3000}>
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <CheckCheck className="mx-auto h-10 w-10 text-soraxi-green" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-soraxi-green sm:text-5xl">
            Order Successful!
          </h1>
          <h3 className="mt-8 text-2xl leading-7">Thank you</h3>
          <p className="mt-8">
            Check your purchase email{" "}
            <span className="mx-1 font-extrabold text-soraxi-green">
              for your invoice.
            </span>
          </p>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            Your transaction reference:{" "}
            <span className="font-semibold">
              {transaction_reference || "N/A"}
            </span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild variant={`link`}>
              <Link href="/" className="text-sm font-semibold group">
                <ArrowLeftIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                Go back home{" "}
              </Link>
            </Button>

            <Button size="lg" asChild variant={`link`}>
              <Link href="/orders" className="text-sm font-semibold group">
                My Orders{" "}
                <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
            <CartHydration />
          </div>
        </div>
      </main>
    </FeedbackWrapper>
  );
}
