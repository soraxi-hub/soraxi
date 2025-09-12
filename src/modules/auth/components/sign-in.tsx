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
import { EyeIcon, EyeOffIcon, Loader, LockIcon, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
import axios from "axios";
import { motion, Variants, easeOut } from "framer-motion";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.4, // delay each line
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: easeOut, // ✅ easing fn instead of string
    },
  },
};

function SignInLeft() {
  return (
    <div className="hidden bg-cover md:block md:w-2/4 bg-[url(https://images.unsplash.com/photo-1616763355603-9755a640a287?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)]">
      <div className="flex flex-col items-center justify-center h-full px-8 bg-gray-900/70">
        {/* Small text shows FIRST */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mb-4 text-lg opacity-80 text-white"
        >
          Your favorite products, just a click away.
        </motion.p>

        {/* Tagline appears AFTER (with stagger) */}
        <motion.h1
          className={`text-4xl font-bold opacity-95 text-white text-center leading-snug space-y-2 ${playpenSans.className}`}
          variants={container}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.8 }} // ⏳ waits until <p> finishes
        >
          <motion.span variants={item} className="block">
            Find It...
          </motion.span>
          <motion.span variants={item} className="block">
            Love It...
          </motion.span>
          <motion.span variants={item} className="block">
            Own It...
          </motion.span>
        </motion.h1>
      </div>
    </div>
  );
}

function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/"; // Default to Home-page
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof userSignInInfoValidation>>({
    resolver: zodResolver(userSignInInfoValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof userSignInInfoValidation>) => {
    const userInput = {
      email: values.email,
      password: values.password,
    };

    try {
      if (values.email === "") {
        toast.error(`Please, input a valid Email.`);

        return;
      }

      setIsLoading(true);

      const response = await axios.post(`/api/auth/sign-in`, userInput);
      // console.log(`response`, response);

      if (response.data.success === true || response.status === 200) {
        toast.success(`You have Successfully signed In.`);
        router.push(redirect);
        router.refresh();
      } else {
        toast.error("Sign In Failed. Please try again.");
      }
    } catch (error) {
      toast.error("Sign In Failed. Please try again.");
      console.error("Sign In Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="flex justify-center h-screen">
        <SignInLeft />

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
                          <div className="relative">
                            <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-10 w-full bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
                              type="email"
                              placeholder="Email Address"
                              aria-label="Email Address"
                              autoComplete="email"
                              {...field}
                            />
                          </div>
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
                          <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="w-full pl-10 bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              aria-label="password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOffIcon className="w-4 h-4" />
                              ) : (
                                <EyeIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
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
                  Don&apos;t have an account?{" "}
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
