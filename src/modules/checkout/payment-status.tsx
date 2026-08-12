import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCheck,
  Clock,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartHydration } from "@/modules/cart/cart-hydration-provider";

/**
 * Shown while the payment is confirming — the first few seconds after the
 * customer returns from the gateway, before the webhook lands.
 *
 * Deliberately does NOT tell the customer to keep the page open: the webhook
 * and the cron backstop settle the order regardless of what this tab does.
 */
export function ConfirmingStatus({
  transaction_reference,
}: {
  transaction_reference?: string;
}) {
  return (
    <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-soraxi-green" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-soraxi-green sm:text-5xl">
          Confirming your payment…
        </h1>
        <h3 className="mt-8 text-2xl leading-7">
          This usually takes a moment.
        </h3>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Your transaction reference:{" "}
          <span className="font-semibold">
            {transaction_reference || "N/A"}
          </span>
        </p>
      </div>
    </main>
  );
}

/**
 * Shown once confirmation has taken unusually long. Switches from "please
 * wait" to an honest hand-off: the customer can leave, and we follow up.
 */
export function SlowConfirmationStatus({
  transaction_reference,
}: {
  transaction_reference?: string;
}) {
  return (
    <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
      <div className="text-center">
        <Clock className="mx-auto h-10 w-10 text-yellow-500 dark:text-yellow-400" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-yellow-500 dark:text-yellow-400 sm:text-5xl">
          This is taking longer than usual
        </h1>
        <h3 className="mt-8 text-2xl leading-7">
          Your payment is still being confirmed.
        </h3>

        <p className="mt-6 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          You don&apos;t need to wait here — we&apos;ll email you as soon as
          it&apos;s confirmed, and your order will appear under My Orders. If
          you were charged, your money is safe.
        </p>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Your transaction reference:{" "}
          <span className="font-semibold">
            {transaction_reference || "N/A"}
          </span>
        </p>

        <div className="mt-6 flex items-center justify-center gap-x-6">
          <Button
            size="lg"
            asChild
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            <Link href="/orders" className="text-sm font-semibold">
              Go to My Orders
            </Link>
          </Button>

          <Button size="lg" asChild variant="link">
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

/**
 * Shown when this page can't identify the payment at all — an incomplete
 * link, a reference belonging to another account, or a signed-out visitor.
 */
export function UnknownStatus() {
  return (
    <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
      <div className="text-center">
        <HelpCircle className="mx-auto h-10 w-10 text-yellow-500 dark:text-yellow-400" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-yellow-500 dark:text-yellow-400 sm:text-5xl">
          We couldn&apos;t find that payment
        </h1>
        <h3 className="mt-8 text-2xl leading-7">
          This page didn&apos;t receive enough details to look it up.
        </h3>
        <p className="mx-auto mt-8 max-w-xl text-gray-600 dark:text-gray-400">
          It usually means the link was incomplete, or you&apos;re signed in
          with a different account.{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            If you were charged, your money is safe.
          </span>{" "}
          Your order will appear under My Orders as soon as it&apos;s confirmed,
          and we&apos;ll email you a receipt.
        </p>

        <div className="mt-6 flex items-center justify-center gap-x-6">
          <Button
            size="lg"
            asChild
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            <Link href="/orders" className="text-sm font-semibold">
              Go to My Orders
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

export function CancelledStatus({
  transaction_reference,
}: {
  transaction_reference?: string;
}) {
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

export function FailedStatus({
  transaction_reference,
}: {
  transaction_reference?: string;
}) {
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

export function SuccessStatus({
  transaction_reference,
}: {
  transaction_reference?: string;
}) {
  return (
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
  );
}
