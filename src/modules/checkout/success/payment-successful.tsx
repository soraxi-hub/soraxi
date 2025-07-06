import Link from "next/link";
import { CheckCheck, XCircle } from "lucide-react";

interface Props {
  searchParams: {
    status?: string;
    trxref?: string;
  };
}

export default function PaymentSuccess({ searchParams }: Props) {
  const status = searchParams.status;
  const transaction_reference = searchParams.trxref;

  if (status === "cancelled") {
    return (
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500 dark:text-red-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-red-500 dark:text-red-400 sm:text-5xl">
            Payment cancelled!!
          </h1>
          <h3 className="mt-8 text-2xl leading-7">
            Sorry, payment was not successful!
          </h3>
          <p className="mt-8">
            Your transaction reference{" "}
            <span className="mx-1 font-extrabold text-indigo-500">
              {transaction_reference}
            </span>
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/cart"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Back to cart
            </Link>
            <a href="#" className="text-sm font-semibold">
              Contact support <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (status === "failed") {
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
          <p className="mt-8">
            Your transaction reference{" "}
            <span className="mx-1 font-extrabold text-indigo-500">
              {transaction_reference}
            </span>
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/cart"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Back to cart
            </Link>
            <a href="#" className="text-sm font-semibold">
              Contact support <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </main>
    );
  }

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
        <p className="mt-8">
          Your transaction reference{" "}
          <span className="mx-1 font-extrabold text-indigo-500">
            {transaction_reference}
          </span>
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="rounded-md bg-soraxi-green px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-soraxi-green/85 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Go back home
          </Link>
          <a href="#" className="text-sm font-semibold">
            Contact support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
