"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { userSignInInfoValidation } from "@/validators/user-signIn-info-validation";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Loader } from "lucide-react";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
import { signIn } from "next-auth/react";

function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/"; // Default to Home-page

  const form = useForm<z.infer<typeof userSignInInfoValidation>>({
    resolver: zodResolver(userSignInInfoValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof userSignInInfoValidation>) => {
    try {
      if (values.email === "") {
        toast.error(`Please, input a valid Email.`);

        return;
      }

      setIsLoading(true);

      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      if (result?.status !== 200) {
        toast.error("Sign In Failed. Please try again.");
        return;
      }
      toast.success(`You have Successfully signed In.`);
      router.push(callbackUrl);
    } catch (error) {
      toast.error(`There was an error signing you in. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="flex justify-center h-screen">
        <div className="hidden bg-cover md:block md:w-2/4 bg-[url(https://images.unsplash.com/photo-1616763355603-9755a640a287?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)]">
          <div className="flex items-center h-full px-20 bg-gray-900/70"></div>
        </div>

        <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-2/6">
          <div className="flex-1">
            <div className="text-center">
              <div className="flex justify-center mx-auto">
                <Link
                  href="/"
                  className={`flex justify-center mb-6 text-2xl font-bold text-soraxi-darkmode-success ${playpenSans.className}`}
                >
                  {siteConfig.name}
                </Link>
              </div>

              <h3 className="mt-3 text-xl font-medium text-center text-gray-600 dark:text-gray-200">
                Welcome Back
              </h3>

              <p className="mt-1 text-center text-gray-500 dark:text-gray-400">
                Sign in to access your account
              </p>
            </div>

            <div className="mt-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            className="block w-full px-4 py-2 mt-2 bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
                            type="email"
                            placeholder="Email Address"
                            aria-label="Email Address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            className="block w-full px-4 py-2 mt-2 bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
                            type="password"
                            placeholder="Enter your password"
                            aria-label="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <Link
                      href="/forgot-password?ref=user"
                      className="text-sm hover:text-soraxi-darkmode-success hover:underline"
                    >
                      Forgot Password?
                    </Link>

                    <Button
                      className="px-6 py-2 text-sm font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-soraxi-darkmode-success rounded-lg hover:bg-soraxi-darkmode-success/85"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <p className="flex flex-row items-center gap-4">
                          <Loader
                            className=" animate-spin"
                            width={25}
                            height={25}
                          />{" "}
                          Loading...
                        </p>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="flex items-center justify-center py-4 text-center pt-6">
                <span className="text-sm text-gray-600 dark:text-gray-200">
                  Don't have an account?{" "}
                </span>

                <Link
                  href="/sign-up"
                  className="mx-2 text-sm font-bold text-soraxi-darkmode-success hover:underline"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default SignIn;
