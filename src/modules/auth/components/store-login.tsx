"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeftIcon,
} from "lucide-react";
import { toast } from "sonner";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import AlertUI from "@/modules/shared/alert";
import Link from "next/link";

/**
 * Store Login Form Schema
 * Validates store email and password for authentication
 */
const storeLoginSchema = z.object({
  storeEmail: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Store email is required"),
  password: z.string().min(1, "Password is required"),
});

type StoreLoginFormData = z.infer<typeof storeLoginSchema>;

/**
 * Store Login Page Component
 * Allows store owners to log into their store dashboard
 * Separate from user authentication - this is for store-specific access
 */
export default function StoreLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get redirect URL from query params (for post-login navigation)
  const redirectTo = searchParams.get("redirect") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<StoreLoginFormData>({
    resolver: zodResolver(storeLoginSchema),
    mode: "onChange",
  });

  /**
   * Handle store login form submission
   * Authenticates store credentials and establishes store session
   */

  const onSubmit = async (data: StoreLoginFormData) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/store/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeEmail: data.storeEmail,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const { message, code, cause } = await parseErrorFromResponse(response);
        console.error("Login error:", { message, code, cause });
        setLoginError(message);
        toast.error(message);
        return;
      }

      const result = await response.json();

      // Success toast
      toast.success(`Welcome back to ${result.store.name}!`);

      if (
        result.store.status === "pending" &&
        !result.store.onboarding?.isComplete
      ) {
        const nextStep = determineOnboardingStep(result.store.onboarding);
        router.push(`/store/onboarding/${result.store.id}/${nextStep}`);
      } else {
        router.push(redirectTo);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setLoginError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Determine which onboarding step to redirect to based on completion status
   */
  const determineOnboardingStep = (onboarding: {
    profileComplete: boolean;
    businessInfoComplete: boolean;
    shippingComplete: boolean;
    payoutComplete: boolean;
    termsComplete: boolean;
  }): string => {
    if (!onboarding) return "profile";

    if (!onboarding.profileComplete) return "profile";
    if (!onboarding.businessInfoComplete) return "business-info";
    if (!onboarding.shippingComplete) return "shipping";
    if (!onboarding.payoutComplete) return "payout";
    if (!onboarding.termsComplete) return "terms";

    return "profile"; // fallback
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-soraxi-green rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Store Login</h1>
          <p className="text-muted-foreground">
            Sign in to access your store dashboard and manage your business
          </p>
        </div>

        {/* Login Error Alert */}
        {loginError && <AlertUI message={loginError} variant={"destructive"} />}

        {/* Store Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Store Access</CardTitle>
            <CardDescription>
              Enter your store credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Store Email */}
              <div className="space-y-2">
                <Label htmlFor="storeEmail" className="text-sm font-medium">
                  Store Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="storeEmail"
                    type="email"
                    {...register("storeEmail")}
                    placeholder="Enter your store email"
                    className={`pl-10 focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent ${
                      errors.storeEmail ? "border-destructive" : ""
                    }`}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {errors.storeEmail && (
                  <p className="text-sm text-destructive">
                    {errors.storeEmail.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent ${
                      errors.password ? "border-destructive" : ""
                    }`}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-soraxi-green hover:text-soraxi-green/80 p-0 h-auto"
                  onClick={() => router.push("/forgot-password?ref=store")}
                >
                  Forgot your password?
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="w-full bg-soraxi-green hover:bg-soraxi-green/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In to Store"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Store Link */}
        {/* <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have a store yet?
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/store/create")}
            className="w-full"
          >
            Create Your Store
          </Button>
        </div> */}

        {/* Back to Main Site */}
        <div className="text-center">
          <Link href={`/`}>
            <Button
              variant="ghost"
              className="group text-muted-foreground hover:text-foreground"
              size={"lg"}
            >
              <ArrowLeftIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
              Back to Main Site
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
