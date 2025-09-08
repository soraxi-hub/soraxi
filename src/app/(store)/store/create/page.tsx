"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import AlertUI from "@/modules/shared/alert";

/**
 * Store Creation Form Schema
 * Validates store name, email, and password for new store creation
 */
const createStoreSchema = z
  .object({
    storeName: z
      .string()
      .min(2, "Store name must be at least 2 characters")
      .max(50, "Store name must be less than 50 characters")
      .regex(
        /^[a-zA-Z0-9\s\-_]+$/,
        "Store name can only contain letters, numbers, spaces, hyphens, and underscores"
      ),
    storeEmail: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Store email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreateStoreFormData = z.infer<typeof createStoreSchema>;

/**
 * Store Creation Page Component
 * Allows authenticated users to create a new store
 * Redirects to onboarding after successful creation
 */
export default function CreateStorePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
    mode: "onChange",
  });

  /**
   * Handle store creation form submission
   * Creates new store with pending status and redirects to onboarding
   */
  const onSubmit = async (data: CreateStoreFormData) => {
    const user = await getUserFromCookie();
    if (!user) {
      toast.error(`Please sign in to create a store.`);
      router.push("/sign-in");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/store/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: data.storeName,
          storeEmail: data.storeEmail,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.error === "Store email already exists") {
          setError("storeEmail", {
            type: "manual",
            message: "This email is already registered to another store",
          });
          return;
        }

        if (result.error === "Store name already exists") {
          setError("storeName", {
            type: "manual",
            message: "This store name is already taken",
          });
          return;
        }

        const {
          error: { message },
        } = result;
        setResError(message);

        throw new Error(result.error || "Failed to create store");
      }

      // Success - show toast and redirect to onboarding
      toast.success(`Let's set up your store profile to get started.`);

      // Redirect to onboarding with the new store ID
      router.push(`/store/onboarding/${result.store.id}/profile`);
    } catch (error) {
      console.error("Store creation error:", error);
      toast.error(`Failed to create store. Please try again.`);
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-foreground">
            Create Your Store
          </h1>
          <p className="text-muted-foreground">
            Start selling on our platform by creating your store account
          </p>
        </div>

        {resError && <AlertUI message={resError} variant={"destructive"} />}

        {/* Store Creation Form */}
        <Card className="dark:bg-muted/50">
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Enter your store details to get started. You&apos;ll complete the
              setup process after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-sm font-medium">
                  Store Name *
                </Label>
                <Input
                  id="storeName"
                  {...register("storeName")}
                  placeholder="Enter your store name"
                  className={errors.storeName ? "border-destructive" : ""}
                  disabled={isLoading}
                />
                {errors.storeName && (
                  <p className="text-sm text-destructive">
                    {errors.storeName.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be your store&apos;s public display name
                </p>
              </div>

              {/* Store Email */}
              <div className="space-y-2">
                <Label htmlFor="storeEmail" className="text-sm font-medium">
                  Store Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="storeEmail"
                    type="email"
                    {...register("storeEmail")}
                    placeholder="store@example.com"
                    className={`pl-10 ${
                      errors.storeEmail ? "border-destructive" : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.storeEmail && (
                  <p className="text-sm text-destructive">
                    {errors.storeEmail.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This email will be used for store communications and login
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Create a strong password"
                    className={`pl-10 pr-10 ${
                      errors.password ? "border-destructive" : ""
                    }`}
                    disabled={isLoading}
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder="Confirm your password"
                    className={`pl-10 pr-10 ${
                      errors.confirmPassword ? "border-destructive" : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
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
                    Creating Store...
                  </>
                ) : (
                  "Create Store"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Alert className="dark:bg-muted/50">
          <AlertDescription>
            After creating your store, you&apos;ll be guided through a setup
            process to configure your store profile, business information, and
            shipping methods.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
