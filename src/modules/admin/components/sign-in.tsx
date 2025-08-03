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
import { adminSignInInfoValidation } from "@/validators/admin-sigin-in-validation";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { useState } from "react";
import { EyeIcon, EyeOffIcon, Loader, LockIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";

function AdminSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("redirect") || "/admin/dashboard";

  const form = useForm<z.infer<typeof adminSignInInfoValidation>>({
    resolver: zodResolver(adminSignInInfoValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (
    values: z.infer<typeof adminSignInInfoValidation>
  ) => {
    setIsLoading(true);

    const userInput = {
      email: values.email,
      password: values.password,
    };

    try {
      const response = await axios.post(`/api/auth/admin-sign-in`, userInput);

      if (response.data.success === true || response.status === 200) {
        toast.success("You have Successfully signed In.");
        router.push(callbackUrl);
      } else {
        toast.error("There was an error signing you in. Please try again.");
      }
    } catch (error) {
      toast.error("Access Denied");
      console.error("Admin Sign In Error:", error);
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
                Admin Access
              </h3>

              <p className="mt-1 text-center text-gray-500 dark:text-gray-400">
                Sign in to manage the platform
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
                            <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="w-full pl-10 bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
                              type="email"
                              placeholder="Admin Email"
                              aria-label="Admin Email"
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
                              placeholder="Admin Password"
                              aria-label="Admin Password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

                  <div className="flex items-center justify-end mt-4">
                    <Button
                      className="px-6 py-2 text-sm font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-soraxi-darkmode-success rounded-lg hover:bg-soraxi-darkmode-success/85"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <p className="flex flex-row items-center gap-4">
                          <Loader
                            className="animate-spin"
                            width={25}
                            height={25}
                          />
                          Loading...
                        </p>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminSignIn;
