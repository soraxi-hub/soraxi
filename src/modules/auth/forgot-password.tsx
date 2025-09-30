"use client";

import { Button } from "@/components/ui/button";
import axios from "axios";
import { useState } from "react";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";

const ForgotPassword = () => {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") as "user" | "store" | null;
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const response = await axios.post(
        `/api/auth/forgot-password`,
        JSON.stringify({ email, ref })
      );
      // console.log(`response`, response);

      if (response.data.success === true || response.status === 200) {
        toast.success(
          `A reset link has been sent to your email. Please check your inbox and follow the instructions.`
        );
        setIsLoading(false);
        setMessage(true);
      } else {
        toast.error(
          `There was an error sending the reset link. Please try again.`
        );
        setIsLoading(false);
      }
    } catch (error) {
      toast.error(
        `An error occurred while sending the reset link. Please try again.`
      );
      console.error(`Error sending reset link:`, error);
      setIsLoading(false);
    }
  };

  if (ref === "user") {
    return (
      <main className="bg-white dark:bg-[#1D1D1D] text-gray-900 dark:text-gray-100 min-h-screen flex flex-row justify-center items-center">
        <section className="max-w-3xl mx-auto my-5 px-6">
          {!message ? (
            <div className="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
              <div className="px-6 py-4">
                <div className="flex justify-center mx-auto">
                  <Link
                    href="/"
                    className={`flex justify-center mb-6 text-2xl font-bold text-soraxi-green ${playpenSans.className}`}
                  >
                    {siteConfig.name}
                  </Link>
                </div>

                <h3 className="mt-3 text-xl font-medium text-center text-gray-600 dark:text-gray-200">
                  Reset My Password
                </h3>

                <p className="mt-3 text-center text-gray-500 dark:text-gray-400">
                  Provide the E-mail you used to create an account with{" "}
                  {siteConfig.name}.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8 ">
                  <input
                    className="block w-full px-4 py-2 mt-2 text-black dark:text-white placeholder-gray-500 bg-white dark:bg-[#2d2d2d] border rounded-lg border-gray-300 dark:border-gray-600 focus:ring-soraxi-green focus:border-sorbg-soraxi-green"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full bg-soraxi-green text-white hover:bg-soraxi-green-hover focus:ring-2 focus:ring-offset-2 focus:ring-soraxi-green"
                  >
                    {!isLoading && "Send Reset Link"}
                    {isLoading && (
                      <>
                        <Loader className="animate-spin w-5 h-5 mr-4 text-white" />
                        Please wait...
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center flex-col">
              <div className="border rounded-md py-4 px-6">
                <p>A Link has been sent to the E-mail provided.</p>

                <p className="pt-2">
                  Please ensure to check your E-mail and follow the instructions
                  carefully.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (ref === "store") {
    return (
      <main className="bg-white dark:bg-[#1D1D1D] text-gray-900 dark:text-gray-100 min-h-screen flex flex-row justify-center items-center">
        <section className="max-w-3xl mx-auto my-5 px-6">
          {!message ? (
            <div className="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
              <div className="px-6 py-4">
                <div className="flex justify-center mx-auto">
                  <Link
                    href="/"
                    className={`flex justify-center mb-6 text-2xl font-bold text-soraxi-green ${playpenSans.className}`}
                  >
                    {siteConfig.name}
                  </Link>
                </div>

                <h3 className="mt-3 text-xl font-medium text-center text-gray-600 dark:text-gray-200">
                  Reset My Password
                </h3>

                <p className="mt-3 text-center text-gray-500 dark:text-gray-400">
                  Provide the E-mail you used to create a store with{" "}
                  {siteConfig.name}.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8 ">
                  <input
                    className="block w-full px-4 py-2 mt-2 text-black dark:text-white placeholder-gray-500 bg-white dark:bg-[#2d2d2d] border rounded-lg border-gray-300 dark:border-gray-600 focus:ring-soraxi-green focus:border-sorbg-soraxi-green"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full bg-soraxi-green text-white hover:bg-soraxi-green-hover focus:ring-2 focus:ring-offset-2 focus:ring-soraxi-green"
                  >
                    {!isLoading && "Send Reset Link"}
                    {isLoading && (
                      <>
                        <Loader className="animate-spin w-5 h-5 mr-4 text-white" />
                        Please wait...
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center flex-col">
              <div className="border rounded-md py-4 px-6">
                <p>A Link has been sent to the E-mail provided.</p>

                <p className="pt-2">
                  Please ensure to check your E-mail and follow the instructions
                  carefully.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }
};

export default ForgotPassword;
